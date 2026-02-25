import { DynamoDBClient, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
    DomainEvent,
    EventType,
    ExpenseAddedEvent,
    GroupCreatedEvent,
    MemberAddedEvent,
    SettlementRecordedEvent,
} from '../../events/Types';
import { IEventHandler } from './IEventHandler';

export class GroupProjectionHandler implements IEventHandler {
    readonly handles: EventType[] = [
        EventType.GROUP_CREATED,
        EventType.MEMBER_ADDED,
        EventType.EXPENSE_ADDED,
        EventType.SETTLEMENT_RECORDED,
    ];

    constructor(
        private readonly client: DynamoDBClient,
        private readonly tableName: string,
    ) { }

    async handle(event: DomainEvent): Promise<void> {
        switch (event.type) {
            case EventType.GROUP_CREATED:
                await this.projectGroupCreated(event as GroupCreatedEvent);
                break;
            case EventType.MEMBER_ADDED:
                await this.projectMemberAdded(event as MemberAddedEvent);
                break;
            case EventType.EXPENSE_ADDED:
                await this.projectExpenseAdded(event as ExpenseAddedEvent);
                break;
            case EventType.SETTLEMENT_RECORDED:
                await this.projectSettlementRecorded(event as SettlementRecordedEvent);
                break;
        }
    }

    // ─── Proyecciones privadas ────────────────────────────────────────────────

    private async projectGroupCreated(event: GroupCreatedEvent): Promise<void> {
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'SET #name = :name, createdBy = :createdBy, createdAt = :createdAt, totalSpent = :zero, memberCount = :zero',
            ExpressionAttributeNames: { '#name': 'name' },
            ExpressionAttributeValues: marshall({
                ':name': event.payload.name,
                ':createdBy': event.payload.createdBy,
                ':createdAt': event.timestamp,
                ':zero': 0,
            }),
        }));
    }

    private async projectMemberAdded(event: MemberAddedEvent): Promise<void> {
        // 1. Agregar item de miembro
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `MEMBER#${event.payload.userId}` }),
            UpdateExpression: 'SET #name = :name, telegramId = :tid',
            ExpressionAttributeNames: { '#name': 'name' },
            ExpressionAttributeValues: marshall({
                ':name': event.payload.name,
                ':tid': event.payload.telegramId || null,
            }),
        }));

        // 2. Incrementar contador de miembros en metadata
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'ADD memberCount :one',
            ExpressionAttributeValues: marshall({ ':one': 1 }),
        }));

        // 3. Recalcular settlements al cambiar la lista de miembros
        await this.recalculateSettlements(event.aggregateId);
    }

    private async projectExpenseAdded(event: ExpenseAddedEvent): Promise<void> {
        const { aggregateId: groupId, eventId, payload } = event;
        const { expenseId, amount, payerId, description } = payload;

        console.log(`[GroupProjectionHandler] Processing ${amount} for group ${groupId}. EventId: ${eventId}`);

        // 1. Guardar item de gasto
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${groupId}`, sk: `EXPENSE#${expenseId}` }),
            UpdateExpression: 'SET amount = :amount, description = :desc, payerId = :payer, #ts = :ts',
            ExpressionAttributeNames: { '#ts': 'timestamp' },
            ExpressionAttributeValues: marshall({
                ':amount': amount,
                ':desc': description,
                ':payer': payerId,
                ':ts': event.timestamp,
            }),
        }));

        // 2. Actualizar total del grupo (idempotente)
        try {
            const result = await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `GROUP#${groupId}`, sk: 'METADATA' }),
                UpdateExpression: 'ADD totalSpent :amount SET lastEventId = :eid',
                ConditionExpression: 'attribute_not_exists(lastEventId) OR lastEventId <> :eid',
                ExpressionAttributeValues: marshall({ ':amount': amount, ':eid': eventId }),
                ReturnValues: 'ALL_NEW',
            }));
            const updatedMetadata = unmarshall(result.Attributes || {});
            console.log(`[GroupProjectionHandler] Total update successful. New Group Total: ${updatedMetadata.totalSpent}`);
        } catch (error: any) {
            if (error.name === 'ConditionalCheckFailedException') {
                console.warn(`[GroupProjectionHandler] IDEMPOTENCY: Event ${eventId} already processed for group ${groupId}.`);
                return;
            }
            throw error;
        }

        // 3. Actualizar balance del pagador
        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${groupId}`, sk: `BALANCE#${payerId}` }),
            UpdateExpression: 'ADD paidAmount :amount',
            ExpressionAttributeValues: marshall({ ':amount': amount }),
        }));

        // 4. Recalcular settlements
        await this.recalculateSettlements(groupId);
    }

    private async projectSettlementRecorded(event: SettlementRecordedEvent): Promise<void> {
        for (const transfer of event.payload.transfers) {
            await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `BALANCE#${transfer.from}` }),
                UpdateExpression: 'ADD paidAmount :amount',
                ExpressionAttributeValues: marshall({ ':amount': transfer.amount }),
            }));

            await this.client.send(new UpdateItemCommand({
                TableName: this.tableName,
                Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `BALANCE#${transfer.to}` }),
                UpdateExpression: 'ADD paidAmount :amount',
                ExpressionAttributeValues: marshall({ ':amount': -transfer.amount }),
            }));
        }
        await this.recalculateSettlements(event.aggregateId);
    }

    // ─── Cálculo de settlements ───────────────────────────────────────────────

    async recalculateSettlements(groupId: string): Promise<void> {
        const { Items } = await this.client.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: marshall({ ':pk': `GROUP#${groupId}` }),
        }));

        if (!Items) return;

        const docs = Items.map(i => unmarshall(i));
        const metadata = docs.find(d => d.sk === 'METADATA');
        const members = docs.filter(d => d.sk.startsWith('MEMBER#'));
        const balances = docs.filter(d => d.sk.startsWith('BALANCE#'));

        if (!metadata || members.length === 0) return;

        const totalSpent = metadata.totalSpent || 0;
        const perPersonShare = totalSpent / members.length;

        const netBalances: Record<string, number> = {};
        members.forEach(m => {
            const userId = m.sk.replace('MEMBER#', '');
            const balanceDoc = balances.find(b => b.sk === `BALANCE#${userId}`);
            const paid = balanceDoc ? (balanceDoc.paidAmount || 0) : 0;
            netBalances[userId] = paid - perPersonShare;
        });

        const { DebtCalculator } = await import('../DebtCalculator');
        const transactions = DebtCalculator.simplifyDebts(netBalances);

        await this.client.send(new UpdateItemCommand({
            TableName: this.tableName,
            Key: marshall({ pk: `GROUP#${groupId}`, sk: 'SETTLEMENTS' }),
            UpdateExpression: 'SET transactions = :t, lastUpdate = :ts',
            ExpressionAttributeValues: marshall({ ':t': transactions, ':ts': Date.now() }),
        }));
    }
}
