import { DynamoDBClient, QueryCommand, ScanCommand, PutItemCommand, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { DebtCalculator } from './DebtCalculator';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    credentials: process.env.DYNAMODB_ENDPOINT ? {
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
    } : undefined
});
const TABLE_NAME = process.env.READ_MODELS_TABLE || 'finance-agent-read-models';

export interface GroupDetails {
    groupId: string;
    name: string;
    createdAt: number;
    members: any[];
    expenses: any[];

    balances: any[];
    debts?: any[];
    settlements?: any[];
}

export class QueryService {
    static async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `GROUP#${groupId}` }
            }
        };

        try {
            const { Items } = await client.send(new QueryCommand(params));
            if (!Items || Items.length === 0) return null;

            const group: GroupDetails = {
                groupId,
                name: '',
                createdAt: 0,
                members: [],
                expenses: [],
                balances: [],
                settlements: []
            };

            for (const item of Items) {
                const doc = unmarshall(item);
                const sk = doc.sk;

                if (sk === 'METADATA') {
                    group.name = doc.name;
                    group.createdAt = doc.createdAt;
                } else if (sk.startsWith('MEMBER#')) {
                    group.members.push({
                        userId: sk.split('#')[1],
                        name: doc.name,
                        telegramId: doc.telegramId
                    });
                } else if (sk.startsWith('EXPENSE#')) {
                    group.expenses.push({
                        expenseId: sk.split('#')[1],
                        amount: doc.amount,
                        description: doc.description,
                        payerId: doc.payerId,
                        timestamp: doc.timestamp
                    });
                } else if (sk.startsWith('BALANCE#')) {
                    group.balances.push({
                        userId: sk.split('#')[1],
                        paidAmount: doc.paidAmount
                    });
                } else if (sk.startsWith('SETTLEMENT#')) {
                    group.settlements?.push({
                        settlementId: sk.split('#')[1], // timestamp
                        transfers: doc.transfers,
                        timestamp: doc.timestamp
                    });
                }
            }



            // Calculate Debts
            const totalSpent = group.balances.reduce((sum, b) => sum + b.paidAmount, 0);
            const memberCount = group.members.length;

            if (memberCount > 0) {
                const fairShare = totalSpent / memberCount;
                const netBalances: Record<string, number> = {};

                group.members.forEach(member => {
                    const paid = group.balances.find(b => b.userId === member.userId)?.paidAmount || 0;
                    netBalances[member.userId] = paid - fairShare;
                });

                group.debts = DebtCalculator.simplifyDebts(netBalances);
            }

            return group;

        } catch (error) {
            console.error('QueryService Error:', error);
            throw error;
        }
    }

    static async listGroups() {
        // In a real app with many groups, you would use a GSI or a separate table for indexing.
        // For this MVP, we Scan and filter.
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'sk = :metadata',
            ExpressionAttributeValues: {
                ':metadata': { S: 'METADATA' }
            }
        };

        try {
            const { Items } = await client.send(new ScanCommand(params));
            if (!Items) return [];

            return Items.map(item => {
                const doc = unmarshall(item);
                return {
                    groupId: doc.pk.split('#')[1],
                    name: doc.name,
                    createdAt: doc.createdAt,
                    createdBy: doc.createdBy
                };
            });
        } catch (error) {
            console.error('QueryService listGroups Error:', error);
            throw error;
        }
    }

    static async getGroupMembers(groupId: string) {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk and begins_with(sk, :memberPrefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `GROUP#${groupId}` },
                ':memberPrefix': { S: 'MEMBER#' }
            }
        };

        try {
            const { Items } = await client.send(new QueryCommand(params));
            if (!Items) return [];

            return Items.map(item => {
                const doc = unmarshall(item);
                return {
                    userId: doc.sk.split('#')[1],
                    name: doc.name,
                    telegramId: doc.telegramId
                };
            });
        } catch (error) {
            console.error('QueryService getGroupMembers Error:', error);
            throw error;
        }
    }

    static async getUserByUsername(username: string) {
        // Use Scan for now, in production use a GSI on name
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'sk = :metadata AND begins_with(pk, :userPrefix)',
            ExpressionAttributeValues: {
                ':metadata': { S: 'METADATA' },
                ':userPrefix': { S: 'USER#' }
            }
        };

        try {
            const { Items } = await client.send(new ScanCommand(params));
            if (!Items) return null;

            const users = Items.map(i => unmarshall(i));
            const userDoc = users.find(u => u.name.toLowerCase() === username.toLowerCase());

            if (!userDoc) return null;

            return {
                userId: userDoc.pk.split('#')[1],
                name: userDoc.name,
                telegramId: userDoc.telegramId,
                totalSpent: Number(userDoc.totalSpent || 0),
                passwordHash: userDoc.passwordHash
            };
        } catch (error) {
            console.error('QueryService getUserByUsername Error:', error);
            throw error;
        }
    }

    static async getPersonalExpenses(userId: string) {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: `USER#${userId}` }
            }
        };

        try {
            const { Items } = await client.send(new QueryCommand(params));
            if (!Items) return [];

            return Items.map(item => {
                const doc = unmarshall(item);
                const sk = doc.sk as string;
                if (!sk.startsWith('EXPENSE#')) return null;

                return {
                    expenseId: sk.split('#')[1],
                    amount: doc.amount,
                    category: doc.category,
                    description: doc.description,
                    timestamp: doc.timestamp
                };
            }).filter((i): i is any => i !== null)
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('QueryService getPersonalExpenses Error:', error);
            throw error;
        }
    }
    static async getUserByTelegramId(telegramId: string) {
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'sk = :metadata AND telegramId = :tid',
            ExpressionAttributeValues: {
                ':metadata': { S: 'METADATA' },
                ':tid': { S: telegramId }
            }
        };

        try {
            const { Items } = await client.send(new ScanCommand(params));
            if (!Items || Items.length === 0) return null;

            const users = Items.map(i => unmarshall(i));
            // Prefer the web account (with password metadata) if duplicates occur
            const webUser = users.find(u => u.passwordHash);
            const doc = webUser || users[0];

            return {
                userId: doc.pk.split('#')[1],
                name: doc.name,
                telegramId: doc.telegramId
            };
        } catch (error) {
            console.error('QueryService getUserByTelegramId Error:', error);
            throw error;
        }
    }

    static async listUsers() {
        const params = {
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :userPrefix) AND sk = :metadata',
            ExpressionAttributeValues: {
                ':userPrefix': { S: 'USER#' },
                ':metadata': { S: 'METADATA' }
            }
        };

        try {
            const { Items } = await client.send(new ScanCommand(params));
            if (!Items) return [];

            return Items.map(item => {
                const doc = unmarshall(item);
                return {
                    userId: doc.pk.split('#')[1],
                    name: doc.name,
                    telegramId: doc.telegramId,
                    createdAt: doc.createdAt
                };
            });
        } catch (error) {
            console.error('QueryService listUsers Error:', error);
            throw error;
        }
    }

    static async getUserGroups(userId: string) {
        // Scan for memberships. In production, use a GSI on 'sk'.
        const scanParams = {
            TableName: TABLE_NAME,
            FilterExpression: 'sk = :sk',
            ExpressionAttributeValues: {
                ':sk': { S: `MEMBER#${userId}` }
            }
        };

        try {
            const { Items: memberships } = await client.send(new ScanCommand(scanParams));
            if (!memberships || memberships.length === 0) return [];

            const groupIds = memberships.map(m => unmarshall(m).pk.split('#')[1]);
            const groups = [];

            for (const groupId of groupIds) {
                const details = await this.getGroupDetails(groupId);
                if (details) groups.push(details);
            }

            return groups;
        } catch (error) {
            console.error('QueryService getUserGroups Error:', error);
            throw error;
        }
    }

    static async generateLinkingCode(userId: string): Promise<string> {
        // Generate a 6-character uppercase alphanumeric code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        const params = {
            TableName: TABLE_NAME,
            Item: marshall({
                pk: `LINK_CODE#${code}`,
                sk: 'METADATA',
                userId: userId,
                // Optional: set a TTL attribute if DynamoDB TTL is configured, otherwise just a timestamp
                createdAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
            })
        };

        try {
            await client.send(new PutItemCommand(params));
            return code;
        } catch (error) {
            console.error('QueryService generateLinkingCode Error:', error);
            throw error;
        }
    }

    static async consumeLinkingCode(code: string): Promise<string | null> {
        const pk = `LINK_CODE#${code.toUpperCase()}`;
        const params = {
            TableName: TABLE_NAME,
            Key: marshall({
                pk: pk,
                sk: 'METADATA'
            })
        };

        try {
            const { Item } = await client.send(new GetItemCommand(params));
            if (!Item) return null;

            const doc = unmarshall(Item);

            // Check expiry
            if (doc.expiresAt && Date.now() > doc.expiresAt) {
                // Expired, delete it and return null
                await client.send(new DeleteItemCommand(params));
                return null;
            }

            // Consume it (delete so it can't be used again)
            await client.send(new DeleteItemCommand(params));

            return doc.userId as string;
        } catch (error) {
            console.error('QueryService consumeLinkingCode Error:', error);
            throw error;
        }
    }
}
