// Set env vars for local testing
process.env.EVENT_STORE_TABLE = 'finance-agent-events';
process.env.READ_MODELS_TABLE = 'finance-agent-read-models';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID = 'fake';
process.env.AWS_SECRET_ACCESS_KEY = 'fake';

import { handler as commandHandler } from '../core/CommandProcessor';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const runScenario = async () => {
    console.log('--- Starting E2E Scenario: Jhon & Yuly ---');
    const client = new DynamoDBClient({
        endpoint: 'http://localhost:8000',
        region: 'us-east-1',
        credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
    });

    // Utility to call command handler
    const callCommand = async (type: string, payload: any) => {
        const res: any = await commandHandler({
            body: JSON.stringify({ type, payload })
        } as any, {} as any, {} as any);
        return JSON.parse(res.body);
    };

    // 1. Create User Jhon
    console.log('1. Creating user Jhon...');
    const jhonRes = await callCommand('CreateUser', { name: 'Jhon', telegramId: '12345' });
    const jhonId = jhonRes.aggregateId;
    console.log(`   Jhon created with ID: ${jhonId}`);

    // 2. Create User Yuly
    console.log('2. Creating user Yuly...');
    const yulyRes = await callCommand('CreateUser', { name: 'Yuly', telegramId: '67890' });
    const yulyId = yulyRes.aggregateId;
    console.log(`   Yuly created with ID: ${yulyId}`);

    // 3. Jhon adds personal expense
    console.log('3. Jhon adds a personal expense...');
    await callCommand('RecordPersonalExpense', {
        userId: jhonId,
        amount: 30,
        category: 'Food',
        description: 'Jhon lunch'
    });

    // 4. Yuly adds personal expense
    console.log('4. Yuly adds a personal expense...');
    await callCommand('RecordPersonalExpense', {
        userId: yulyId,
        amount: 45,
        category: 'Transport',
        description: 'Yuly uber'
    });

    // 5. Jhon creates group "Casa"
    console.log('5. Jhon creates group "Casa"...');
    const groupRes = await callCommand('CreateGroup', {
        name: 'Casa',
        createdBy: jhonId,
        creatorName: 'Jhon',
        creatorTelegramId: '12345'
    });
    const groupId = groupRes.groupId;
    console.log(`   Group "Casa" created with ID: ${groupId}`);

    // 6. Jhon adds Yuly to "Casa"
    console.log('6. Adding Yuly to group "Casa"...');
    await callCommand('AddMember', {
        groupId,
        userId: yulyId,
        name: 'Yuly',
        telegramId: '67890'
    });

    // 7. Jhon adds expense to group
    console.log('7. Jhon adds a group expense...');
    await callCommand('AddExpense', {
        groupId,
        payerId: jhonId,
        amount: 100,
        description: 'Groceries',
        splitDetails: {} // Default split
    });

    // 8. Yuly adds expense to group
    console.log('8. Yuly adds a group expense...');
    await callCommand('AddExpense', {
        groupId,
        payerId: yulyId,
        amount: 80,
        description: 'Electricity',
        splitDetails: {}
    });

    console.log('\n--- Scenario Execution Complete ---');

    // Verification
    console.log('--- Verification: Read Models ---');
    const { Items } = await client.send(new ScanCommand({ TableName: 'finance-agent-read-models' }));
    if (Items) {
        console.log(`Found ${Items.length} read model items:`);
        // Filter some interesting ones
        const models = Items.map(i => unmarshall(i));

        console.log('\n[Users]');
        models.filter(m => m.sk === 'METADATA' && m.pk.startsWith('USER#'))
            .forEach(u => console.log(` - ${u.name} (${u.pk})`));

        console.log('\n[Groups]');
        models.filter(m => m.sk === 'METADATA' && m.pk.startsWith('GROUP#'))
            .forEach(g => console.log(` - ${g.name} (${g.pk})`));

        console.log('\n[Group Members]');
        models.filter(m => m.sk.startsWith('MEMBER#') && m.pk.startsWith('GROUP#'))
            .forEach(m => console.log(` - Group ${m.pk} has member ${m.name}`));

        console.log('\n[Expenses]');
        models.filter(m => m.sk.startsWith('EXPENSE#'))
            .forEach(e => console.log(` - ${e.pk}/${e.sk}: ${e.description} ($${e.amount})`));
    }

    console.log('\n--- E2E Test Finished ---');
};

runScenario().catch(err => {
    console.error('Scenario failed:', err);
});
