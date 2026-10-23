import { getCurrencySymbol } from '@/data/currencies';

export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatCurrencyText(amount: number, currencyCode: string = 'INR'): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currencyCode} ${formatted}`;
}
