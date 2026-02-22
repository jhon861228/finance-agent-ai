import { DomainEvent, EventType, PersonalExpenseRecordedEvent } from '../../events/Types';
import { v4 as uuidv4 } from 'uuid';

export class PersonalAccount {
    id: string; // userId
    balance: number = 0; // Total spent (informational)

    private events: DomainEvent[] = [];

    constructor(id: string, events: DomainEvent[] = []) {
        this.id = id;
        events.forEach((e) => this.apply(e));
    }

    private apply(event: DomainEvent) {
        switch (event.type) {
            case EventType.PERSONAL_EXPENSE_RECORDED:
                this.balance += (event as PersonalExpenseRecordedEvent).payload.amount;
                break;
            case EventType.PERSONAL_EXPENSE_DELETED:
                // We don't track individual expenses in memory here yet
                break;
            case EventType.PERSONAL_ACCOUNT_CLEARED:
                this.balance = 0;
                break;
        }
    }

    public getUncommittedEvents(): DomainEvent[] {
        return this.events;
    }

    public recordExpense(amount: number, category: string, description: string) {
        const event: PersonalExpenseRecordedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.PERSONAL_EXPENSE_RECORDED,
            timestamp: Date.now(),
            payload: {
                expenseId: uuidv4(),
                amount,
                category,
                description
            }
        };
        this.events.push(event);
        this.apply(event);
    }

    public deleteExpense(expenseId: string) {
        const event: DomainEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.PERSONAL_EXPENSE_DELETED,
            timestamp: Date.now(),
            payload: {
                expenseId
            }
        };
        this.events.push(event);
        this.apply(event);
    }

    public clearAccount() {
        const event: DomainEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.PERSONAL_ACCOUNT_CLEARED,
            timestamp: Date.now(),
            payload: {}
        };
        this.events.push(event);
        this.apply(event);
    }
}
