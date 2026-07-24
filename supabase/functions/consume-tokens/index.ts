import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeadersFor } from '../_shared/cors.ts'

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(req, { error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return json(req, { error: 'Unauthorized' }, 401)

    // ERR-132: ignore client cost; use catalog tokens_per_generation
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: settings } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'app_catalog')
      .maybeSingle()
    const catalogCost = Number(
      (settings?.value as { tokens_per_generation?: number } | undefined)?.tokens_per_generation,
    )
    const cost = Number.isFinite(catalogCost) && catalogCost > 0 ? catalogCost : 10

    const { data, error } = await admin.rpc('consume_tokens_for_user', {
      p_user_id: user.id,
      p_cost: cost,
    })
    if (error) {
      if (error.message.includes('insufficient_tokens')) {
        return json(req, { error: 'insufficient_tokens', ok: false }, 402)
      }
      return json(req, { error: error.message, ok: false }, 400)
    }

    const row = Array.isArray(data) ? data[0] : data
    return json(req, {
      ok: true,
      session: {
        userId: row.id,
        name: row.name,
        email: row.email,
        planId: row.plan_id,
        tokens: row.tokens,
      },
    })
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : 'Token consume failed' }, 500)
  }
})
