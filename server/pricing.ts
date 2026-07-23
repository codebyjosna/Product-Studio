/**
 * Shared USD plan pricing + fiscal map (server / Edge).
 * Keep in sync with src/data/plans.ts and src/data/taxCurrency.ts
 */

export const PLAN_PRICES_USD: Record<string, { monthly: number; name: string }> = {
  starter: { monthly: 3, name: 'Starter' },
  pro: { monthly: 10, name: 'Pro' },
  enterprise: { monthly: 50, name: 'Enterprise' },
};

export interface CountryFiscal {
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxLabel: string;
}

const DEFAULT_FISCAL: CountryFiscal = {
  currency: 'USD',
  currencySymbol: '$',
  taxRate: 0,
  taxLabel: 'Tax',
};

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
  Poland: { currency: 'PLN', currencySymbol: 'zł ', taxRate: 0.23, taxLabel: 'VAT' },
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
  'Czech Republic': { currency: 'CZK', currencySymbol: 'Kč ', taxRate: 0.21, taxLabel: 'VAT' },
  Hungary: { currency: 'HUF', currencySymbol: 'Ft ', taxRate: 0.27, taxLabel: 'VAT' },
  Romania: { currency: 'RON', currencySymbol: 'lei ', taxRate: 0.19, taxLabel: 'VAT' },
  Bulgaria: { currency: 'BGN', currencySymbol: 'лв ', taxRate: 0.2, taxLabel: 'VAT' },
  Croatia: { currency: 'EUR', currencySymbol: '€', taxRate: 0.25, taxLabel: 'VAT' },
  Slovakia: { currency: 'EUR', currencySymbol: '€', taxRate: 0.2, taxLabel: 'VAT' },
  Slovenia: { currency: 'EUR', currencySymbol: '€', taxRate: 0.22, taxLabel: 'VAT' },
  Estonia: { currency: 'EUR', currencySymbol: '€', taxRate: 0.22, taxLabel: 'VAT' },
  Latvia: { currency: 'EUR', currencySymbol: '€', taxRate: 0.21, taxLabel: 'VAT' },
  Lithuania: { currency: 'EUR', currencySymbol: '€', taxRate: 0.21, taxLabel: 'VAT' },
  Luxembourg: { currency: 'EUR', currencySymbol: '€', taxRate: 0.17, taxLabel: 'VAT' },
  Malta: { currency: 'EUR', currencySymbol: '€', taxRate: 0.18, taxLabel: 'VAT' },
  Cyprus: { currency: 'EUR', currencySymbol: '€', taxRate: 0.19, taxLabel: 'VAT' },
};

export function getFiscalForCountry(country: string): CountryFiscal {
  return COUNTRY_FISCAL[country] || DEFAULT_FISCAL;
}

export const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);
export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR']);

export function toMinorUnits(amountMajor: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor);
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor * 1000);
  return Math.round(amountMajor * 100);
}

export function planUsdAmount(planId: string, billing: string): number | null {
  const plan = PLAN_PRICES_USD[planId];
  if (!plan) return null;
  return billing === 'annual' ? plan.monthly * 10 : plan.monthly;
}

export function computeCheckoutTotals(input: {
  planId: string;
  billing: string;
  country: string;
  fxRate: number;
}) {
  const usd = planUsdAmount(input.planId, input.billing);
  if (usd == null) return null;
  if (!Number.isFinite(input.fxRate) || input.fxRate <= 0) return null;

  const fiscal = getFiscalForCountry(input.country);
  const planAmount = usd * input.fxRate;
  const taxAmount = planAmount * fiscal.taxRate;
  const total = planAmount + taxAmount;
  const amountMinor = toMinorUnits(total, fiscal.currency);

  return {
    fiscal,
    usdPrice: usd,
    planAmount,
    taxAmount,
    total,
    amountMinor,
    exchangeRate: input.fxRate,
    planName: PLAN_PRICES_USD[input.planId].name,
  };
}
