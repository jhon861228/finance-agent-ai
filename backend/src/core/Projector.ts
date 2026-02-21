import { DynamoDBClient, UpdateItemCommand, PutItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DomainEvent, EventType, ExpenseAddedEvent, GroupCreatedEvent, MemberAddedEvent, SettlementRecordedEvent, PersonalExpenseRecordedEvent, UserCreatedEvent, PersonalExpenseDeletedEvent, PersonalAccountClearedEvent } from '../events/Types';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    credentials: process.env.DYNAMODB_ENDPOINT ? {
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
    } : undefined
});
const TABLE_NAME = process.env.READ_MODELS_TABLE || 'finance-agent-read-models';

export class Projector {
    async handle(event: DomainEvent) {
        try {
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
                case EventType.PERSONAL_EXPENSE_RECORDED:
                    await this.projectPersonalExpenseRecorded(event as PersonalExpenseRecordedEvent);
                    break;
                case EventType.USER_CREATED:
                    await this.projectUserCreated(event as UserCreatedEvent);
                    break;
                case EventType.PERSONAL_EXPENSE_DELETED:
                    await this.projectPersonalExpenseDeleted(event as PersonalExpenseDeletedEvent);
                    break;
                case EventType.PERSONAL_ACCOUNT_CLEARED:
                    await this.projectPersonalAccountCleared(event as PersonalAccountClearedEvent);
                    break;
            }
        } catch (error) {
            console.error('Error projecting event:', error);
            throw error;
        }
    }

    private async projectGroupCreated(event: GroupCreatedEvent) {
        const params = {
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'SET #name = :name, createdBy = :createdBy, createdAt = :createdAt, totalSpent = :zero, memberCount = :zero',
            ExpressionAttributeNames: { '#name': 'name' },
            ExpressionAttributeValues: marshall({
                ':name': event.payload.name,
                ':createdBy': event.payload.createdBy,
                ':createdAt': event.timestamp,
                ':zero': 0
            }),
        };
        await client.send(new UpdateItemCommand(params));
    }

    private async projectMemberAdded(event: MemberAddedEvent) {
        // 1. Add Member Item
        const params = {
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `MEMBER#${event.payload.userId}` }),
            UpdateExpression: 'SET #name = :name, telegramId = :tid',
            ExpressionAttributeNames: { '#name': 'name' },
            ExpressionAttributeValues: marshall({
                ':name': event.payload.name,
                ':tid': event.payload.telegramId || null,
            }),
        };
        await client.send(new UpdateItemCommand(params));

        // 2. Increment Member Count in Metadata
        await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'ADD memberCount :one',
            ExpressionAttributeValues: marshall({ ':one': 1 })
        }));

        // 3. Recalculate settlements since member list changed
        await this.recalculateSettlements(event.aggregateId);
    }

    private async projectExpenseAdded(event: ExpenseAddedEvent) {
        // 1. Store the expense item
        const expenseParams = {
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `EXPENSE#${event.payload.expenseId}` }),
            UpdateExpression: 'SET amount = :amount, description = :desc, payerId = :payer, #ts = :ts',
            ExpressionAttributeNames: { '#ts': 'timestamp' },
            ExpressionAttributeValues: marshall({
                ':amount': event.payload.amount,
                ':desc': event.payload.description,
                ':payer': event.payload.payerId,
                ':ts': event.timestamp
            })
        };
        await client.send(new UpdateItemCommand(expenseParams));

        // 2. Update Group Metadata Total
        await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'ADD totalSpent :amount',
            ExpressionAttributeValues: marshall({ ':amount': event.payload.amount })
        }));

        // 3. Update Payer Balance
        await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `BALANCE#${event.payload.payerId}` }),
            UpdateExpression: 'ADD paidAmount :amount',
            ExpressionAttributeValues: marshall({ ':amount': event.payload.amount })
        }));

        // 4. Recalculate settlements
        await this.recalculateSettlements(event.aggregateId);
    }

    private async recalculateSettlements(groupId: string) {
        // Fetch all items for this group to get members and balances
        const { Items } = await client.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: marshall({ ':pk': `GROUP#${groupId}` })
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

        // Use DebtCalculator to simplify
        const { DebtCalculator } = await import('./DebtCalculator');
        const transactions = DebtCalculator.simplifyDebts(netBalances);

        // Store projected settlements
        await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `GROUP#${groupId}`, sk: 'SETTLEMENTS' }),
            UpdateExpression: 'SET transactions = :t, lastUpdate = :ts',
            ExpressionAttributeValues: marshall({
                ':t': transactions,
                ':ts': Date.now()
            })
        }));
    }

    private async projectSettlementRecorded(event: SettlementRecordedEvent) {
        // ... (existing logic to update BALANCE items)
        for (const transfer of event.payload.transfers) {
            await client.send(new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `BALANCE#${transfer.from}` }),
                UpdateExpression: 'ADD paidAmount :amount',
                ExpressionAttributeValues: marshall({ ':amount': transfer.amount })
            }));

            await client.send(new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ pk: `GROUP#${event.aggregateId}`, sk: `BALANCE#${transfer.to}` }),
                UpdateExpression: 'ADD paidAmount :amount',
                ExpressionAttributeValues: marshall({ ':amount': -transfer.amount })
            }));
        }

        // Recalculate after manual settlement
        await this.recalculateSettlements(event.aggregateId);
    }

    private async projectPersonalExpenseRecorded(event: PersonalExpenseRecordedEvent) {
        const params = {
            TableName: TABLE_NAME,
            Item: marshall({
                pk: `USER#${event.aggregateId}`,
                sk: `EXPENSE#${event.payload.expenseId}`,
                amount: event.payload.amount,
                category: event.payload.category,
                description: event.payload.description,
                timestamp: event.timestamp
            })
        };
        await client.send(new PutItemCommand(params));

        // Update User Metadata Total
        await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: 'ADD totalSpent :amount',
            ExpressionAttributeValues: marshall({ ':amount': event.payload.amount })
        }));
    }

    private async projectPersonalExpenseDeleted(event: PersonalExpenseDeletedEvent) {
        // Find exact SK first to handle both formats
        const queryParams = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `USER#${event.aggregateId}` },
                ':prefix': { S: 'EXPENSE#' }
            }
        };

        const { Items } = await client.send(new QueryCommand(queryParams));
        if (!Items) return;

        const targetItem = Items.find(item => {
            const doc = unmarshall(item);
            return (doc.sk as string).includes(event.payload.expenseId);
        });

        if (targetItem) {
            const sk = unmarshall(targetItem).sk;
            await client.send(new DeleteItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ pk: `USER#${event.aggregateId}`, sk })
            }));
        }
    }

    private async projectPersonalAccountCleared(event: PersonalAccountClearedEvent) {
        const queryParams = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
                ':pk': { S: `USER#${event.aggregateId}` },
                ':prefix': { S: 'EXPENSE#' }
            }
        };

        const { Items } = await client.send(new QueryCommand(queryParams));
        if (!Items) return;

        for (const item of Items) {
            const sk = unmarshall(item).sk;
            await client.send(new DeleteItemCommand({
                TableName: TABLE_NAME,
                Key: marshall({ pk: `USER#${event.aggregateId}`, sk })
            }));
        }
    }

    private async projectUserCreated(event: UserCreatedEvent) {
        let updateExpression = 'SET #name = :name, telegramId = :tid, createdAt = :ts, totalSpent = :zero';
        const expressionAttributeNames: any = { '#name': 'name' };
        const expressionAttributeValues: any = {
            ':name': event.payload.name,
            ':tid': event.payload.telegramId || null,
            ':ts': event.timestamp,
            ':zero': 0
        };

        if (event.payload.passwordHash) {
            updateExpression += ', passwordHash = :pwd';
            expressionAttributeValues[':pwd'] = event.payload.passwordHash;
        }

        const params = {
            TableName: TABLE_NAME,
            Key: marshall({ pk: `USER#${event.aggregateId}`, sk: 'METADATA' }),
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: marshall(expressionAttributeValues)
        };
        await client.send(new UpdateItemCommand(params));
    }
}
