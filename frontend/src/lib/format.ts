export const formatAmount = (amount: number): string => {
    // 35000.00 -> 35.000
    // Use Spanish/Colombian format for dots as thousand separators
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};
