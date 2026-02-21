import { APIGatewayProxyHandler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const lambda = new LambdaClient({});

const getTelegramToken = () => process.env.TELEGRAM_BOT_TOKEN;
const COMMAND_PROCESSOR_NAME = process.env.COMMAND_PROCESSOR_NAME;
const LLM_PARSER_NAME = process.env.LLM_PARSER_NAME;

export class TelegramHandler {
    private static async sendMessage(chatId: number, text: string) {
        const token = getTelegramToken();
        try {
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: text,
            });
        } catch (e) {
            console.error('Failed to send telegram message', e);
        }
    }

    static async handle(body: any) {
        // Check if it's a message
        if (!body.message || !body.message.text) {
            return; // Ignore non-text updates
        }

        const chatId = body.message.chat.id;
        const telegramId = body.message.from.id.toString();
        const userName = body.message.from.first_name;
        const text = body.message.text as string;

        console.log(`[DEBUG] Received message from ${userName} (${telegramId}): "${text}"`);

        // Resolve or create system user
        const { QueryService } = await import('../core/QueryService');
        const { CommandProcessor } = await import('../core/CommandProcessor');

        let user = await QueryService.getUserByTelegramId(telegramId);
        if (!user) {
            console.log(`User not found for telegramId ${telegramId}. Creating...`);
            const createResult = await CommandProcessor.process({
                commandId: uuidv4(),
                type: 'CreateUser',
                payload: { name: userName, telegramId: telegramId }
            });
            user = { userId: createResult.aggregateId, name: userName, telegramId };
        }

        const userId = user.userId;
        console.log(`[DEBUG] Resolved User ID: ${userId}`);

        // 1. Handle Commands
        if (text.startsWith('/')) {
            if (text.startsWith('/start') || text.startsWith('/help')) {
                await this.sendMessage(chatId, `📖 *Comandos Disponibles:*\n\n` +
                    `• /newgroup <nombre> - Crea un nuevo grupo de gastos.\n` +
                    `• /groups - Lista los grupos a los que perteneces.\n` +
                    `• /addmember <grupo> <nombre> - Añade un miembro a un grupo.\n` +
                    `• /help - Muestra este mensaje de ayuda.\n\n` +
                    `*Conectar con la Web:*\n` +
                    `• /vincular <code> - Conecta tu cuenta con la web usando el código del dashboard.\n\n` +
                    `*También puedes hablarme normalmente:* \n` +
                    `• "Gasto 50 en comida"\n` +
                    `• "Gasto 100 en el grupo Viaje"\n` +
                    `• "Muéstrame mis gastos"\n` +
                    `• "¿En qué grupos estoy?"`);
            } else if (text.startsWith('/newgroup')) {
                const groupName = text.replace('/newgroup', '').trim();
                if (!groupName) {
                    await this.sendMessage(chatId, 'Por favor, dime el nombre del grupo. Ejemplo: /newgroup Viaje');
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
                await this.sendMessage(chatId, `✅ Grupo "${groupName}" creado con éxito.`);
            } else if (text.startsWith('/vincular')) {
                const code = text.replace('/vincular', '').trim();
                if (!code) {
                    await this.sendMessage(chatId, 'Por favor, introduce el código de vinculación. Ejemplo: /vincular B8X2');
                    return;
                }

                const webUserId = await QueryService.consumeLinkingCode(code);
                if (!webUserId) {
                    await this.sendMessage(chatId, '❌ El código introducido no es válido o ha expirado.');
                    return;
                }

                const commandPayload = {
                    commandId: uuidv4(),
                    type: 'LinkTelegram' as const,
                    payload: {
                        userId: webUserId,
                        telegramId: telegramId
                    }
                };

                await CommandProcessor.process(commandPayload);
                await this.sendMessage(chatId, `✅ ¡Excelente! Tu cuenta de Telegram ha sido vinculada correctamente a tu perfil Web.`);
            } else if (text.startsWith('/groups')) {
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
            } else if (text.startsWith('/addmember')) {
                const parts = text.split(' ');
                if (parts.length < 3) {
                    await this.sendMessage(chatId, 'Uso: /addmember <nombre_grupo> <nombre_persona>');
                    return;
                }
                const groupName = parts[1];
                const memberName = parts.slice(2).join(' ');

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
            return;
        }

        // 2. Handle Natural Language (Expenses and Queries)
        const { LlmParser } = await import('../core/LlmParser');
        const parsedData = await LlmParser.parse(text);

        if (parsedData) {
            if (parsedData.intent === 'ListGroups') {
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
            } else if (parsedData.intent === 'RetrieveExpenses') {
                let expenses: any[] = [];
                let title = "";
                const scope = parsedData.scope || 'personal';

                if (scope === 'group' && parsedData.groupName) {
                    const groups = await QueryService.getUserGroups(userId);
                    const group = groups.find(g => g.name.toLowerCase() === parsedData.groupName.toLowerCase());
                    if (!group) {
                        await this.sendMessage(chatId, `No he encontrado el grupo "${parsedData.groupName}".`);
                        return;
                    }
                    expenses = group.expenses.map(e => ({ ...e, source: group.name }));
                    title = `📋 *Gastos del grupo ${group.name}:*\n\n`;
                } else if (scope === 'all') {
                    const personal = await QueryService.getPersonalExpenses(userId);
                    expenses = personal.map(e => ({ ...e, source: 'Personal' }));

                    const groups = await QueryService.getUserGroups(userId);
                    for (const group of groups) {
                        const groupExpenses = group.expenses.map(e => ({ ...e, source: group.name }));
                        expenses = expenses.concat(groupExpenses);
                    }
                    expenses.sort((a, b) => b.timestamp - a.timestamp);
                    title = `📋 *Todos tus gastos (Personal + Grupos):*\n\n`;
                } else {
                    // Default: Personal
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
            } else if (parsedData.intent === 'GetGroupBalances' && parsedData.groupName) {
                const groups = await QueryService.getUserGroups(userId);
                const groupSummary = groups.find(g => g.name.toLowerCase() === parsedData.groupName.toLowerCase());

                if (!groupSummary) {
                    await this.sendMessage(chatId, `No he encontrado el grupo "${parsedData.groupName}".`);
                    return;
                }

                const group = await QueryService.getGroupDetails(groupSummary.groupId);
                if (!group) {
                    await this.sendMessage(chatId, `No he podido cargar los detalles del grupo "${parsedData.groupName}".`);
                    return;
                }

                let message = `📊 *Resumen de cuentas: ${group.name}*\n\n`;

                // 1. Detailed Expenses
                message += `📝 *Últimos pagos:*\n`;
                if (group.expenses.length === 0) {
                    message += `_No hay gastos registrados._\n`;
                } else {
                    group.expenses.slice(-10).forEach(exp => {
                        const payer = group.members.find(m => m.userId === exp.payerId)?.name || 'Desconocido';
                        message += `• ${payer}: *${exp.amount}* en _${exp.description}_\n`;
                    });
                }

                // 2. Total
                const total = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                message += `\n💰 *Total gastado:* ${total.toFixed(2)}\n\n`;

                // 3. Debts (Simplification)
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

            } else if (parsedData.intent === 'RecordExpense' || parsedData.amount) {
                // Check if it's for a group
                let group = null;
                if (parsedData.groupName) {
                    const groups = await QueryService.getUserGroups(userId);
                    group = groups.find(g => g.name.toLowerCase() === parsedData.groupName.toLowerCase());
                }

                if (group) {
                    // Record Group Expense
                    const memberCount = group.members.length;
                    const splitAmount = parsedData.amount / memberCount;
                    const splitDetails = group.members.map((m: any) => ({
                        userId: m.userId,
                        amount: splitAmount
                    }));

                    const commandPayload = {
                        commandId: uuidv4(),
                        type: 'AddExpense' as const,
                        payload: {
                            groupId: group.groupId,
                            payerId: userId,
                            amount: parsedData.amount,
                            description: parsedData.description || 'Gasto grupal',
                            splitDetails
                        }
                    };

                    await CommandProcessor.process(commandPayload);
                    await this.sendMessage(chatId, `✅ Gasto de *${parsedData.amount}* registrado en el grupo *${group.name}*.\n` +
                        `Dividido entre ${memberCount} personas (${splitAmount.toFixed(2)} c/u).`);

                } else {
                    // Record Personal Expense
                    const commandPayload = {
                        commandId: uuidv4(),
                        type: 'RecordPersonalExpense' as const,
                        payload: {
                            userId,
                            amount: parsedData.amount,
                            category: parsedData.category || 'General',
                            description: parsedData.description || 'Gasto sin descripción'
                        }
                    };

                    await CommandProcessor.process(commandPayload);
                    await this.sendMessage(chatId, `✅ Gasto personal registrado: *${parsedData.amount}* en _${parsedData.description}_`);
                }
            } else {
                console.warn(`[DEBUG] Unknown intent or missing data: ${JSON.stringify(parsedData)}`);
                await this.sendMessage(chatId, "No estoy seguro de qué quieres hacer. ¿Quieres registrar un gasto o ver tus gastos?");
            }
        } else {
            console.error(`[DEBUG] LLM Parser returned null for text: "${text}"`);
            await this.sendMessage(chatId, "Lo siento, no he podido entender tu mensaje.");
        }
    }
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        await TelegramHandler.handle(body);
        return { statusCode: 200, body: 'OK' };
    } catch (error) {
        console.error('Telegram Handler Error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};
