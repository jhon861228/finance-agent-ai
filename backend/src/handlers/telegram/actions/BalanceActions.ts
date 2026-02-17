import { ActionContext, TelegramAction } from '../Action';
import { QueryService } from '../../../core/QueryService';
import axios from 'axios';

export class BalanceActions implements TelegramAction {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async execute(context: ActionContext): Promise<void> {
        const { payload, chatId, userId } = context;

        if (payload?.intent === 'GetGroupBalances' && payload.groupName) {
            await this.handleGetGroupBalances(chatId, userId, payload.groupName);
        }
    }

    private async handleGetGroupBalances(chatId: number, userId: string, groupName: string) {
        const groups = await QueryService.getUserGroups(userId);
        const groupSummary = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());

        if (!groupSummary) {
            await this.sendMessage(chatId, `No he encontrado el grupo "${groupName}".`);
            return;
        }

        const group = await QueryService.getGroupDetails(groupSummary.groupId);
        if (!group) {
            await this.sendMessage(chatId, `No he podido cargar los detalles del grupo "${groupName}".`);
            return;
        }

        let message = `📊 *Resumen de cuentas: ${group.name}*\n\n`;

        message += `📝 *Últimos pagos:*\n`;
        if (group.expenses.length === 0) {
            message += `_No hay gastos registrados._\n`;
        } else {
            group.expenses.slice(-10).forEach(exp => {
                const payer = group.members.find(m => m.userId === exp.payerId)?.name || 'Desconocido';
                message += `• ${payer}: *${exp.amount}* en _${exp.description}_\n`;
            });
        }

        const total = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        message += `\n💰 *Total gastado:* ${total.toFixed(2)}\n\n`;

        message += `🤝 *Quién debe a quién:*\n`;
        if (group.debts && group.debts.length > 0) {
            group.debts.forEach(debt => {
                const from = group.members.find(m => m.userId === debt.from)?.name || 'Alguien';
                const to = group.members.find(m => m.userId === debt.to)?.name || 'Alguien';
                message += `• *${from}* debe a *${to}* 👉 *${debt.amount.toFixed(2)}*\n`;
            });
        } else {
            message += `_¡Cuentas claras! Nadie debe a nadie._\n`;
        }

        await this.sendMessage(chatId, message);
    }

    private async sendMessage(chatId: number, text: string) {
        await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
    }
}
