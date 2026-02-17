import { DomainEvent, EventType, GroupCreatedEvent, MemberAddedEvent, ExpenseAddedEvent, SettlementRecordedEvent } from '../../events/Types';
import { v4 as uuidv4 } from 'uuid';

export class ExpenseGroup {
    id: string;
    name: string = '';
    members: string[] = []; // User IDs
    balance: Record<string, number> = {}; // UserId -> Amount (positive = owed, negative = owes)

    private events: DomainEvent[] = [];

    constructor(id: string, events: DomainEvent[] = []) {
        this.id = id;
        events.forEach((e) => this.apply(e));
    }

    // Hydrate state from events
    private apply(event: DomainEvent) {
        switch (event.type) {
            case EventType.GROUP_CREATED:
                this.name = (event as GroupCreatedEvent).payload.name;
                break;
            case EventType.MEMBER_ADDED:
                const memberId = (event as MemberAddedEvent).payload.userId;
                if (!this.members.includes(memberId)) {
                    this.members.push(memberId);
                }
                break;
            case EventType.EXPENSE_ADDED:
                const expense = (event as ExpenseAddedEvent).payload;
                this.balance[expense.payerId] = (this.balance[expense.payerId] || 0) + expense.amount;
                break;
            case EventType.SETTLEMENT_RECORDED:
                const transfers = (event as SettlementRecordedEvent).payload.transfers;
                transfers.forEach(t => {
                    // Payer (From) "paid" more to the group context (settling debt)
                    this.balance[t.from] = (this.balance[t.from] || 0) + t.amount;
                    // Payee (To) "paid" less (was reimbursed)
                    this.balance[t.to] = (this.balance[t.to] || 0) - t.amount;
                });
                break;
        }
    }

    public getUncommittedEvents(): DomainEvent[] {
        return this.events;
    }

    public createGroup(name: string, createdBy: string, creatorName?: string, creatorTelegramId?: string) {
        const event: GroupCreatedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.GROUP_CREATED,
            timestamp: Date.now(),
            payload: { name, createdBy }
        };
        this.events.push(event);
        this.apply(event);

        // Automatically add creator as the first member
        this.addMember(createdBy, creatorName || 'Creator', creatorTelegramId);
    }

    public addMember(userId: string, name: string, telegramId?: string) {
        if (this.members.includes(userId)) return;

        const event: MemberAddedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.MEMBER_ADDED,
            timestamp: Date.now(),
            payload: { userId, name, telegramId }
        };
        this.events.push(event);
        this.apply(event);
    }

    public addExpense(payerId: string, amount: number, description: string, splitDetails?: any) {
        if (!this.members.includes(payerId)) {
            throw new Error('Payer must be a member of the group');
        }

        const event: ExpenseAddedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.EXPENSE_ADDED,
            timestamp: Date.now(),
            payload: {
                expenseId: uuidv4(),
                payerId,
                amount,
                description,
                splitDetails
            }
        };
        this.events.push(event);
        this.apply(event);
    }

    public settleDebts(transfers: { from: string; to: string; amount: number }[]) {
        const event: SettlementRecordedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.SETTLEMENT_RECORDED,
            timestamp: Date.now(),
            payload: {
                settlementId: uuidv4(),
                transfers
            }
        };
        this.events.push(event);
        this.apply(event);
    }
}
