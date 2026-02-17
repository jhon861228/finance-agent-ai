import { DynamoDBStreamHandler } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Projector } from './Projector';
import { DomainEvent } from '../events/Types';

const projector = new Projector();

export class StreamProcessor {
    static async process(event: any) {
        for (const record of event.Records) {
            if (record.eventName === 'INSERT' && record.dynamodb?.NewImage) {
                try {
                    // Unmarshall the DynamoDB JSON format to standard JSON
                    const domainEvent = unmarshall(record.dynamodb.NewImage as any) as DomainEvent;

                    console.log(`Processing event: ${domainEvent.eventId} (${domainEvent.type})`);

                    await projector.handle(domainEvent);

                } catch (error) {
                    console.error('Error processing stream record:', error);
                    // We might want to DLQ this in production, but for now just log
                }
            }
        }
    }
}

export const handler: DynamoDBStreamHandler = async (event) => {
    await StreamProcessor.process(event);
};
