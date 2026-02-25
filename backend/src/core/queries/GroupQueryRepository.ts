import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { DebtCalculator } from '../DebtCalculator';
import { GroupDetails } from '../QueryService';

export class GroupQueryRepository {
    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async getGroupDetails(groupId: string): Promise<GroupDetails | null> {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': { S: `GROUP#${groupId}` } },
        }));

        if (!Items || Items.length === 0) return null;

        const group: GroupDetails = {
            groupId,
            name: '',
            createdAt: 0,
            members: [],
            expenses: [],
            balances: [],
            settlements: [],
        };

        for (const item of Items) {
            const doc = unmarshall(item);
            const sk = doc.sk as string;

            if (sk === 'METADATA') {
                group.name = doc.name;
                group.createdAt = doc.createdAt;
            } else if (sk.startsWith('MEMBER#')) {
                group.members.push({
                    userId: sk.split('#')[1],
                    name: doc.name,
                    telegramId: doc.telegramId,
                });
            } else if (sk.startsWith('EXPENSE#')) {
                group.expenses.push({
                    expenseId: sk.split('#')[1],
                    amount: doc.amount,
                    description: doc.description,
                    payerId: doc.payerId,
                    timestamp: doc.timestamp,
                });
            } else if (sk.startsWith('BALANCE#')) {
                group.balances.push({
                    userId: sk.split('#')[1],
                    paidAmount: doc.paidAmount,
                });
            } else if (sk.startsWith('SETTLEMENT#')) {
                group.settlements?.push({
                    settlementId: sk.split('#')[1],
                    transfers: doc.transfers,
                    timestamp: doc.timestamp,
                });
            }
        }

        // Calcular deudas
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
    }

    async listGroups() {
        const { Items } = await this.client.send(new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'sk = :metadata',
            ExpressionAttributeValues: { ':metadata': { S: 'METADATA' } },
        }));

        if (!Items) return [];

        return Items
            .map(item => unmarshall(item))
            .filter(doc => (doc.pk as string).startsWith('GROUP#'))
            .map(doc => ({
                groupId: doc.pk.split('#')[1],
                name: doc.name,
                createdAt: doc.createdAt,
                createdBy: doc.createdBy,
            }));
    }

    async getGroupMembers(groupId: string) {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk and begins_with(sk, :memberPrefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `GROUP#${groupId}` },
                ':memberPrefix': { S: 'MEMBER#' },
            },
        }));

        if (!Items) return [];

        return Items.map(item => {
            const doc = unmarshall(item);
            return {
                userId: doc.sk.split('#')[1],
                name: doc.name,
                telegramId: doc.telegramId,
            };
        });
    }

    async getUserGroups(userId: string) {
        const { Items: memberships } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            IndexName: 'GSI1',
            KeyConditionExpression: 'sk = :sk',
            ExpressionAttributeValues: { ':sk': { S: `MEMBER#${userId}` } },
        }));

        if (!memberships || memberships.length === 0) return [];

        const groupIds = memberships.map(m => unmarshall(m).pk.split('#')[1]);
        const groups = [];

        for (const groupId of groupIds) {
            const details = await this.getGroupDetails(groupId);
            if (details) groups.push(details);
        }

        return groups;
    }
}
