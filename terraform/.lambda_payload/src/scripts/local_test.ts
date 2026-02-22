// Set env vars for local testing
process.env.EVENT_STORE_TABLE = 'finance-agent-events';
process.env.READ_MODELS_TABLE = 'finance-agent-read-models';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
// Mock AWS credentials and endpoint for local DynamoDB
process.env.AWS_ACCESS_KEY_ID = 'fake';
process.env.AWS_SECRET_ACCESS_KEY = 'fake';
// We need to monkey-patch the DynamoDBClient in the source code or use a factory that checks env
// For this script, we'll rely on the fact that if we use the constructor without args in src, it picks up env vars.
// But we need to set the endpoint to localhost:8000. 
// Since we can't easily change the imported instances, we'll try to use a mock execution.


import { handler as commandHandler } from '../core/CommandProcessor';
import { handler as streamHandler } from '../core/StreamProcessor';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// NOTE: To make this work against localhost, the code in src/ needs to be able to accept an endpoint override
// or we assume the user runs this with AWS_ENDPOINT_URL=http://localhost:8000 (standard SDK v3 feature)

const runTest = async () => {
    console.log('--- Starting Local Test ---');

    // 1. Create Group
    console.log('1. Creating Group...');
    const createGroupEvent: any = {
        body: JSON.stringify({
            type: 'CreateGroup',
            payload: { name: 'Test Trip', createdBy: 'User1' }
        })
    };

    const createRes: any = await commandHandler(createGroupEvent, {} as any, {} as any);
    const createBody = JSON.parse(createRes.body);
    const groupId = createBody.groupId;
    console.log('   Group Created:', groupId);

    // 3. Add Expense
    console.log('2. Adding Expense...');
    const addExpenseEvent: any = {
        body: JSON.stringify({
            type: 'AddExpense', // "AddMember" needs to happen first strictly speaking for the logic "Payer must be member"
            payload: {
                groupId,
                payerId: 'User1',
                amount: 50,
                description: 'Lunch',
                splitDetails: {}
            }
        })
    };

    // Setup User1 as member first (bypass command processor validation for a sec or fix it)
    // Actually the Aggregate logic "addExpense" throws if payer not member.
    // We need to add member.

    const addMemberEvent: any = {
        body: JSON.stringify({
            type: 'AddMember',
            payload: { groupId, userId: 'User1', name: 'Alice' }
        })
    };
    await commandHandler(addMemberEvent, {} as any, {} as any);
    console.log('   Member Alice Added');

    const expenseRes: any = await commandHandler(addExpenseEvent, {} as any, {} as any);
    console.log('   Expense Added:', expenseRes.statusCode);

    // 4. Simulate Stream Processing (since Lambda/DynamoStream won't trigger automatically locally)
    // We'll read the EventStore and manually invoke StreamProcessor
    console.log('3. Simulating Stream Processing...');

    // Get all events
    const client = new DynamoDBClient({ endpoint: 'http://localhost:8000', region: 'us-east-1', credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' } });
    const { Items } = await client.send(new ScanCommand({ TableName: 'finance-agent-events' }));

    if (Items) {
        for (const item of Items) {
            // Construct a DynamoDBStreamEvent record mock
            const record: any = {
                eventName: 'INSERT',
                dynamodb: {
                    NewImage: item
                }
            };
            await streamHandler({ Records: [record] } as any, {} as any, () => { });
        }
    }

    // 5. Verify Read Model
    console.log('4. Verifying Read Models...');
    const { Items: readItems } = await client.send(new ScanCommand({ TableName: 'finance-agent-read-models' }));
    readItems?.forEach(item => console.log('   ReadModel:', unmarshall(item)));

    console.log('--- Test Completed ---');
};

runTest();
