import crypto from 'node:crypto';
import type { AuthedRequest } from './supabase';
import {
  applyPlanForUser,
  getSupabaseAdmin,
  normalizePlanId,
  type PlanId,
} from './supabase';
import { computeCheckoutTotals, PLAN_PRICES_USD } from './pricing';

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function getFxRateForCurrency(currency: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  const code = currency.trim().toUpperCase();
  if (code === 'USD') return 1;

  const { data, error } = await admin
    .from('countries')
    .select('fx_rate')
    .eq('currency_code', code)
    .limit(1)
    .maybeSingle();

  if (error || data?.fx_rate == null) return null;
  const rate = Number(data.fx_rate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function createVerifiedRazorpayOrder(input: {
  userId: string;
  planId: string;
  billing: string;
  country: string;
  billingAddress?: Record<string, string | undefined>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw Object.assign(new Error('Razorpay is not configured.'), { status: 503 });
  }

  const plan = PLAN_PRICES_USD[input.planId];
  if (!plan) throw Object.assign(new Error('Invalid plan selected.'), { status: 400 });

  const isAnnual = input.billing === 'annual';
  const fiscalCurrency = computeCheckoutTotals({
    planId: input.planId,
    billing: isAnnual ? 'annual' : 'monthly',
    country: input.country,
    fxRate: 1,
  })!.fiscal.currency;

  const fxRate = await getFxRateForCurrency(fiscalCurrency);
  if (fxRate == null) {
    throw Object.assign(
      new Error(`Exchange rate unavailable for ${fiscalCurrency}. Try again later.`),
      { status: 503 }
    );
  }

  const totals = computeCheckoutTotals({
    planId: input.planId,
    billing: isAnnual ? 'annual' : 'monthly',
    country: input.country,
    fxRate,
  });
  if (!totals || totals.amountMinor <= 0) {
    throw Object.assign(new Error('Could not compute order amount.'), { status: 400 });
  }

  const Razorpay = (await import('razorpay')).default;
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const order = await razorpay.orders.create({
    amount: totals.amountMinor,
    currency: totals.fiscal.currency,
    receipt: `ps_${input.planId}_${Date.now()}`.slice(0, 40),
    notes: {
      userId: input.userId,
      planId: input.planId,
      planName: plan.name,
      billing: isAnnual ? 'annual' : 'monthly',
      country: input.country,
      customerName: input.billingAddress?.name || '',
      customerEmail: input.billingAddress?.email || '',
      usdPrice: String(totals.usdPrice),
      fxRate: String(totals.exchangeRate),
      planAmount: String(totals.planAmount),
      taxAmount: String(totals.taxAmount),
      total: String(totals.total),
    },
  });

  return {
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    planName: plan.name,
    billing: isAnnual ? 'annual' : 'monthly',
    planAmount: totals.planAmount,
    taxAmount: totals.taxAmount,
    total: totals.total,
    taxLabel: totals.fiscal.taxLabel,
    exchangeRate: totals.exchangeRate,
  };
}

export async function confirmRazorpayAndApplyPlan(input: {
  userId: string;
  planId: string;
  billing: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amountLabel?: string;
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw Object.assign(new Error('Razorpay is not configured.'), { status: 503 });
  }

  const planId = normalizePlanId(input.planId);
  if (planId === 'free') {
    throw Object.assign(new Error('Invalid plan.'), { status: 400 });
  }

  if (
    !verifyRazorpaySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
      keySecret
    )
  ) {
    throw Object.assign(new Error('Invalid payment signature.'), { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Idempotency: same payment already applied
  const { data: existing } = await admin
    .from('transactions')
    .select('*')
    .eq('razorpay_payment_id', input.razorpayPaymentId)
    .eq('status', 'success')
    .maybeSingle();

  if (existing) {
    const session = await applyPlanForUser(input.userId, existing.plan_id as PlanId);
    return {
      session,
      txnCode: existing.txn_code,
      alreadyApplied: true,
    };
  }

  // Confirm payment with Razorpay API
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${input.razorpayPaymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!payRes.ok) {
    throw Object.assign(new Error('Could not verify payment with Razorpay.'), { status: 502 });
  }
  const payment = (await payRes.json()) as {
    status?: string;
    order_id?: string;
    notes?: { userId?: string; planId?: string; billing?: string };
  };

  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    throw Object.assign(new Error(`Payment not successful (${payment.status || 'unknown'}).`), {
      status: 402,
    });
  }
  if (payment.order_id !== input.razorpayOrderId) {
    throw Object.assign(new Error('Payment order mismatch.'), { status: 400 });
  }
  if (payment.notes?.userId && payment.notes.userId !== input.userId) {
    throw Object.assign(new Error('Payment belongs to another user.'), { status: 403 });
  }
  if (payment.notes?.planId && payment.notes.planId !== planId) {
    throw Object.assign(new Error('Payment plan mismatch.'), { status: 400 });
  }

  const session = await applyPlanForUser(input.userId, planId);
  const txnCode = `PS${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`.slice(0, 16);

  const { error: txnError } = await admin.from('transactions').insert({
    user_id: input.userId,
    txn_code: txnCode,
    plan_id: planId,
    billing: input.billing === 'annual' ? 'annual' : 'monthly',
    amount_label: input.amountLabel ?? null,
    status: 'success',
    razorpay_order_id: input.razorpayOrderId,
    razorpay_payment_id: input.razorpayPaymentId,
    message: 'Payment verified',
  });

  if (txnError && !/duplicate|unique/i.test(txnError.message)) {
    console.error('transaction insert failed after plan apply:', txnError.message);
  }

  return { session, txnCode, alreadyApplied: false };
}

export async function consumeTokensForUser(userId: string, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) {
    throw Object.assign(new Error('Invalid token cost.'), { status: 400 });
  }
  const admin = getSupabaseAdmin();
  // Use service role client with RPC — consume_tokens uses auth.uid(); call via SQL update instead
  const { data: row, error: readError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (readError || !row) {
    throw Object.assign(new Error('Profile not found.'), { status: 404 });
  }
  if (row.tokens == null) {
    return row; // unlimited
  }
  if (row.tokens < cost) {
    throw Object.assign(new Error('insufficient_tokens'), { status: 402 });
  }
  const { data: updated, error } = await admin
    .from('profiles')
    .update({ tokens: row.tokens - cost })
    .eq('id', userId)
    .select('*')
    .single();
  if (error || !updated) {
    throw Object.assign(new Error(error?.message || 'Token update failed.'), { status: 500 });
  }
  return updated;
}

export async function refundTokensForUser(userId: string, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return;
  const admin = getSupabaseAdmin();
  const { data: row } = await admin.from('profiles').select('tokens').eq('id', userId).maybeSingle();
  if (!row || row.tokens == null) return;
  await admin.from('profiles').update({ tokens: row.tokens + cost }).eq('id', userId);
}

/** Attach JWT from request for client helpers. */
export function userIdFromAuthed(req: AuthedRequest): string | null {
  return req.authUser?.id ?? null;
}
