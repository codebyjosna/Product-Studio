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

const ZERO = new Set(['JPY', 'KRW', 'VND', 'IDR'])
const THREE = new Set(['KWD', 'BHD', 'OMR'])

function toMinor(amount: number, currency: string) {
  if (ZERO.has(currency)) return Math.round(amount)
  if (THREE.has(currency)) return Math.round(amount * 1000)
  return Math.round(amount * 100)
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
    const planId = body.planId as string
    const billing = body.billing === 'annual' ? 'annual' : 'monthly'
    const country = String(body.billingAddress?.country || body.country || '').trim()
    if (!planId || !country) return json({ error: 'planId and billing country are required.' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: catalogRow, error: catalogError } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'app_catalog')
      .maybeSingle()
    if (catalogError || !catalogRow?.value) return json({ error: 'app_catalog missing.' }, 500)

    const catalog = catalogRow.value as {
      annual_multiplier?: number
      plans?: Array<{ id: string; name: string; monthlyPrice: number }>
    }
    const plan = catalog.plans?.find((p) => p.id === planId)
    if (!plan) return json({ error: 'Invalid plan selected.' }, 400)

    const { data: countryRow, error: countryError } = await admin
      .from('countries')
      .select('currency_code, currency_symbol, tax_rate, tax_label, fx_rate')
      .eq('name', country)
      .limit(1)
      .maybeSingle()
    if (countryError || !countryRow) return json({ error: 'Billing country not found.' }, 400)

    const currency = String(countryRow.currency_code).trim().toUpperCase()
    const taxRate = Number(countryRow.tax_rate) || 0
    const taxLabel = String(countryRow.tax_label || 'Tax')
    let fxRate = Number(countryRow.fx_rate)
    if (currency === 'USD') fxRate = 1
    if (!Number.isFinite(fxRate) || fxRate <= 0) {
      return json({ error: `Exchange rate unavailable for ${currency}.` }, 503)
    }

    const mult = Number(catalog.annual_multiplier) > 0 ? Number(catalog.annual_multiplier) : 10
    const usd = billing === 'annual' ? plan.monthlyPrice * mult : plan.monthlyPrice
    const planAmount = usd * fxRate
    const taxAmount = planAmount * taxRate
    const total = planAmount + taxAmount
    const amountMinor = toMinor(total, currency)
    if (amountMinor <= 0) return json({ error: 'Could not compute order amount.' }, 400)

    const auth = btoa(`${keyId}:${keySecret}`)
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency,
        receipt: `ps_${planId}_${Date.now()}`.slice(0, 40),
        notes: {
          userId: user.id,
          planId,
          planName: plan.name,
          billing,
          country,
          customerName: body.billingAddress?.name || '',
          customerEmail: body.billingAddress?.email || '',
          usdPrice: String(usd),
          fxRate: String(fxRate),
          planAmount: String(planAmount),
          taxAmount: String(taxAmount),
          total: String(total),
        },
      }),
    })
    const order = await orderRes.json()
    if (!orderRes.ok) {
      return json({ error: order?.error?.description || 'Failed to create payment order' }, 500)
    }

    return json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name,
      billing,
      planAmount,
      taxAmount,
      total,
      taxLabel,
      exchangeRate: fxRate,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Order failed' }, 500)
  }
})
