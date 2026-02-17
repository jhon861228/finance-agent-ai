export interface Transaction {
    from: string;
    to: string;
    amount: number;
}

export class DebtCalculator {
    static simplifyDebts(balances: Record<string, number>): Transaction[] {
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        // Separate into debtors and creditors
        Object.entries(balances).forEach(([id, amount]) => {
            if (amount < -0.01) debtors.push({ id, amount }); // Negative means they owe money
            else if (amount > 0.01) creditors.push({ id, amount }); // Positive means they are owed
        });

        // Sort by magnitude (heuristic for better simplification)
        debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
        creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

        const transactions: Transaction[] = [];
        let i = 0; // debtors index
        let j = 0; // creditors index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            // The amount to settle is the minimum of what debtor owes and what creditor is owed
            const amount = Math.min(-debtor.amount, creditor.amount);

            // Round to 2 decimals to avoid floating point issues
            const roundedAmount = Math.round(amount * 100) / 100;

            if (roundedAmount > 0) {
                transactions.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount: roundedAmount
                });
            }

            // Adjust remaining amounts
            debtor.amount += amount;
            creditor.amount -= amount;

            // Move indices if settled (within small epsilon)
            if (Math.abs(debtor.amount) < 0.01) i++;
            if (Math.abs(creditor.amount) < 0.01) j++;
        }

        return transactions;
    }
}
