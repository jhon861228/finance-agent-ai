import { DomainEvent, EventType, UserCreatedEvent } from '../../events/Types';
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
}
