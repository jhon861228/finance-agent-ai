import { DomainEvent, EventType } from '../../events/Types';

export interface IEventHandler<T extends DomainEvent = DomainEvent> {
    /** Lista de EventType que este handler sabe procesar */
    readonly handles: EventType[];
    handle(event: T): Promise<void>;
}
