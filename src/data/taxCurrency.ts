/** ISO currency + tax rate (decimal) by billing country. */
export interface CountryFiscal {
  currency: string;
  currencySymbol: string;
  taxRate: number; // e.g. 0.18 = 18%
  taxLabel: string;
}

const DEFAULT_FISCAL: CountryFiscal = {
  currency: 'USD',
  currencySymbol: '$',
  taxRate: 0,
  taxLabel: 'Tax',
};

/** Map billing-address country name → currency + tax. */
export const COUNTRY_FISCAL: Record<string, CountryFiscal> = {
  India: { currency: 'INR', currencySymbol: '₹', taxRate: 0.18, taxLabel: 'GST' },
  'United States': { currency: 'USD', currencySymbol: '$', taxRate: 0, taxLabel: 'Sales tax' },
  'United Kingdom': { currency: 'GBP', currencySymbol: '£', taxRate: 0.2, taxLabel: 'VAT' },
  'United Arab Emirates': { currency: 'AED', currencySymbol: 'AED ', taxRate: 0.05, taxLabel: 'VAT' },
  'Saudi Arabia': { currency: 'SAR', currencySymbol: 'SAR ', taxRate: 0.15, taxLabel: 'VAT' },
  Qatar: { currency: 'QAR', currencySymbol: 'QAR ', taxRate: 0, taxLabel: 'VAT' },
  Kuwait: { currency: 'KWD', currencySymbol: 'KWD ', taxRate: 0, taxLabel: 'VAT' },
  Bahrain: { currency: 'BHD', currencySymbol: 'BHD ', taxRate: 0.1, taxLabel: 'VAT' },
  Oman: { currency: 'OMR', currencySymbol: 'OMR ', taxRate: 0.05, taxLabel: 'VAT' },
  Germany: { currency: 'EUR', currencySymbol: '€', taxRate: 0.19, taxLabel: 'VAT' },
  France: { currency: 'EUR', currencySymbol: '€', taxRate: 0.2, taxLabel: 'VAT' },
  Italy: { currency: 'EUR', currencySymbol: '€', taxRate: 0.22, taxLabel: 'VAT' },
  Spain: { currency: 'EUR', currencySymbol: '€', taxRate: 0.21, taxLabel: 'VAT' },
  Netherlands: { currency: 'EUR', currencySymbol: '€', taxRate: 0.21, taxLabel: 'VAT' },
  Ireland: { currency: 'EUR', currencySymbol: '€', taxRate: 0.23, taxLabel: 'VAT' },
  Belgium: { currency: 'EUR', currencySymbol: '€', taxRate: 0.21, taxLabel: 'VAT' },
  Austria: { currency: 'EUR', currencySymbol: '€', taxRate: 0.2, taxLabel: 'VAT' },
  Portugal: { currency: 'EUR', currencySymbol: '€', taxRate: 0.23, taxLabel: 'VAT' },
  Finland: { currency: 'EUR', currencySymbol: '€', taxRate: 0.255, taxLabel: 'VAT' },
  Greece: { currency: 'EUR', currencySymbol: '€', taxRate: 0.24, taxLabel: 'VAT' },
  Poland: { currency: 'EUR', currencySymbol: '€', taxRate: 0.23, taxLabel: 'VAT' },
  Sweden: { currency: 'SEK', currencySymbol: 'SEK ', taxRate: 0.25, taxLabel: 'VAT' },
  Norway: { currency: 'NOK', currencySymbol: 'NOK ', taxRate: 0.25, taxLabel: 'VAT' },
  Denmark: { currency: 'DKK', currencySymbol: 'DKK ', taxRate: 0.25, taxLabel: 'VAT' },
  Switzerland: { currency: 'CHF', currencySymbol: 'CHF ', taxRate: 0.081, taxLabel: 'VAT' },
  Canada: { currency: 'CAD', currencySymbol: 'CA$', taxRate: 0.05, taxLabel: 'GST' },
  Australia: { currency: 'AUD', currencySymbol: 'A$', taxRate: 0.1, taxLabel: 'GST' },
  'New Zealand': { currency: 'NZD', currencySymbol: 'NZ$', taxRate: 0.15, taxLabel: 'GST' },
  Singapore: { currency: 'SGD', currencySymbol: 'S$', taxRate: 0.09, taxLabel: 'GST' },
  'Hong Kong': { currency: 'HKD', currencySymbol: 'HK$', taxRate: 0, taxLabel: 'Tax' },
  Japan: { currency: 'JPY', currencySymbol: '¥', taxRate: 0.1, taxLabel: 'Consumption tax' },
  'South Korea': { currency: 'KRW', currencySymbol: '₩', taxRate: 0.1, taxLabel: 'VAT' },
  China: { currency: 'CNY', currencySymbol: '¥', taxRate: 0.06, taxLabel: 'VAT' },
  Malaysia: { currency: 'MYR', currencySymbol: 'RM ', taxRate: 0.08, taxLabel: 'SST' },
  Indonesia: { currency: 'IDR', currencySymbol: 'Rp ', taxRate: 0.11, taxLabel: 'VAT' },
  Thailand: { currency: 'THB', currencySymbol: '฿', taxRate: 0.07, taxLabel: 'VAT' },
  Philippines: { currency: 'PHP', currencySymbol: '₱', taxRate: 0.12, taxLabel: 'VAT' },
  Vietnam: { currency: 'VND', currencySymbol: '₫', taxRate: 0.1, taxLabel: 'VAT' },
  Egypt: { currency: 'EGP', currencySymbol: 'E£', taxRate: 0.14, taxLabel: 'VAT' },
  'South Africa': { currency: 'ZAR', currencySymbol: 'R ', taxRate: 0.15, taxLabel: 'VAT' },
  Turkey: { currency: 'TRY', currencySymbol: '₺', taxRate: 0.2, taxLabel: 'VAT' },
  Israel: { currency: 'ILS', currencySymbol: '₪', taxRate: 0.17, taxLabel: 'VAT' },
  Brazil: { currency: 'BRL', currencySymbol: 'R$', taxRate: 0, taxLabel: 'Tax' },
  Mexico: { currency: 'MXN', currencySymbol: 'MX$', taxRate: 0.16, taxLabel: 'IVA' },
};

export function getFiscalForCountry(country: string): CountryFiscal {
  return COUNTRY_FISCAL[country] || DEFAULT_FISCAL;
}

/** Currencies with 3 decimal subunits (Razorpay / ISO). */
export const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);

/** Zero-decimal currencies. */
export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR']);

export function toMinorUnits(amountMajor: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor);
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor * 1000);
  return Math.round(amountMajor * 100);
}

export function formatMoney(amount: number, fiscal: CountryFiscal): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(fiscal.currency)
    ? 0
    : THREE_DECIMAL_CURRENCIES.has(fiscal.currency)
      ? 3
      : 2;
  return `${fiscal.currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Fallback USD→X rates if live FX fetch fails. */
export const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  CAD: 1.36,
  AUD: 1.53,
  NZD: 1.66,
  SGD: 1.34,
  HKD: 7.82,
  JPY: 149,
  KRW: 1350,
  CNY: 7.2,
  MYR: 4.7,
  IDR: 15800,
  THB: 35.5,
  PHP: 56,
  VND: 25400,
  EGP: 48,
  ZAR: 18.5,
  TRY: 32,
  ILS: 3.7,
  BRL: 5.0,
  MXN: 17,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  CHF: 0.88,
};
