import { Handler } from 'aws-lambda';
import { EventStore } from './EventStore';
import { Projector } from './Projector';
import { ExpenseGroup } from '../domain/aggregates/ExpenseGroup';
import { PersonalAccount } from '../domain/aggregates/PersonalAccount';
import { User } from '../domain/aggregates/User';
import { v4 as uuidv4 } from 'uuid';

const eventStore = new EventStore();
const projector = new Projector();

export interface Command {
    commandId: string;
    type: 'CreateGroup' | 'AddMember' | 'AddExpense' | 'SettleDebts' | 'RecordPersonalExpense' | 'CreateUser' | 'DeletePersonalExpense' | 'ClearPersonalExpenses';
    payload: any;
}

export class CommandProcessor {
    static async process(command: Command) {
        if (command.type === 'RecordPersonalExpense') {
            const userId = command.payload.userId;
            const events = await eventStore.getEvents(userId);
            const account = new PersonalAccount(userId, events);

            account.recordExpense(
                command.payload.amount,
                command.payload.category,
                command.payload.description
            );

            const newEvents = account.getUncommittedEvents();
            for (const event of newEvents) {
                await eventStore.save(event);
                await projector.handle(event);
            }
            return { success: true, aggregateId: userId, eventsCreated: newEvents.length };
        }

        if (command.type === 'DeletePersonalExpense') {
            const userId = command.payload.userId;
            const events = await eventStore.getEvents(userId);
            const account = new PersonalAccount(userId, events);

            account.deleteExpense(command.payload.expenseId);

            const newEvents = account.getUncommittedEvents();
            for (const event of newEvents) {
                await eventStore.save(event);
                await projector.handle(event);
            }
            return { success: true, aggregateId: userId, eventsCreated: newEvents.length };
        }

        if (command.type === 'ClearPersonalExpenses') {
            const userId = command.payload.userId;
            const events = await eventStore.getEvents(userId);
            const account = new PersonalAccount(userId, events);

            account.clearAccount();

            const newEvents = account.getUncommittedEvents();
            for (const event of newEvents) {
                await eventStore.save(event);
                await projector.handle(event);
            }
            return { success: true, aggregateId: userId, eventsCreated: newEvents.length };
        }

        if (command.type === 'CreateUser') {
            let userId = command.payload.userId || uuidv4();
            const events = await eventStore.getEvents(userId);
            const user = new User(userId, events);

            user.createUser(command.payload.name, command.payload.telegramId);

            const newEvents = user.getUncommittedEvents();
            for (const event of newEvents) {
                await eventStore.save(event);
                await projector.handle(event);
            }
            return {
                success: true,
                aggregateId: userId,
                eventsCreated: newEvents.length,
                payload: { ...command.payload, userId }
            };
        }

        // Default: Expense Group Logic
        let groupId = command.payload.groupId;

        // For CreateGroup, we generate a new ID if not provided (though usually it is not) based on logic
        if (command.type === 'CreateGroup' && !groupId) {
            groupId = uuidv4();
        }

        const events = await eventStore.getEvents(groupId);
        const group = new ExpenseGroup(groupId, events);

        // 2. Execute Command
        switch (command.type) {
            case 'CreateGroup':
                group.createGroup(
                    command.payload.name,
                    command.payload.createdBy,
                    command.payload.creatorName,
                    command.payload.creatorTelegramId
                );
                break;
            case 'AddMember':
                const newUserId = command.payload.userId || uuidv4();
                group.addMember(newUserId, command.payload.name, command.payload.telegramId);
                // Attach generated ID to result context if needed, 
                // but since process returns a fixed structure, we might need to expand it.
                // For now, let's attach it to the command payload so we can retrieve it or return it.
                command.payload.userId = newUserId;
                break;
            case 'AddExpense':
                // Logic improvement: in a real app check if payer is member
                group.addExpense(
                    command.payload.payerId,
                    command.payload.amount,
                    command.payload.description,
                    command.payload.splitDetails
                );
                break;
            case 'SettleDebts':
                group.settleDebts(command.payload.transactions);
                break;
            default:
                throw new Error('Unknown command');
        }

        // 3. Persist Events
        const newEvents = group.getUncommittedEvents().filter(e => !events.find(existing => existing.eventId === e.eventId));

        for (const event of newEvents) {
            await eventStore.save(event);
            // In local/express mode, we need to trigger the projector manually
            // since we don't have DynamoDB Streams connected to Lambda.
            await projector.handle(event);
        }

        return {
            success: true,
            groupId,
            eventsCreated: newEvents.length,
            // Return updated payload which might contain generated IDs (like userId in AddMember)
            payload: command.payload
        };
    }
}

export const handler: Handler = async (event) => {
    try {
        const command: Command = JSON.parse(event.body || '{}');
        const result = await CommandProcessor.process(command);

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };

    } catch (error: any) {
        console.error('Command processing failed', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
