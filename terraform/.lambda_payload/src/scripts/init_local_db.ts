import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'us-east-1',
    credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
});

const createTables = async () => {
    try {
        // Event Store
        await client.send(new CreateTableCommand({
            TableName: 'finance-agent-events',
            KeySchema: [
                { AttributeName: 'aggregateId', KeyType: 'HASH' },
                { AttributeName: 'timestamp', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'aggregateId', AttributeType: 'S' },
                { AttributeName: 'timestamp', AttributeType: 'N' }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }));
        console.log('Created finance-agent-events');

        // Read Models
        await client.send(new CreateTableCommand({
            TableName: 'finance-agent-read-models',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' }
            ],
            AttributeDefinitions: [
                { AttributeName: 'pk', AttributeType: 'S' },
                { AttributeName: 'sk', AttributeType: 'S' }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }));
        console.log('Created finance-agent-read-models');

    } catch (e) {
        console.log('Tables might already exist', e);
    }
};

createTables();
