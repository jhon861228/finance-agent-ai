import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { CommandProcessor, Command } from './core/CommandProcessor';
import { QueryService } from './core/QueryService';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const API_KEY = process.env.API_KEY || 'default-secret-key';

console.log('Environment Debug:');
console.log('DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
console.log('AWS_REGION:', process.env.AWS_REGION);

app.use(cors());
app.use(bodyParser.json());

// API Key Middleware
const apiKeyAuth = (req: Request, res: Response, next: any) => {
    const providedKey = req.header('X-API-Key');
    if (!providedKey || providedKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

// Apply security to all /api routes except telegram (to allow bot webhooks without complicating bot settings for now)
app.use('/api', (req, res, next) => {
    if (req.path === '/telegram') return next();
    return apiKeyAuth(req, res, next);
});

// Routes using the same logic as Lambda
app.post('/api/commands', async (req: Request, res: Response) => {
    try {
        const command = req.body as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// QUERY ROUTES
app.get('/api/users/by-username/:username', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.getUserByUsername(req.params.username as string);
        if (!result) return res.status(404).json({ error: 'User not found' });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:userId/groups', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.getUserGroups(req.params.userId as string);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/groups/:groupId', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.getGroupDetails(req.params.groupId as string);
        if (!result) {
            res.status(404).json({ error: 'Group not found' });
        } else {
            res.json(result);
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/groups', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.listGroups();
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/groups/:groupId/members', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.getGroupMembers(req.params.groupId as string);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/personal/expenses/:userId', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.getPersonalExpenses(req.params.userId as string);
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Rest of routes... (keeping original structure for brevity)
app.post('/api/personal/expenses/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const payload = { ...req.body, userId };
        const command = { commandId: uuidv4(), type: 'RecordPersonalExpense', payload } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/personal/expenses/:userId/:expenseId', async (req: Request, res: Response) => {
    try {
        const command = {
            commandId: uuidv4(),
            type: 'DeletePersonalExpense',
            payload: { userId: req.params.userId as string, expenseId: req.params.expenseId as string }
        } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', async (req: Request, res: Response) => {
    try {
        const result = await QueryService.listUsers();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const existing = await QueryService.getUserByUsername(username);
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const command = { commandId: uuidv4(), type: 'CreateUser', payload: { name: username, password } } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const user = await QueryService.getUserByUsername(username);
        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const bcrypt = await import('bcrypt');
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-key-for-dev';
        const token = jwt.sign({ userId: user.userId, username: user.name }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { userId: user.userId, name: user.name } });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const command = { commandId: uuidv4(), type: 'CreateUser', payload: req.body } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/:userId/link-code', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const code = await QueryService.generateLinkingCode(userId);
        res.json({ code });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Telegram Webhook (No security required here usually, but path is excluded above)
app.post('/api/telegram', async (req: Request, res: Response) => {
    try {
        const { TelegramHandler } = await import('./handlers/TelegramHandler');
        await TelegramHandler.handle(req.body);
        res.status(200).send('OK');
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
