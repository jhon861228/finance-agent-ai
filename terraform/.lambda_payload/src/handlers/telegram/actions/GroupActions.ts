import { ActionContext, TelegramAction } from '../Action';
import { QueryService } from '../../../core/QueryService';
import { CommandProcessor } from '../../../core/CommandProcessor';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export class GroupActions implements TelegramAction {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async execute(context: ActionContext): Promise<void> {
        const { text, chatId, userId, userName, telegramId, payload } = context;

        if (text.startsWith('/newgroup')) {
            await this.handleNewGroup(chatId, text, userId, userName, telegramId);
        } else if (text.startsWith('/groups')) {
            await this.handleListGroups(chatId, userId);
        } else if (text.startsWith('/addmember')) {
            await this.handleAddMember(chatId, text, userId);
        } else if (payload?.intent === 'ListGroups') {
            await this.handleListGroups(chatId, userId);
        }
    }

    private async handleNewGroup(chatId: number, text: string, userId: string, userName: string, telegramId: number) {
        const groupName = text.replace('/newgroup', '').trim();
        if (!groupName) {
            await this.sendMessage(chatId, 'Por favor, dime el nombre del grupo. Ej: `/newgroup Viaje`');
            return;
        }

        const commandPayload = {
            commandId: uuidv4(),
            type: 'CreateGroup' as const,
            payload: {
                name: groupName,
                createdBy: userId,
                creatorName: userName,
                creatorTelegramId: telegramId
            }
        };

        await CommandProcessor.process(commandPayload);
        await this.sendMessage(chatId, `✅ Grupo "${groupName}" creado con éxito. Tú has sido añadido como administrador.`);
    }

    private async handleListGroups(chatId: number, userId: string) {
        const groups = await QueryService.getUserGroups(userId);
        if (groups.length === 0) {
            await this.sendMessage(chatId, "No perteneces a ningún grupo aún. Crea uno con /newgroup");
        } else {
            let msg = "👥 *Tus grupos:*\n\n";
            groups.forEach(g => {
                msg += `• *${g.name}* (${g.members.length} miembros)\n`;
            });
            await this.sendMessage(chatId, msg);
        }
    }

    private async handleAddMember(chatId: number, text: string, userId: string) {
        const parts = text.replace('/addmember', '').trim().split(' ');
        if (parts.length < 2) {
            await this.sendMessage(chatId, 'Uso: `/addmember <nombre_grupo> <nombre_persona>`');
            return;
        }

        const groupName = parts[0];
        const memberName = parts.slice(1).join(' ');

        const groups = await QueryService.getUserGroups(userId);
        const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());

        if (!group) {
            await this.sendMessage(chatId, `No he encontrado el grupo "${groupName}".`);
            return;
        }

        // Search for existing user by name
        const allUsers = await QueryService.listUsers();
        const matchingUsers = allUsers.filter(u => u.name.toLowerCase() === memberName.toLowerCase());

        if (matchingUsers.length > 1) {
            let msg = `⚠️ He encontrado varios usuarios con el nombre "${memberName}".\n` +
                `Por favor, usa el ID de Telegram para ser más específico:\n\n`;
            matchingUsers.forEach(u => {
                msg += `• *${u.name}* (Telegram ID: \`${u.telegramId || 'Sin ID'}\`)\n`;
            });
            await this.sendMessage(chatId, msg);
            return;
        }

        const existingUser = matchingUsers[0];

        const commandPayload = {
            commandId: uuidv4(),
            type: 'AddMember' as const,
            payload: {
                groupId: group.groupId,
                name: memberName,
                userId: existingUser?.userId // Pass the ID if they exist
            }
        };

        await CommandProcessor.process(commandPayload);
        const confirmMsg = existingUser
            ? `✅ ${memberName} (usuario detectado) ha sido añadido al grupo ${group.name}.`
            : `✅ ${memberName} (nuevo perfil) ha sido añadido al grupo ${group.name}.`;

        await this.sendMessage(chatId, confirmMsg);
    }

    private async sendMessage(chatId: number, text: string) {
        await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
    }
}
