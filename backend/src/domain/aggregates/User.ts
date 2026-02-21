import { DomainEvent, EventType, UserCreatedEvent, TelegramLinkedEvent } from '../../events/Types';
import { v4 as uuidv4 } from 'uuid';

export class User {
    id: string;
    name: string = '';
    telegramId?: string;
    passwordHash?: string;

    private events: DomainEvent[] = [];

    constructor(id: string, events: DomainEvent[] = []) {
        this.id = id;
        events.forEach((e) => this.apply(e));
    }

    private apply(event: DomainEvent) {
        switch (event.type) {
            case EventType.USER_CREATED:
                const payload = (event as UserCreatedEvent).payload;
                this.name = payload.name;
                this.telegramId = payload.telegramId;
                this.passwordHash = payload.passwordHash;
                break;
            case EventType.TELEGRAM_LINKED:
                const linkedPayload = (event as TelegramLinkedEvent).payload;
                this.telegramId = linkedPayload.telegramId;
                break;
        }
    }

    public getUncommittedEvents(): DomainEvent[] {
        return this.events;
    }

    public createUser(name: string, telegramId?: string, passwordHash?: string) {
        const event: UserCreatedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.USER_CREATED,
            timestamp: Date.now(),
            payload: {
                userId: this.id,
                name,
                telegramId,
                passwordHash
            }
        };
        this.events.push(event);
        this.apply(event);
    }

    public linkTelegram(telegramId: string) {
        if (this.telegramId && this.telegramId !== telegramId) {
            throw new Error(`User already linked to a different Telegram account.`);
        }
        if (this.telegramId === telegramId) return; // Already linked

        const event: TelegramLinkedEvent = {
            eventId: uuidv4(),
            aggregateId: this.id,
            type: EventType.TELEGRAM_LINKED,
            timestamp: Date.now(),
            payload: {
                telegramId
            }
        };
        this.events.push(event);
        this.apply(event);
    }
}
