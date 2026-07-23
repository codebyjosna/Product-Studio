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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay is not configured.' }, 503)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const planId =
      body.planId === 'starter' || body.planId === 'pro' || body.planId === 'enterprise'
        ? body.planId
        : null
    const billing = body.billing === 'annual' ? 'annual' : 'monthly'
    const orderId = String(body.razorpay_order_id || '')
    const paymentId = String(body.razorpay_payment_id || '')
    const signature = String(body.razorpay_signature || '')
    const amountLabel = body.amountLabel ? String(body.amountLabel) : null

    if (!planId || !orderId || !paymentId || !signature) {
      return json({ error: 'Missing payment fields.' }, 400)
    }

    const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`)
    if (expected !== signature) return json({ error: 'Invalid payment signature.' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: existing } = await admin
      .from('transactions')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .eq('status', 'success')
      .maybeSingle()

    if (existing) {
      const { data } = await admin.rpc('apply_plan', {
        p_user_id: user.id,
        p_plan_id: existing.plan_id,
      })
      const row = Array.isArray(data) ? data[0] : data
      return json({
        alreadyApplied: true,
        txnCode: existing.txn_code,
        session: {
          userId: row.id,
          name: row.name,
          email: row.email,
          planId: row.plan_id,
          tokens: row.tokens,
        },
      })
    }

    const auth = btoa(`${keyId}:${keySecret}`)
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    const payment = await payRes.json()
    if (!payRes.ok) return json({ error: 'Could not verify payment with Razorpay.' }, 502)
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return json({ error: `Payment not successful (${payment.status || 'unknown'}).` }, 402)
    }
    if (payment.order_id !== orderId) return json({ error: 'Payment order mismatch.' }, 400)
    if (payment.notes?.userId && payment.notes.userId !== user.id) {
      return json({ error: 'Payment belongs to another user.' }, 403)
    }
    if (payment.notes?.planId && payment.notes.planId !== planId) {
      return json({ error: 'Payment plan mismatch.' }, 400)
    }

    const { data, error } = await admin.rpc('apply_plan', {
      p_user_id: user.id,
      p_plan_id: planId,
    })
    if (error) return json({ error: error.message }, 500)
    const row = Array.isArray(data) ? data[0] : data

    const txnCode = `PS${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().slice(0, 4).toUpperCase()}`.slice(
      0,
      16,
    )

    await admin.from('transactions').insert({
      user_id: user.id,
      txn_code: txnCode,
      plan_id: planId,
      billing,
      amount_label: amountLabel,
      status: 'success',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      message: 'Payment verified',
    })

    return json({
      alreadyApplied: false,
      txnCode,
      session: {
        userId: row.id,
        name: row.name,
        email: row.email,
        planId: row.plan_id,
        tokens: row.tokens,
      },
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Confirm failed' }, 500)
  }
})
