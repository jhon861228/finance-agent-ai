# API Examples

This document provides CURL examples for the Finance Agent AI API.

## Groups

### List All Groups
```bash
curl http://localhost:3000/api/groups
```

### Create a Group
```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CreateGroup",
    "payload": {
      "name": "Housemates",
      "createdBy": "Alice"
    }
  }'
```

### Get Group Details
```bash
curl http://localhost:3000/api/groups/HOUSE_GROUP_ID
```

### Add a Member to a Group
```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "AddMember",
    "payload": {
      "groupId": "HOUSE_GROUP_ID",
      "name": "Bob",
      "telegramId": "987654321"
    }
  }'
```

### Add a Group Expense
```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "AddExpense",
    "payload": {
      "groupId": "HOUSE_GROUP_ID",
      "payerId": "ALICE_USER_ID",
      "amount": 60,
      "description": "Internet Bill",
      "splitDetails": { "type": "EQUAL" }
    }
  }'
```

### Settle Debts
```bash
curl -X POST http://localhost:3000/api/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "SettleDebts",
    "payload": {
      "groupId": "HOUSE_GROUP_ID",
      "transactions": [
        { "from": "BOB_USER_ID", "to": "ALICE_USER_ID", "amount": 30 }
      ]
    }
  }'
```

## Users

### List All Users
```bash
curl http://localhost:3000/api/users
```

### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Charlie",
    "telegramId": "11223344"
  }'
```

## Personal Expenses

### Record a Personal Expense
```bash
curl -X POST http://localhost:3000/api/personal/expenses/USER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 12.50,
    "category": "Food",
    "description": "Coffee"
  }'
```

### Get Personal Expenses History
```bash
curl http://localhost:3000/api/personal/expenses/USER_ID
```

### Delete a Personal Expense
```bash
curl -X DELETE http://localhost:3000/api/personal/expenses/USER_ID/EXPENSE_ID
```

### Delete ALL Personal Expenses for a User
```bash
curl -X DELETE http://localhost:3000/api/personal/expenses/USER_ID
```

## Health

### Health Check
```bash
curl http://localhost:3000/health
```

## Telegram Simulation (Local Webhook)

Use these to test the bot logic without needing ngrok or a real bot.

### Simulate "/start" command
```bash
curl -X POST http://localhost:3000/api/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 1000,
    "message": {
      "message_id": 1,
      "from": { "id": 12345, "first_name": "Alice" },
      "chat": { "id": 12345, "type": "private" },
      "text": "/start"
    }
  }'
```

### Simulate "/newgroup" command
```bash
curl -X POST http://localhost:3000/api/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 1001,
    "message": {
      "message_id": 2,
      "from": { "id": 12345, "first_name": "Alice" },
      "chat": { "id": 12345, "type": "private" },
      "text": "/newgroup Trip2024"
    }
  }'
```

### Simulate an Expense (Natural Language)
```bash
curl -X POST http://localhost:3000/api/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 1002,
    "message": {
      "message_id": 3,
      "from": { "id": 12345, "first_name": "Alice" },
      "chat": { "id": 12345, "type": "private" },
      "text": "Yesterday I spent 25 USD on a taxi"
    }
  }'
```
