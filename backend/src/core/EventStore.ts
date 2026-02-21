import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DomainEvent } from '../events/Types';

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: (!isLambda && process.env.DYNAMODB_ENDPOINT) ? process.env.DYNAMODB_ENDPOINT : undefined,
    credentials: (!isLambda && process.env.DYNAMODB_ENDPOINT) ? {
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
    } : undefined
});

console.log('EventStore Client Configured with Endpoint:', process.env.DYNAMODB_ENDPOINT || 'default (AWS)');
const TABLE_NAME = process.env.EVENT_STORE_TABLE || 'finance-agent-events';

export class EventStore {
    async save(event: DomainEvent): Promise<void> {
        const params = {
            TableName: TABLE_NAME,
            Item: marshall({
                aggregateId: event.aggregateId,
                timestamp: event.timestamp,
                eventId: event.eventId,
                type: event.type,
                payload: event.payload,
            }, { removeUndefinedValues: true }),
        };

        try {
            console.log('EventStore Client Configured with Endpoint:', client.config.endpoint);
            await client.send(new PutItemCommand(params));
            console.log(`Event saved: ${event.eventId}`);
        } catch (error) {
            console.error('Error saving event:', error);
            throw error;
        }
    }

    async getEvents(aggregateId: string): Promise<DomainEvent[]> {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: 'aggregateId = :aid',
            ExpressionAttributeValues: marshall({
                ':aid': aggregateId,
            }, { removeUndefinedValues: true }),
        };

        try {
            const { Items } = await client.send(new QueryCommand(params));
            if (!Items) return [];

            const events = Items.map((item) => unmarshall(item) as DomainEvent);
            // Sort by timestamp
            return events.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }
}
