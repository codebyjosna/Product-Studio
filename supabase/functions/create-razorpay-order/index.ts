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

const PLAN_PRICES_USD: Record<string, { monthly: number; name: string }> = {
  starter: { monthly: 3, name: 'Starter' },
  pro: { monthly: 10, name: 'Pro' },
  enterprise: { monthly: 50, name: 'Enterprise' },
}

const COUNTRY_FISCAL: Record<string, { currency: string; taxRate: number; taxLabel: string }> = {
  India: { currency: 'INR', taxRate: 0.18, taxLabel: 'GST' },
  'United States': { currency: 'USD', taxRate: 0, taxLabel: 'Sales tax' },
  'United Kingdom': { currency: 'GBP', taxRate: 0.2, taxLabel: 'VAT' },
  'United Arab Emirates': { currency: 'AED', taxRate: 0.05, taxLabel: 'VAT' },
  'Saudi Arabia': { currency: 'SAR', taxRate: 0.15, taxLabel: 'VAT' },
  Germany: { currency: 'EUR', taxRate: 0.19, taxLabel: 'VAT' },
  France: { currency: 'EUR', taxRate: 0.2, taxLabel: 'VAT' },
  Italy: { currency: 'EUR', taxRate: 0.22, taxLabel: 'VAT' },
  Spain: { currency: 'EUR', taxRate: 0.21, taxLabel: 'VAT' },
  Netherlands: { currency: 'EUR', taxRate: 0.21, taxLabel: 'VAT' },
  Ireland: { currency: 'EUR', taxRate: 0.23, taxLabel: 'VAT' },
  Belgium: { currency: 'EUR', taxRate: 0.21, taxLabel: 'VAT' },
  Austria: { currency: 'EUR', taxRate: 0.2, taxLabel: 'VAT' },
  Portugal: { currency: 'EUR', taxRate: 0.23, taxLabel: 'VAT' },
  Finland: { currency: 'EUR', taxRate: 0.255, taxLabel: 'VAT' },
  Greece: { currency: 'EUR', taxRate: 0.24, taxLabel: 'VAT' },
  Poland: { currency: 'PLN', taxRate: 0.23, taxLabel: 'VAT' },
  Sweden: { currency: 'SEK', taxRate: 0.25, taxLabel: 'VAT' },
  Norway: { currency: 'NOK', taxRate: 0.25, taxLabel: 'VAT' },
  Denmark: { currency: 'DKK', taxRate: 0.25, taxLabel: 'VAT' },
  Switzerland: { currency: 'CHF', taxRate: 0.081, taxLabel: 'VAT' },
  Canada: { currency: 'CAD', taxRate: 0.05, taxLabel: 'GST' },
  Australia: { currency: 'AUD', taxRate: 0.1, taxLabel: 'GST' },
  'New Zealand': { currency: 'NZD', taxRate: 0.15, taxLabel: 'GST' },
  Singapore: { currency: 'SGD', taxRate: 0.09, taxLabel: 'GST' },
  'Hong Kong': { currency: 'HKD', taxRate: 0, taxLabel: 'Tax' },
  Japan: { currency: 'JPY', taxRate: 0.1, taxLabel: 'Consumption tax' },
  'South Korea': { currency: 'KRW', taxRate: 0.1, taxLabel: 'VAT' },
  China: { currency: 'CNY', taxRate: 0.06, taxLabel: 'VAT' },
  Malaysia: { currency: 'MYR', taxRate: 0.08, taxLabel: 'SST' },
  Indonesia: { currency: 'IDR', taxRate: 0.11, taxLabel: 'VAT' },
  Thailand: { currency: 'THB', taxRate: 0.07, taxLabel: 'VAT' },
  Philippines: { currency: 'PHP', taxRate: 0.12, taxLabel: 'VAT' },
  Vietnam: { currency: 'VND', taxRate: 0.1, taxLabel: 'VAT' },
  Egypt: { currency: 'EGP', taxRate: 0.14, taxLabel: 'VAT' },
  'South Africa': { currency: 'ZAR', taxRate: 0.15, taxLabel: 'VAT' },
  Turkey: { currency: 'TRY', taxRate: 0.2, taxLabel: 'VAT' },
  Israel: { currency: 'ILS', taxRate: 0.17, taxLabel: 'VAT' },
  Brazil: { currency: 'BRL', taxRate: 0, taxLabel: 'Tax' },
  Mexico: { currency: 'MXN', taxRate: 0.16, taxLabel: 'IVA' },
  'Czech Republic': { currency: 'CZK', taxRate: 0.21, taxLabel: 'VAT' },
  Hungary: { currency: 'HUF', taxRate: 0.27, taxLabel: 'VAT' },
  Romania: { currency: 'RON', taxRate: 0.19, taxLabel: 'VAT' },
  Bulgaria: { currency: 'BGN', taxRate: 0.2, taxLabel: 'VAT' },
  Croatia: { currency: 'EUR', taxRate: 0.25, taxLabel: 'VAT' },
}

const ZERO = new Set(['JPY', 'KRW', 'VND', 'IDR'])
const THREE = new Set(['KWD', 'BHD', 'OMR'])

function toMinor(amount: number, currency: string) {
  if (ZERO.has(currency)) return Math.round(amount)
  if (THREE.has(currency)) return Math.round(amount * 1000)
  return Math.round(amount * 100)
}

function fiscalFor(country: string) {
  return COUNTRY_FISCAL[country] || { currency: 'USD', taxRate: 0, taxLabel: 'Tax' }
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
    const plan = PLAN_PRICES_USD[planId]
    if (!plan) return json({ error: 'Invalid plan selected.' }, 400)
    if (!country) return json({ error: 'Billing country is required.' }, 400)

    const fiscal = fiscalFor(country)
    const admin = createClient(supabaseUrl, serviceKey)
    let fxRate = 1
    if (fiscal.currency !== 'USD') {
      const { data: fxRow } = await admin
        .from('countries')
        .select('fx_rate')
        .eq('currency_code', fiscal.currency)
        .limit(1)
        .maybeSingle()
      const rate = Number(fxRow?.fx_rate)
      if (!Number.isFinite(rate) || rate <= 0) {
        return json({ error: `Exchange rate unavailable for ${fiscal.currency}.` }, 503)
      }
      fxRate = rate
    }

    const usd = billing === 'annual' ? plan.monthly * 10 : plan.monthly
    const planAmount = usd * fxRate
    const taxAmount = planAmount * fiscal.taxRate
    const total = planAmount + taxAmount
    const amountMinor = toMinor(total, fiscal.currency)
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
        currency: fiscal.currency,
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
      taxLabel: fiscal.taxLabel,
      exchangeRate: fxRate,
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Order failed' }, 500)
  }
})
