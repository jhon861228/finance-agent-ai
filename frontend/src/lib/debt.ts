export interface Transaction {
    from: string;
    to: string;
    amount: number;
}

export function simplifyDebts(balances: Record<string, number>): Transaction[] {
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    // Separate into debtors and creditors
    Object.entries(balances).forEach(([id, amount]) => {
        if (amount < -0.01) debtors.push({ id, amount }); // Negative means they owe money
        else if (amount > 0.01) creditors.push({ id, amount }); // Positive means they are owed
    });

    // Sort by magnitude
    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: Transaction[] = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(-debtor.amount, creditor.amount);
        const roundedAmount = Math.round(amount * 100) / 100;

        if (roundedAmount > 0) {
            transactions.push({
                from: debtor.id,
                to: creditor.id,
                amount: roundedAmount
            });
        }

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return transactions;
}
