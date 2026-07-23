import { getSupabase, isSupabaseConfigured } from './supabase';
import type { PlanId } from '../auth/types';

export interface AppPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  tagline: string;
  tokens: string;
  duration: string;
  features: string[];
  popular?: boolean;
  icon: 'circle' | 'triangle' | 'hex';
}

export interface AppCatalog {
  base_currency: string;
  tokens_per_generation: number;
  max_product_images?: number;
  annual_multiplier: number;
  token_allotments: Record<string, number | null>;
  plans: AppPlan[];
}

export interface CountryFiscalRow {
  name: string;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  tax_label: string;
  fx_rate: number;
  code_alpha2: string;
  code_alpha3: string;
}

export interface StudioPreset {
  id: string;
  kind: 'product' | 'atmosphere';
  label: string;
  prompt: string;
  description: string;
  sort_order: number;
}

let catalogCache: AppCatalog | null = null;
let countriesCache: CountryFiscalRow[] | null = null;
let presetsCache: StudioPreset[] | null = null;
let fxCache: { at: number; rates: Record<string, number> } | null = null;

const FX_TTL_MS = 5 * 60 * 1000;

function assertDb() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

export async function loadAppCatalog(force = false): Promise<AppCatalog> {
  assertDb();
  if (catalogCache && !force) return catalogCache;
  const { data, error } = await getSupabase()
    .from('app_settings')
    .select('value')
    .eq('key', 'app_catalog')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.value) throw new Error('app_catalog setting missing in database.');
  catalogCache = data.value as AppCatalog;
  return catalogCache;
}

export async function getPlans(): Promise<AppPlan[]> {
  const catalog = await loadAppCatalog();
  return catalog.plans;
}

export async function getPlanById(id: string | undefined): Promise<AppPlan | undefined> {
  if (!id) return undefined;
  const plans = await getPlans();
  return plans.find((p) => p.id === id);
}

export async function planPrice(plan: AppPlan, billing: 'monthly' | 'annual'): Promise<number> {
  const catalog = await loadAppCatalog();
  return billing === 'monthly'
    ? plan.monthlyPrice
    : plan.monthlyPrice * (catalog.annual_multiplier || 10);
}

export async function getMaxProductImages(): Promise<number> {
  const catalog = await loadAppCatalog();
  const n = Number(catalog.max_product_images);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function getTokensPerGeneration(): Promise<number> {
  const catalog = await loadAppCatalog();
  return catalog.tokens_per_generation || 10;
}

export async function getTokenAllotment(planId: PlanId): Promise<number | null> {
  const catalog = await loadAppCatalog();
  const v = catalog.token_allotments?.[planId];
  return v === undefined ? 30 : v;
}

export async function loadCountries(force = false): Promise<CountryFiscalRow[]> {
  assertDb();
  if (countriesCache && !force) return countriesCache;
  const { data, error } = await getSupabase()
    .from('countries')
    .select('name, currency_code, currency_symbol, tax_rate, tax_label, fx_rate, code_alpha2, code_alpha3')
    .eq('is_billing', true)
    .order('name');
  if (error) throw new Error(error.message);
  countriesCache = (data || []).map((row) => ({
    name: String(row.name).trim(),
    currency_code: String(row.currency_code).trim().toUpperCase(),
    currency_symbol: String(row.currency_symbol || row.currency_code + ' '),
    tax_rate: Number(row.tax_rate) || 0,
    tax_label: String(row.tax_label || 'Tax'),
    fx_rate: Number(row.fx_rate) || 0,
    code_alpha2: String(row.code_alpha2).trim(),
    code_alpha3: String(row.code_alpha3).trim(),
  }));
  return countriesCache;
}

export async function getCountryNames(): Promise<string[]> {
  const rows = await loadCountries();
  const names = [...new Set(rows.map((r) => r.name))];
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

export async function getFiscalForCountry(country: string): Promise<{
  currency: string;
  currencySymbol: string;
  taxRate: number;
  taxLabel: string;
  fxRate: number;
} | null> {
  const rows = await loadCountries();
  const row = rows.find((r) => r.name === country);
  if (!row || !(row.fx_rate > 0)) return null;
  return {
    currency: row.currency_code,
    currencySymbol: row.currency_symbol,
    taxRate: row.tax_rate,
    taxLabel: row.tax_label,
    fxRate: row.fx_rate,
  };
}

export async function getUsdRates(force = false): Promise<Record<string, number>> {
  assertDb();
  if (fxCache && !force && Date.now() - fxCache.at < FX_TTL_MS) return fxCache.rates;
  const { data, error } = await getSupabase().from('countries').select('currency_code, fx_rate');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('No FX rates in countries table.');
  const rates: Record<string, number> = { USD: 1 };
  for (const row of data) {
    const code = String(row.currency_code).trim().toUpperCase();
    const rate = Number(row.fx_rate);
    if (code && Number.isFinite(rate) && rate > 0) rates[code] = rate;
  }
  fxCache = { at: Date.now(), rates };
  return rates;
}

export async function convertFromUsd(amountUsd: number, currency: string): Promise<number> {
  const rates = await getUsdRates();
  const code = currency.trim().toUpperCase();
  const rate = rates[code];
  if (rate == null || !(rate > 0)) {
    throw new Error(`FX rate unavailable for ${code}`);
  }
  return amountUsd * rate;
}

export async function loadStudioPresets(kind?: 'product' | 'atmosphere'): Promise<StudioPreset[]> {
  assertDb();
  if (!presetsCache) {
    const { data, error } = await getSupabase()
      .from('studio_presets')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    presetsCache = (data || []) as StudioPreset[];
  }
  if (!kind) return presetsCache;
  return presetsCache.filter((p) => p.kind === kind);
}

export function formatMoney(
  amount: number,
  fiscal: { currency: string; currencySymbol: string }
): string {
  const zero = new Set(['JPY', 'KRW', 'VND', 'IDR']);
  const three = new Set(['KWD', 'BHD', 'OMR']);
  const decimals = zero.has(fiscal.currency) ? 0 : three.has(fiscal.currency) ? 3 : 2;
  return `${fiscal.currencySymbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function parseBilling(value: string | null | undefined): 'monthly' | 'annual' {
  return value === 'annual' ? 'annual' : 'monthly';
}
