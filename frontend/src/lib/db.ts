const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.PUBLIC_API_KEY || 'default-secret-key';

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options.headers as any,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export interface User {
    userId: string;
    name: string;
    telegramId: string;
    totalSpent?: number;
}

export interface Expense {
    expenseId: string;
    amount: number;
    description: string;
    category: string;
    timestamp: number;
    payerId?: string;
    source?: string; // Add source for combined lists
}

export interface Group {
    groupId: string;
    name: string;
    members: User[];
    expenses: Expense[];
    balances: { userId: string; paidAmount: number; netBalance?: number }[];
    totalSpent?: number;
    memberCount?: number;
    settlements?: { from: string; to: string; amount: number }[];
}

export async function getUserByUsername(username: string, token?: string): Promise<User | null> {
    if (!username) return null;
    return apiFetch(`/api/users/by-username/${encodeURIComponent(username)}`, {}, token);
}

export async function getPersonalExpenses(userId: string, token?: string): Promise<Expense[]> {
    const expenses = await apiFetch(`/api/personal/expenses/${userId}`, {}, token);
    return (expenses || []).map((e: any) => ({
        ...e,
        source: 'Personal'
    }));
}

export async function getUserGroups(userId: string, token?: string): Promise<Group[]> {
    return apiFetch(`/api/users/${userId}/groups`, {}, token) || [];
}

export async function getGroupDetails(groupId: string, token?: string): Promise<Group | null> {
    return apiFetch(`/api/groups/${groupId}`, {}, token);
}

export async function generateLinkingCode(userId: string, token?: string): Promise<string | null> {
    const response = await apiFetch(`/api/users/${userId}/link-code`, { method: 'POST' }, token);
    return response?.code || null;
}
