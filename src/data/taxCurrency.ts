/** Pure currency helpers — country fiscal data lives in the DB via catalog. */

export { formatMoney, getFiscalForCountry } from '../lib/catalog';

/** Currencies with 3 decimal subunits (Razorpay / ISO). */
export const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);

/** Zero-decimal currencies. */
export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR']);

export function toMinorUnits(amountMajor: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor);
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor * 1000);
  return Math.round(amountMajor * 100);
}
