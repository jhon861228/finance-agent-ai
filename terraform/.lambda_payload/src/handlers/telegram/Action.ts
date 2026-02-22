export interface ActionContext {
    chatId: number;
    userId: string;
    userName: string;
    telegramId: number;
    text: string;
    payload?: any;
}

export interface TelegramAction {
    execute(context: ActionContext): Promise<void>;
}
