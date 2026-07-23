import { FALLBACK_USD_RATES } from '../data/taxCurrency';
import { getSupabase, isSupabaseConfigured } from './supabase';

const CACHE_KEY = 'ps_usd_fx_rates';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface FxCache {
  fetchedAt: number;
  rates: Record<string, number>;
}

function readCache(): FxCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxCache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rates: Record<string, number>) {
  const payload: FxCache = { fetchedAt: Date.now(), rates };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

/** Prefer Supabase countries.fx_rate (USD base), then Frankfurter, then static fallback. */
export async function getUsdRates(): Promise<Record<string, number>> {
  const cached = readCache();
  if (cached) return cached.rates;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabase()
        .from('countries')
        .select('currency_code, fx_rate');
      if (!error && data?.length) {
        const rates: Record<string, number> = { ...FALLBACK_USD_RATES, USD: 1 };
        for (const row of data) {
          const code = String(row.currency_code).trim().toUpperCase();
          const rate = Number(row.fx_rate);
          if (code && Number.isFinite(rate) && rate > 0) rates[code] = rate;
        }
        writeCache(rates);
        return rates;
      }
    } catch {
      // fall through
    }
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD');
    if (!res.ok) throw new Error('FX fetch failed');
    const data = await res.json();
    const rates: Record<string, number> = { USD: 1, ...(data.rates || {}) };
    for (const [code, rate] of Object.entries(FALLBACK_USD_RATES)) {
      if (rates[code] == null) rates[code] = rate;
    }
    writeCache(rates);
    return rates;
  } catch {
    return { ...FALLBACK_USD_RATES };
  }
}

export async function convertFromUsd(amountUsd: number, currency: string): Promise<number> {
  const rates = await getUsdRates();
  const code = currency.toUpperCase();
  const rate = rates[code] ?? FALLBACK_USD_RATES[code];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`FX rate unavailable for ${code}`);
  }
  return amountUsd * rate;
}
