export enum EventType {
    GROUP_CREATED = 'GroupCreated',
    MEMBER_ADDED = 'MemberAdded',
    EXPENSE_ADDED = 'ExpenseAdded',
    SETTLEMENT_RECORDED = 'SettlementRecorded',
    PERSONAL_EXPENSE_RECORDED = 'PersonalExpenseRecorded',
    USER_CREATED = 'UserCreated',
    PERSONAL_EXPENSE_DELETED = 'PersonalExpenseDeleted',
    PERSONAL_ACCOUNT_CLEARED = 'PersonalAccountCleared',
    TELEGRAM_LINKED = 'TelegramLinked',
}

export interface BaseEvent {
    eventId: string;
    aggregateId: string; // Group ID
    type: EventType;
    timestamp: number;
    payload: any;
}

export interface GroupCreatedEvent extends BaseEvent {
    type: EventType.GROUP_CREATED;
    payload: {
        name: string;
        createdBy: string;
    };
}

export interface MemberAddedEvent extends BaseEvent {
    type: EventType.MEMBER_ADDED;
    payload: {
        userId: string;
        telegramId?: string;
        name: string;
    };
}

export interface ExpenseAddedEvent extends BaseEvent {
    type: EventType.EXPENSE_ADDED;
    payload: {
        expenseId: string;
        payerId: string;
        amount: number;
        description: string;
        splitDetails: any; // Can be simplified for now
    };
}

export interface SettlementRecordedEvent extends BaseEvent {
    type: EventType.SETTLEMENT_RECORDED;
    payload: {
        settlementId: string;
        transfers: {
            from: string;
            to: string;
            amount: number;
        }[];
    };
}

export interface PersonalExpenseRecordedEvent extends BaseEvent {
    type: EventType.PERSONAL_EXPENSE_RECORDED;
    payload: {
        expenseId: string;
        amount: number;
        category: string;
        description: string;
    };
}

export interface UserCreatedEvent extends BaseEvent {
    type: EventType.USER_CREATED;
    payload: {
        userId: string;
        name: string;
        telegramId?: string;
        passwordHash?: string;
    };
}

export interface PersonalExpenseDeletedEvent extends BaseEvent {
    type: EventType.PERSONAL_EXPENSE_DELETED;
    payload: {
        expenseId: string;
    };
}

export interface TelegramLinkedEvent extends BaseEvent {
    type: EventType.TELEGRAM_LINKED;
    payload: {
        telegramId: string;
    };
}

export interface PersonalAccountClearedEvent extends BaseEvent {
    type: EventType.PERSONAL_ACCOUNT_CLEARED;
    payload: {};
}

export type DomainEvent = GroupCreatedEvent | MemberAddedEvent | ExpenseAddedEvent | SettlementRecordedEvent | PersonalExpenseRecordedEvent | UserCreatedEvent | PersonalExpenseDeletedEvent | PersonalAccountClearedEvent | TelegramLinkedEvent;
