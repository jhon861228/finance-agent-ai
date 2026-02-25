import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DomainEvent } from '../events/Types';
import { IEventHandler } from './projections/IEventHandler';
import { GroupProjectionHandler } from './projections/GroupProjectionHandler';
import { PersonalProjectionHandler } from './projections/PersonalProjectionHandler';
import { UserProjectionHandler } from './projections/UserProjectionHandler';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    credentials: process.env.DYNAMODB_ENDPOINT ? {
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
    } : undefined,
});
const TABLE_NAME = process.env.READ_MODELS_TABLE || 'finance-agent-read-models';

export class Projector {
    private readonly handlers: IEventHandler[];

    constructor() {
        this.handlers = [
            new GroupProjectionHandler(client, TABLE_NAME),
            new PersonalProjectionHandler(client, TABLE_NAME),
            new UserProjectionHandler(client, TABLE_NAME),
        ];
    }

    async handle(event: DomainEvent): Promise<void> {
        console.log(`[Projector] Handling event: ${event.eventId} (Type: ${event.type}, AggregateId: ${event.aggregateId})`);

        const handler = this.handlers.find(h => h.handles.includes(event.type));

        if (!handler) {
            console.log(`[Projector] No handler registered for type: ${event.type}`);
            return;
        }

        try {
            await handler.handle(event);
            console.log(`[Projector] Finished processing event: ${event.eventId}`);
        } catch (error) {
            console.error(`[Projector] CRITICAL ERROR processing event ${event.eventId}:`, error);
            throw error;
        }
    }
}
