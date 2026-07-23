import { FALLBACK_USD_RATES } from '../data/taxCurrency';

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

/** Fetch USD→currency rates (Frankfurter). Falls back to static table. */
export async function getUsdRates(): Promise<Record<string, number>> {
  const cached = readCache();
  if (cached) return cached.rates;

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD');
    if (!res.ok) throw new Error('FX fetch failed');
    const data = await res.json();
    const rates: Record<string, number> = { USD: 1, ...(data.rates || {}) };
    // Frankfurter may omit some GCC currencies — merge fallbacks for missing
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
  const rate = rates[currency] ?? FALLBACK_USD_RATES[currency] ?? 1;
  return amountUsd * rate;
}
