export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.symbol || '₹';
}

export function getCurrencyName(code: string): string {
  const currency = CURRENCIES.find(c => c.code === code);
  return currency?.name || code;
}

export function formatCurrencyText(amount: number, currencyCode: string = 'INR'): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currencyCode} ${formatted}`;
}
