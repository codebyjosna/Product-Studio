/**
 * Server pricing — loaded from Supabase (countries + app_settings). No hardcoded fiscal/plan maps.
 */
import { getSupabaseAdmin } from './supabase';

export interface CountryFiscal {
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxLabel: string;
}

const THREE_DECIMAL_CURRENCIES = new Set(['KWD', 'BHD', 'OMR']);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR']);

export function toMinorUnits(amountMajor: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor);
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return Math.round(amountMajor * 1000);
  return Math.round(amountMajor * 100);
}

export async function getPlanPriceUsd(
  planId: string
): Promise<{ monthly: number; name: string } | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'app_catalog')
    .maybeSingle();
  if (error || !data?.value) return null;
  const catalog = data.value as {
    plans?: Array<{ id: string; name: string; monthlyPrice: number }>;
  };
  const plan = catalog.plans?.find((p) => p.id === planId);
  if (!plan) return null;
  return { monthly: plan.monthlyPrice, name: plan.name };
}

export async function getAnnualMultiplier(): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'app_catalog')
    .maybeSingle();
  const mult = Number((data?.value as { annual_multiplier?: number } | undefined)?.annual_multiplier);
  return Number.isFinite(mult) && mult > 0 ? mult : 10;
}

export async function getFiscalForCountryName(country: string): Promise<CountryFiscal | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('countries')
    .select('currency_code, currency_symbol, tax_rate, tax_label, fx_rate')
    .eq('name', country)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    currency: String(data.currency_code).trim().toUpperCase(),
    currencySymbol: String(data.currency_symbol || ''),
    taxRate: Number(data.tax_rate) || 0,
    taxLabel: String(data.tax_label || 'Tax'),
  };
}

export async function getTokensPerGeneration(): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'app_catalog')
    .maybeSingle();
  const n = Number((data?.value as { tokens_per_generation?: number } | undefined)?.tokens_per_generation);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export async function computeCheckoutTotals(input: {
  planId: string;
  billing: string;
  country: string;
  fxRate: number;
}) {
  const plan = await getPlanPriceUsd(input.planId);
  if (!plan) return null;
  if (!Number.isFinite(input.fxRate) || input.fxRate <= 0) return null;

  const fiscal = await getFiscalForCountryName(input.country);
  if (!fiscal) return null;

  const mult = await getAnnualMultiplier();
  const usd = input.billing === 'annual' ? plan.monthly * mult : plan.monthly;
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
    planName: plan.name,
  };
}
