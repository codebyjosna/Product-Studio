import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const body = await req.json().catch(() => ({}))
    const cost = typeof body.cost === 'number' ? body.cost : 10

    const { data, error } = await supabase.rpc('consume_tokens', { p_cost: cost })
    if (error) {
      if (error.message.includes('insufficient_tokens')) {
        return json({ error: 'insufficient_tokens', ok: false }, 402)
      }
      return json({ error: error.message, ok: false }, 400)
    }

    const row = Array.isArray(data) ? data[0] : data
    return json({
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
    return json({ error: e instanceof Error ? e.message : 'Token consume failed' }, 500)
  }
})
