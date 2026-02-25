import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    DomainEvent,
    EventType,
    UserCreatedEvent,
    TelegramLinkedEvent,
} from '../../events/Types';
import { IEventHandler } from './IEventHandler';

export class UserProjectionHandler implements IEventHandler {
    readonly handles: EventType[] = [
        EventType.USER_CREATED,
        EventType.TELEGRAM_LINKED,
    ];

    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async handle(event: DomainEvent): Promise<void> {
        switch (event.type) {
            case EventType.USER_CREATED:
                await this.projectUserCreated(event as UserCreatedEvent);
                break;
            case EventType.TELEGRAM_LINKED:
                await this.projectTelegramLinked(event as TelegramLinkedEvent);
                break;
        }
    }

    // ─── Proyecciones privadas ────────────────────────────────────────────────

    private async projectUserCreated(event: UserCreatedEvent): Promise<void> {
        let updateExpression = 'SET #name = :name, telegramId = :tid, createdAt = :ts, totalSpent = :zero';
        const expressionAttributeNames: Record<string, string> = { '#name': 'name' };
        const expressionAttributeValues: Record<string, any> = {
            ':name': event.payload.name,
            ':tid': event.payload.telegramId || null,
            ':ts': event.timestamp,
            ':zero': 0,
        };

        if (event.payload.passwordHash) {
            updateExpression += ', passwordHash = :pwd';
            expressionAttributeValues[':pwd'] = event.payload.passwordHash;
        }

        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: marshall(expressionAttributeValues),
        }));
    }

    private async projectTelegramLinked(event: TelegramLinkedEvent): Promise<void> {
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'SET telegramId = :tid',
            ExpressionAttributeValues: marshall({ ':tid': event.payload.telegramId }),
        }));
    }
}
