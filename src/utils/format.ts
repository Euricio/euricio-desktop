export function formatDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp * 1000));
}

export function formatCurrency(amount: number, locale: string, currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
