export interface Command { commandId: string; type: 'CreateGroup' | 'AddMember' | 'AddExpense'; payload: any; }
