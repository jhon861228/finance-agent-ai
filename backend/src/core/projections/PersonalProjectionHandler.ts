import { DynamoDBClient, UpdateItemCommand, PutItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    DomainEvent,
    EventType,
    PersonalExpenseRecordedEvent,
    PersonalExpenseDeletedEvent,
    PersonalAccountClearedEvent,
} from '../../events/Types';
import { IEventHandler } from './IEventHandler';

export class PersonalProjectionHandler implements IEventHandler {
    readonly handles: EventType[] = [
        EventType.PERSONAL_EXPENSE_RECORDED,
        EventType.PERSONAL_EXPENSE_DELETED,
        EventType.PERSONAL_ACCOUNT_CLEARED,
    ];

    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async handle(event: DomainEvent): Promise<void> {
        switch (event.type) {
            case EventType.PERSONAL_EXPENSE_RECORDED:
                await this.projectPersonalExpenseRecorded(event as PersonalExpenseRecordedEvent);
                break;
            case EventType.PERSONAL_EXPENSE_DELETED:
                await this.projectPersonalExpenseDeleted(event as PersonalExpenseDeletedEvent);
                break;
            case EventType.PERSONAL_ACCOUNT_CLEARED:
                await this.projectPersonalAccountCleared(event as PersonalAccountClearedEvent);
                break;
        }
    }

    // ─── Proyecciones privadas ────────────────────────────────────────────────

    private async projectPersonalExpenseRecorded(event: PersonalExpenseRecordedEvent): Promise<void> {
        const { aggregateId: userId, eventId, payload } = event;
        const { expenseId, amount, category, description } = payload;

        console.log(`[PersonalProjectionHandler] Recording ${amount} for user ${userId}. EventId: ${eventId}`);

        // 1. Guardar item de gasto
        await this.client.send(new PutItemCommand({
            TableName: this.tableName,
            Item: marshall({
                pk: `USER#${userId}`,
                sk: `EXPENSE#${expenseId}`,
                amount,
                category,
                description,
                timestamp: event.timestamp,
            }),
        }));

        // 2. Actualizar total del usuario (idempotente)
        try {
            const result = await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `USER#${userId}`, sk: 'METADATA' }),
                UpdateExpression: 'ADD totalSpent :amount SET lastEventId = :eid',
                ConditionExpression: 'attribute_not_exists(lastEventId) OR lastEventId <> :eid',
                ExpressionAttributeValues: marshall({ ':amount': amount, ':eid': eventId }),
                ReturnValues: 'ALL_NEW',
            }));
            const updatedMetadata = unmarshall(result.Attributes || {});
            console.log(`[PersonalProjectionHandler] Total update successful. New User Total: ${updatedMetadata.totalSpent}`);
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                console.warn(`[PersonalProjectionHandler] IDEMPOTENCY: Event ${eventId} already processed for user ${userId}.`);
                return;
            }
            throw error;
        }
    }

    private async projectPersonalExpenseDeleted(event: PersonalExpenseDeletedEvent): Promise<void> {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `USER#${event.aggregateId}` },
                ':prefix': { S: 'EXPENSE#' },
            },
        }));

        if (!Items) return;

        const targetItem = Items.find(item => {
            const doc = unmarshall(item);
            return (doc.sk as string).includes(event.payload.expenseId);
        });

        if (!targetItem) return;

        const doc = unmarshall(targetItem);
        const sk = doc.sk;
        const amount = doc.amount || 0;

        // 1. Eliminar el item
        await this.client.send(new DeleteItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `USER#${event.aggregateId}`, sk }),
        }));

        // 2. Restar del total (idempotente)
        try {
            await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
                UpdateExpression: 'ADD totalSpent :minusAmount SET lastEventId = :eid',
                ConditionExpression: 'attribute_not_exists(lastEventId) OR lastEventId <> :eid',
                ExpressionAttributeValues: marshall({ ':minusAmount': -amount, ':eid': event.eventId }),
            }));
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                console.log(`[PersonalProjectionHandler] Event ${event.eventId} already processed for deletion. Skipping.`);
                return;
            }
            throw error;
        }
    }

    private async projectPersonalAccountCleared(event: PersonalAccountClearedEvent): Promise<void> {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `USER#${event.aggregateId}` },
                ':prefix': { S: 'EXPENSE#' },
            },
        }));

        if (!Items) return;

        // 1. Eliminar todos los ítems de gastos
        for (const item of Items) {
            const sk = unmarshall(item).sk;
            await this.client.send(new DeleteItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `USER#${event.aggregateId}`, sk }),
            }));
        }

        // 2. Resetear total (idempotente)
        try {
            await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
                UpdateExpression: 'SET totalSpent = :zero, lastEventId = :eid',
                ConditionExpression: 'attribute_not_exists(lastEventId) OR lastEventId <> :eid',
                ExpressionAttributeValues: marshall({ ':zero': 0, ':eid': event.eventId }),
            }));
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                return;
            }
            throw error;
        }
    }
}
