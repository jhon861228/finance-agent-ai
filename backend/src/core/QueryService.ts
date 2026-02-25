import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GroupQueryRepository } from './queries/GroupQueryRepository';
import { UserQueryRepository } from './queries/UserQueryRepository';
import { TelegramQueryRepository } from './queries/TelegramQueryRepository';

export interface GroupDetails {
    groupId: string;
    name: string;
    createdAt: number;
    members: any[];
    expenses: any[];
    balances: any[];
    debts?: any[];
    settlements?: any[];
}

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    credentials: process.env.DYNAMODB_ENDPOINT ? {
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
    } : undefined,
});
const TABLE_NAME = process.env.READ_MODELS_TABLE || 'finance-agent-read-models';

// Repositorios por dominio
const groupRepo = new GroupQueryRepository(client, TABLE_NAME);
const userRepo = new UserQueryRepository(client, TABLE_NAME);
const telegramRepo = new TelegramQueryRepository(client, TABLE_NAME);

/**
 * Fachada que mantiene la API pública original y delega en los repositorios
 * especializados por dominio.
 */
export class QueryService {
    // ─── Grupos ──────────────────────────────────────────────────────────────

    static async getGroupDetails(groupId: string) {
        return groupRepo.getGroupDetails(groupId);
    }

    static async listGroups() {
        return groupRepo.listGroups();
    }

    static async getGroupMembers(groupId: string) {
        return groupRepo.getGroupMembers(groupId);
    }

    static async getUserGroups(userId: string) {
        return groupRepo.getUserGroups(userId);
    }

    // ─── Usuarios y gastos personales ────────────────────────────────────────

    static async getUserByUsername(username: string) {
        return userRepo.getUserByUsername(username);
    }

    static async getUserByTelegramId(telegramId: string) {
        return userRepo.getUserByTelegramId(telegramId);
    }

    static async listUsers() {
        return userRepo.listUsers();
    }

    static async getPersonalExpenses(userId: string) {
        return userRepo.getPersonalExpenses(userId);
    }

    // ─── Telegram linking & usage ────────────────────────────────────────────

    static async generateLinkingCode(userId: string) {
        return telegramRepo.generateLinkingCode(userId);
    }

    static async consumeLinkingCode(code: string) {
        return telegramRepo.consumeLinkingCode(code);
    }

    static async getDailyUsage(userId: string, dateStr: string) {
        return telegramRepo.getDailyUsage(userId, dateStr);
    }

    static async incrementDailyUsage(userId: string, dateStr: string) {
        return telegramRepo.incrementDailyUsage(userId, dateStr);
    }
}
