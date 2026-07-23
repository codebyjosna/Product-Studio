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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const { planId } = await req.json()
    const normalized =
      planId === 'starter' || planId === 'pro' || planId === 'enterprise' ? planId : null
    if (!normalized) return json({ error: 'Invalid plan.' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin.rpc('apply_plan', {
      p_user_id: user.id,
      p_plan_id: normalized,
    })
    if (error) return json({ error: error.message }, 500)

    const row = Array.isArray(data) ? data[0] : data
    return json({
      session: {
        userId: row.id,
        name: row.name,
        email: row.email,
        planId: row.plan_id,
        tokens: row.tokens,
      },
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Failed to apply plan' }, 500)
  }
})
