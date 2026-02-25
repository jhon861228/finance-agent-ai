import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class TelegramQueryRepository {
    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async generateLinkingCode(userId: string): Promise<string> {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        await this.client.send(new PutItemCommand({
            TableName: this.tableName,
            Item: marshall({
                pk: `LINK_CODE#${code}`,
                sk: 'METADATA',
                userId,
                createdAt: Date.now(),
                expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
            }),
        }));

        return code;
    }

    async consumeLinkingCode(code: string): Promise<string | null> {
        const key = marshall({ pk: `LINK_CODE#${code.toUpperCase()}`, sk: 'METADATA' });

        const { Item } = await this.client.send(new GetItemCommand({
            TableName: this.tableName,
            Key: key,
        }));

        if (!Item) return null;

        const doc = unmarshall(Item);

        // Si ya expiró, eliminarlo y retornar null
        if (doc.expiresAt && Date.now() > doc.expiresAt) {
            await this.client.send(new DeleteItemCommand({ TableName: this.tableName, Key: key }));
            return null;
        }

        // Consumir el código (eliminar para que no se reutilice)
        await this.client.send(new DeleteItemCommand({ TableName: this.tableName, Key: key }));

        return doc.userId as string;
    }

    async getDailyUsage(userId: string, dateStr: string): Promise<number> {
        const { Item } = await this.client.send(new GetItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `USER#${userId}`, sk: `USAGE#${dateStr}` }),
        }));

        if (!Item) return 0;
        return Number(unmarshall(Item).count || 0);
    }

    async incrementDailyUsage(userId: string, dateStr: string): Promise<void> {
        const currentCount = await this.getDailyUsage(userId, dateStr);

        await this.client.send(new PutItemCommand({
            TableName: this.tableName,
            Item: marshall({
                pk: `USER#${userId}`,
                sk: `USAGE#${dateStr}`,
                count: currentCount + 1,
                expiresAt: Math.floor((Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000),
            }),
        }));
    }
}
