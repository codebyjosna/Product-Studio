import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const ALLOWED_ORIGINS = new Set([
  'https://www.codewix.in',
  'https://codewix.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.codewix.in'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-studio-path, range',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'content-range, accept-ranges, content-length, content-type',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  })
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

type Admin = ReturnType<typeof createClient>

async function ensurePlanApplied(
  admin: Admin,
  userId: string,
  planId: string,
): Promise<Record<string, unknown>> {
  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (readError || !profile) throw new Error('Profile not found.')

  if (String(profile.plan_id) === planId) {
    return profile as Record<string, unknown>
  }

  // ERR-147: success txn exists but plan not applied — apply now (idempotent SET allotment).
  const { data, error } = await admin.rpc('apply_plan', {
    p_user_id: userId,
    p_plan_id: planId,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return row as Record<string, unknown>
}

function sessionFromRow(row: Record<string, unknown>) {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    planId: row.plan_id,
    tokens: row.tokens,
  }
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(req, { error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json(req, { error: 'Razorpay is not configured.' }, 503)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return json(req, { error: 'Unauthorized' }, 401)

    const body = await req.json()
    const planId =
      body.planId === 'starter' || body.planId === 'pro' || body.planId === 'enterprise'
        ? body.planId
        : null
    const billing = body.billing === 'annual' ? 'annual' : 'monthly'
    const orderId = String(body.razorpay_order_id || '')
    const paymentId = String(body.razorpay_payment_id || '')
    const signature = String(body.razorpay_signature || '')

    if (!planId || !orderId || !paymentId || !signature) {
      return json(req, { error: 'Missing payment fields.' }, 400)
    }

    const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`)
    if (!timingSafeEqualHex(expected, signature)) {
      return json(req, { error: 'Invalid payment signature.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: existing } = await admin
      .from('transactions')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .eq('status', 'success')
      .maybeSingle()

    if (existing) {
      const targetPlan = String(existing.plan_id || planId)
      const row = await ensurePlanApplied(admin, user.id, targetPlan)
      return json(req, {
        alreadyApplied: true,
        txnCode: existing.txn_code,
        session: sessionFromRow(row),
      })
    }

    const auth = btoa(`${keyId}:${keySecret}`)
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    const payment = await payRes.json()
    if (!payRes.ok) return json(req, { error: 'Could not verify payment with Razorpay.' }, 502)
    if (payment.status !== 'captured') {
      return json(req, { error: `Payment not successful (${payment.status || 'unknown'}).` }, 402)
    }
    if (payment.order_id !== orderId) return json(req, { error: 'Payment order mismatch.' }, 400)
    if (!payment.notes?.userId || payment.notes.userId !== user.id) {
      return json(req, { error: 'Payment belongs to another user.' }, 403)
    }
    if (!payment.notes?.planId || payment.notes.planId !== planId) {
      return json(req, { error: 'Payment plan mismatch.' }, 400)
    }
    if (payment.notes?.billing && payment.notes.billing !== billing) {
      return json(req, { error: 'Payment billing mismatch.' }, 400)
    }

    const serverAmountLabel =
      typeof payment.amount === 'number' && payment.currency
        ? `${String(payment.currency).toUpperCase()} ${(Number(payment.amount) / 100).toFixed(2)}`
        : null

    const txnCode = `PS${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().slice(0, 4).toUpperCase()}`.slice(
      0,
      16,
    )

    const { error: txnError } = await admin.from('transactions').insert({
      user_id: user.id,
      txn_code: txnCode,
      plan_id: planId,
      billing,
      amount_label: serverAmountLabel,
      status: 'success',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      message: 'Payment verified',
    })

    if (txnError) {
      if (/duplicate|unique/i.test(txnError.message)) {
        const { data: raced } = await admin
          .from('transactions')
          .select('*')
          .eq('razorpay_payment_id', paymentId)
          .eq('status', 'success')
          .maybeSingle()
        const targetPlan = String(raced?.plan_id || planId)
        const row = await ensurePlanApplied(admin, user.id, targetPlan)
        return json(req, {
          alreadyApplied: true,
          txnCode: raced?.txn_code || txnCode,
          session: sessionFromRow(row),
        })
      }
      return json(req, { error: txnError.message || 'Could not record payment.' }, 500)
    }

    try {
      const row = await ensurePlanApplied(admin, user.id, planId)
      return json(req, {
        alreadyApplied: false,
        txnCode,
        session: sessionFromRow(row),
      })
    } catch (applyErr) {
      // Roll back claim so retry can succeed (ERR-147)
      await admin
        .from('transactions')
        .delete()
        .eq('razorpay_payment_id', paymentId)
        .eq('txn_code', txnCode)
      return json(
        req,
        { error: applyErr instanceof Error ? applyErr.message : 'Failed to apply plan.' },
        500,
      )
    }
  } catch (e) {
    return json(req, { error: e instanceof Error ? e.message : 'Confirm failed' }, 500)
  }
})
