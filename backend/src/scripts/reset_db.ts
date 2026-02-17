import { DynamoDBClient, DeleteTableCommand, CreateTableCommand, CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'us-east-1',
    credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
});

const tables: CreateTableCommandInput[] = [
    {
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
    },
    {
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
    }
];

const reset = async () => {
    for (const table of tables) {
        try {
            console.log(`Deleting ${table.TableName}...`);
            await client.send(new DeleteTableCommand({ TableName: table.TableName }));
        } catch (e) {
            console.log(`${table.TableName} might not exist, skipping deletion.`);
        }
    }

    console.log('Waiting for deletion to settle...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (const table of tables) {
        try {
            console.log(`Creating ${table.TableName}...`);
            await client.send(new CreateTableCommand(table));
            console.log(`Created ${table.TableName}`);
        } catch (e) {
            console.error(`Error creating ${table.TableName}:`, e);
        }
    }
    console.log('Database reset complete! 🚀');
};

reset();
