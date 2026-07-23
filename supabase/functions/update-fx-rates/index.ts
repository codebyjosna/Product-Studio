import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isAuthorized(req: Request): boolean {
  const cronSecret = Deno.env.get('FX_CRON_SECRET')
  const headerSecret = req.headers.get('x-cron-secret')
  if (cronSecret && headerSecret && headerSecret === cronSecret) return true

  const auth = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (auth && serviceKey && auth === `Bearer ${serviceKey}`) return true

  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!isAuthorized(req)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const apiKey = Deno.env.get('EXCHANGE_RATE_API_KEY')
    if (!apiKey) return json({ error: 'EXCHANGE_RATE_API_KEY not configured' }, 500)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const fxRes = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`)
    if (!fxRes.ok) {
      const text = await fxRes.text()
      return json({ error: 'ExchangeRate API failed', detail: text }, 502)
    }

    const payload = await fxRes.json() as {
      result?: string
      base_code?: string
      time_last_update_utc?: string
      time_last_update_unix?: number
      conversion_rates?: Record<string, number>
    }

    if (payload.result !== 'success' || !payload.conversion_rates) {
      return json({ error: 'Unexpected ExchangeRate API response', payload }, 502)
    }

    const rates = payload.conversion_rates
    const now = new Date().toISOString()
    let updated = 0

    // Update by currency_code so multi-country currencies (e.g. EUR) stay in sync
    for (const [currencyCode, rate] of Object.entries(rates)) {
      const { data, error } = await admin
        .from('countries')
        .update({ fx_rate: rate, updated_at: now })
        .eq('currency_code', currencyCode)
        .select('id')

      if (error) {
        return json({ error: error.message, currencyCode }, 500)
      }
      updated += data?.length ?? 0
    }

    await admin.from('app_settings').upsert(
      {
        key: 'fx_meta',
        value: {
          base_code: payload.base_code ?? 'USD',
          provider: 'exchangerate-api',
          last_update_utc: payload.time_last_update_utc ?? now,
          last_update_unix: payload.time_last_update_unix ?? null,
          refreshed_at: now,
          rows_updated: updated,
        },
        updated_at: now,
      },
      { onConflict: 'key' },
    )

    return json({
      ok: true,
      base: payload.base_code ?? 'USD',
      currencies: Object.keys(rates).length,
      rowsUpdated: updated,
      lastUpdateUtc: payload.time_last_update_utc,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'FX update failed' }, 500)
  }
})
