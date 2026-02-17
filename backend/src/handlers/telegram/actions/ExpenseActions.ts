import { ActionContext, TelegramAction } from '../Action';
import { QueryService } from '../../../core/QueryService';
import { CommandProcessor } from '../../../core/CommandProcessor';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export class ExpenseActions implements TelegramAction {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async execute(context: ActionContext): Promise<void> {
        const { payload, chatId, userId } = context;

        if (payload?.intent === 'RetrieveExpenses') {
            await this.handleRetrieveExpenses(chatId, userId, payload);
        } else if (payload?.intent === 'RecordExpense' || payload?.amount) {
            await this.handleRecordExpense(chatId, userId, payload);
        }
    }

    private async handleRetrieveExpenses(chatId: number, userId: string, payload: any) {
        let expenses: any[] = [];
        let title = "";
        const scope = payload.scope || 'personal';

        if (scope === 'group' && payload.groupName) {
            const groups = await QueryService.getUserGroups(userId);
            const group = groups.find(g => g.name.toLowerCase() === payload.groupName.toLowerCase());
            if (!group) {
                await this.sendMessage(chatId, `No he encontrado el grupo "${payload.groupName}".`);
                return;
            }
            expenses = group.expenses.map((e: any) => ({ ...e, source: group.name }));
            title = `📋 *Gastos del grupo ${group.name}:*\n\n`;
        } else if (scope === 'all') {
            const personal = await QueryService.getPersonalExpenses(userId);
            expenses = personal.map(e => ({ ...e, source: 'Personal' }));

            const groups = await QueryService.getUserGroups(userId);
            for (const group of groups) {
                const groupExpenses = group.expenses.map((e: any) => ({ ...e, source: group.name }));
                expenses = expenses.concat(groupExpenses);
            }
            expenses.sort((a, b) => b.timestamp - a.timestamp);
            title = `📋 *Todos tus gastos (Personal + Grupos):*\n\n`;
        } else {
            const personal = await QueryService.getPersonalExpenses(userId);
            expenses = personal.map(e => ({ ...e, source: 'Personal' }));
            title = `📋 *Tus gastos personales:*\n\n`;
        }

        if (expenses.length === 0) {
            await this.sendMessage(chatId, "No se han encontrado gastos en este criterio.");
        } else {
            let message = title;
            expenses.slice(0, 15).forEach((exp: any) => {
                const date = new Date(exp.timestamp).toLocaleDateString();
                const source = scope === 'all' ? ` _[${exp.source}]_` : "";
                message += `• ${date}: *${exp.amount}* en _${exp.description}_${source}\n`;
            });

            if (expenses.length > 15) message += "\n_Mostrando los últimos 15._";

            const total = expenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
            message += `\n\n💰 *Total:* ${total.toFixed(2)}`;

            await this.sendMessage(chatId, message);
        }
    }

    private async handleRecordExpense(chatId: number, userId: string, payload: any) {
        let group = null;
        if (payload.groupName) {
            const groups = await QueryService.getUserGroups(userId);
            group = groups.find(g => g.name.toLowerCase() === payload.groupName.toLowerCase());
        }

        const commandPayload = {
            commandId: uuidv4(),
            type: group ? 'AddExpense' as const : 'RecordPersonalExpense' as const,
            payload: {
                aggregateId: group ? group.groupId : userId,
                payerId: userId,
                amount: payload.amount,
                description: payload.description || 'Gasto sin descripción',
                category: payload.category || 'Varios'
            }
        };

        await CommandProcessor.process(commandPayload);
        const msg = group
            ? `✅ Registrado: ${payload.amount} en ${payload.description} (Grupo: ${group.name})`
            : `✅ Registrado: ${payload.amount} en ${payload.description} (Personal)`;

        await this.sendMessage(chatId, msg);
    }

    private async sendMessage(chatId: number, text: string) {
        await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
    }
}
