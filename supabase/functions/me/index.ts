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
  if (req.method !== 'GET') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(req, { error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return json(req, { error: 'Unauthorized' }, 401)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return json(req, { error: error.message }, 500)
    if (!profile) return json(req, { error: 'Profile not found' }, 404)

    return json(req, {
      session: {
        userId: profile.id,
        name: profile.name,
        email: profile.email,
        planId: profile.plan_id,
        tokens: profile.tokens,
      },
    })
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : 'Failed to load profile' }, 500)
  }
})
