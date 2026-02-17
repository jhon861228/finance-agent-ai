import { ActionContext, TelegramAction } from '../Action';
import axios from 'axios';

export class HelpAction implements TelegramAction {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async execute(context: ActionContext): Promise<void> {
        const message = `📖 *Guía de Comandos:*\n\n` +
            `• /newgroup <nombre> - Crea un grupo.\n` +
            `• /groups - Lista tus grupos.\n` +
            `• /addmember <grupo> <nombre> - Añade a alguien.\n` +
            `• /help - Muestra esta ayuda.\n\n` +
            `*IA: Puedes hablarme normalmente:* \n\n` +
            `💰 *Registrar:* \n` +
            `• "Gasto 50 en comida"\n` +
            `• "100 en el grupo Viaje para Cena"\n\n` +
            `📋 *Consultar:* \n` +
            `• "¿En qué grupos estoy?"\n` +
            `• "Mis gastos personales"\n` +
            `• "Gastos del grupo Viaje"\n` +
            `• "Muéstrame todos mis gastos" (Personal + Grupos)\n\n` +
            `📊 *Balances y Cuentas:* \n` +
            `• "¿Quién debe a quién en Viaje?"\n` +
            `• "Resumen de cuentas del grupo Casa"`;

        await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            chat_id: context.chatId,
            text: message,
            parse_mode: 'Markdown'
        });
    }
}
