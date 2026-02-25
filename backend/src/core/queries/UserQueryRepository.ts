import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export class UserQueryRepository {
    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async getUserByUsername(username: string) {
        const { Items } = await this.client.send(new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'sk = :metadata AND begins_with(pk, :userPrefix)',
            ExpressionAttributeValues: {
                ':metadata': { S: 'METADATA' },
                ':userPrefix': { S: 'USER#' },
            },
        }));

        if (!Items) return null;

        const users = Items.map(i => unmarshall(i));
        const userDoc = users.find(u => u.name.toLowerCase() === username.toLowerCase());
        if (!userDoc) return null;

        return {
            userId: userDoc.pk.split('#')[1],
            name: userDoc.name,
            telegramId: userDoc.telegramId,
            totalSpent: Number(userDoc.totalSpent || 0),
            passwordHash: userDoc.passwordHash,
        };
    }

    async getUserByTelegramId(telegramId: string) {
        const { Items } = await this.client.send(new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'sk = :metadata AND telegramId = :tid',
            ExpressionAttributeValues: {
                ':metadata': { S: 'METADATA' },
                ':tid': { S: telegramId },
            },
        }));

        if (!Items || Items.length === 0) return null;

        const users = Items.map(i => unmarshall(i));
        // Si hay duplicados, preferir la cuenta web (con passwordHash)
        const webUser = users.find(u => u.passwordHash);
        const doc = webUser || users[0];

        return {
            userId: doc.pk.split('#')[1],
            name: doc.name,
            telegramId: doc.telegramId,
        };
    }

    async listUsers() {
        const { Items } = await this.client.send(new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(pk, :userPrefix) AND sk = :metadata',
            ExpressionAttributeValues: {
                ':userPrefix': { S: 'USER#' },
                ':metadata': { S: 'METADATA' },
            },
        }));

        if (!Items) return [];

        return Items.map(item => {
            const doc = unmarshall(item);
            return {
                userId: doc.pk.split('#')[1],
                name: doc.name,
                telegramId: doc.telegramId,
                createdAt: doc.createdAt,
            };
        });
    }

    async getPersonalExpenses(userId: string) {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': { S: `USER#${userId}` } },
        }));

        if (!Items) return [];

        return Items
            .map(item => {
                const doc = unmarshall(item);
                const sk = doc.sk as string;
                if (!sk.startsWith('EXPENSE#')) return null;
                return {
                    expenseId: sk.split('#')[1],
                    amount: doc.amount,
                    category: doc.category,
                    description: doc.description,
                    timestamp: doc.timestamp,
                };
            })
            .filter((i): i is NonNullable<typeof i> => i !== null)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
}
