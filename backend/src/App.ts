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

// Allowed emails configured via Vercel feature flag or env var.
// Example (Vercel feature flag): VERCEL_ALLOWED_EMAILS="alice@example.com,bob@example.com"
const RAW_ALLOWED = process.env.VERCEL_ALLOWED_EMAILS || process.env.ALLOWED_EMAILS || '';
const ALLOWED_EMAILS = RAW_ALLOWED.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

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

// Email restriction middleware: if ALLOWED_EMAILS is empty, no restriction is applied.
const emailRestriction = async (req: Request, res: Response, next: any) => {
    if (!ALLOWED_EMAILS || ALLOWED_EMAILS.length === 0) return next();

    // Skip the telegram webhook always
    if (req.path === '/telegram') return next();

    // Allow preflight
    if (req.method === 'OPTIONS') return next();

    // Try header first
    const headerEmail = (req.header('X-User-Email') || '').toString().toLowerCase();
    if (headerEmail) {
        if (ALLOWED_EMAILS.includes(headerEmail)) return next();
        return res.status(403).json({ error: 'Access forbidden: email not allowed' });
    }

    // Try Authorization Bearer token and decode email claim if present
    const auth = req.header('Authorization');
    if (auth && auth.startsWith('Bearer ')) {
        try {
            const jwt = await import('jsonwebtoken');
            const token = auth.split(' ')[1];
            const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-key-for-dev';
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const email = (decoded?.email || decoded?.userEmail || decoded?.username || '').toString().toLowerCase();
            if (email && ALLOWED_EMAILS.includes(email)) return next();
            // If decoded contains username but username is not an email, fallthrough to forbid
            return res.status(403).json({ error: 'Access forbidden: email not allowed' });
        } catch (e) {
            return res.status(403).json({ error: 'Access forbidden: invalid token' });
        }
    }

    // No email info provided
    return res.status(403).json({ error: 'Access forbidden: no user email provided' });
};

app.use('/api', (req, res, next) => {
    if (req.path === '/telegram') return next();
    // First require API key (existing behavior)
    apiKeyAuth(req, res, (err?: any) => {
        if (err) return next(err);
        // Then apply email restriction (if configured)
        return emailRestriction(req, res, next);
    });
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
        let { amount, description, category, commandId } = req.body;

        if (!category || category.trim() === '') {
            try {
                const { LlmParser } = await import('./core/LlmParser');
                const llmResult = await LlmParser.parse(`Gasto: ${description}, Monto: ${amount}`, userId);
                if (llmResult && llmResult.category) {
                    category = llmResult.category;
                } else {
                    category = 'General';
                }
            } catch (llmError) {
                console.error('[LLM Error] Fallback to General:', llmError);
                category = 'General';
            }
        }

        const payload = { amount, description, category, userId };
        const command = {
            commandId: commandId || uuidv4(),
            type: 'RecordPersonalExpense',
            payload
        } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/personal/expenses/:userId/:expenseId', async (req: Request, res: Response) => {
    try {
        const command = {
            commandId: req.body?.commandId || uuidv4(),
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
        const { username, password, email, commandId } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        // If ALLOWED_EMAILS is configured, require email and check it
        if (ALLOWED_EMAILS.length > 0) {
            if (!email) return res.status(403).json({ error: 'Registration requires an allowed email address' });
            const low = (email || '').toString().toLowerCase();
            if (!ALLOWED_EMAILS.includes(low)) return res.status(403).json({ error: 'Registration forbidden: email not allowed' });
        }

        const existing = await QueryService.getUserByUsername(username);
        if (existing) return res.status(400).json({ error: 'Username already taken' });

        const command = {
            commandId: commandId || uuidv4(),
            type: 'CreateUser',
            payload: { name: username, password, email }
        } as Command;
        const result = await CommandProcessor.process(command);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        const { username, password, email: providedEmail } = req.body;
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
        // Prefer explicit provided email (if any), otherwise try to include user's email if present in record
        const emailToInclude = providedEmail || (user as any).email || undefined;
        const tokenPayload: any = { userId: user.userId, username: user.name };
        if (emailToInclude) tokenPayload.email = emailToInclude;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { userId: user.userId, name: user.name } });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups', async (req: Request, res: Response) => {
    try {
        const { name, createdBy, userName, telegramId } = req.body;
        const command: Command = {
            commandId: uuidv4(),
            type: 'CreateGroup',
            payload: { name, createdBy, userName, telegramId }
        };
        const result = await CommandProcessor.process(command);
        // Delay to allow projection to finish for immediate visibility
        await new Promise(resolve => setTimeout(resolve, 1000));
        res.json(result);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups/:groupId/members', async (req: Request, res: Response) => {
    try {
        const { groupId } = req.params;
        const { name, userId } = req.body;
        const command: Command = {
            commandId: uuidv4(),
            type: 'AddMember',
            payload: { groupId, name, userId }
        };
        const result = await CommandProcessor.process(command);
        // Delay to allow projection to finish for immediate visibility
        await new Promise(resolve => setTimeout(resolve, 1000));
        res.json(result);
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
