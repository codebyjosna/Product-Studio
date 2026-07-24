import crypto from 'node:crypto';
import type { AuthedRequest } from './supabase';
import {
  applyPlanForUser,
  getSupabaseAdmin,
  normalizePlanId,
  profileToSession,
  type PlanId,
} from './supabase';
import { computeCheckoutTotals, getFiscalForCountryName, getPlanPriceUsd } from './pricing';

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

  const plan = await getPlanPriceUsd(input.planId);
  if (!plan) throw Object.assign(new Error('Invalid plan selected.'), { status: 400 });

  const fiscal = await getFiscalForCountryName(input.country);
  if (!fiscal) {
    throw Object.assign(new Error('Billing country not found in database.'), { status: 400 });
  }

  const isAnnual = input.billing === 'annual';
  const fxRate = await getFxRateForCurrency(fiscal.currency);
  if (fxRate == null) {
    throw Object.assign(
      new Error(`Exchange rate unavailable for ${fiscal.currency}. Try again later.`),
      { status: 503 }
    );
  }

  const totals = await computeCheckoutTotals({
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

  // ERR-147: if success txn exists but plan was never applied, finish apply without resetting on match.
  const ensurePlan = async (userId: string, targetPlan: PlanId) => {
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) {
      throw Object.assign(new Error('Profile not found.'), { status: 404 });
    }
    if (normalizePlanId(String(profile.plan_id)) === targetPlan) {
      return profileToSession(profile);
    }
    return applyPlanForUser(userId, targetPlan);
  };

  const { data: existing } = await admin
    .from('transactions')
    .select('*')
    .eq('razorpay_payment_id', input.razorpayPaymentId)
    .eq('status', 'success')
    .maybeSingle();

  if (existing) {
    const targetPlan = normalizePlanId(String(existing.plan_id || planId));
    const session = await ensurePlan(input.userId, targetPlan);
    return { session, txnCode: existing.txn_code, alreadyApplied: true };
  }

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
    amount?: number;
    currency?: string;
    notes?: { userId?: string; planId?: string; billing?: string };
  };

  if (payment.status !== 'captured') {
    throw Object.assign(new Error(`Payment not successful (${payment.status || 'unknown'}).`), {
      status: 402,
    });
  }
  if (payment.order_id !== input.razorpayOrderId) {
    throw Object.assign(new Error('Payment order mismatch.'), { status: 400 });
  }
  if (!payment.notes?.userId || payment.notes.userId !== input.userId) {
    throw Object.assign(new Error('Payment belongs to another user.'), { status: 403 });
  }
  if (!payment.notes?.planId || payment.notes.planId !== planId) {
    throw Object.assign(new Error('Payment plan mismatch.'), { status: 400 });
  }
  if (payment.notes?.billing && payment.notes.billing !== (input.billing === 'annual' ? 'annual' : 'monthly')) {
    throw Object.assign(new Error('Payment billing mismatch.'), { status: 400 });
  }

  const billing = input.billing === 'annual' ? 'annual' : 'monthly';
  // ERR-145: receipt from Razorpay only
  const serverAmountLabel =
    typeof payment.amount === 'number' && payment.currency
      ? `${String(payment.currency).toUpperCase()} ${(Number(payment.amount) / 100).toFixed(2)}`
      : null;

  const txnCode = `PS${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`.slice(0, 16);

  // ERR-146: claim payment id before apply_plan
  const { error: txnError } = await admin.from('transactions').insert({
    user_id: input.userId,
    txn_code: txnCode,
    plan_id: planId,
    billing,
    amount_label: serverAmountLabel,
    status: 'success',
    razorpay_order_id: input.razorpayOrderId,
    razorpay_payment_id: input.razorpayPaymentId,
    message: 'Payment verified',
  });

  if (txnError) {
    if (/duplicate|unique/i.test(txnError.message)) {
      const { data: raced } = await admin
        .from('transactions')
        .select('*')
        .eq('razorpay_payment_id', input.razorpayPaymentId)
        .eq('status', 'success')
        .maybeSingle();
      const targetPlan = normalizePlanId(String(raced?.plan_id || planId));
      const session = await ensurePlan(input.userId, targetPlan);
      return { session, txnCode: raced?.txn_code || txnCode, alreadyApplied: true };
    }
    throw Object.assign(new Error(txnError.message || 'Could not record payment.'), { status: 500 });
  }

  try {
    const session = await applyPlanForUser(input.userId, planId);
    return { session, txnCode, alreadyApplied: false };
  } catch (applyErr) {
    // ERR-147: unclaim so retry can re-apply
    await admin
      .from('transactions')
      .delete()
      .eq('razorpay_payment_id', input.razorpayPaymentId)
      .eq('txn_code', txnCode);
    throw applyErr;
  }
}

export async function consumeTokensForUser(userId: string, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) {
    throw Object.assign(new Error('Invalid token cost.'), { status: 400 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('consume_tokens_for_user', {
    p_user_id: userId,
    p_cost: cost,
  });
  if (error) {
    if (/insufficient_tokens/i.test(error.message)) {
      throw Object.assign(new Error('insufficient_tokens'), { status: 402 });
    }
    if (/profile_not_found/i.test(error.message)) {
      throw Object.assign(new Error('Profile not found.'), { status: 404 });
    }
    throw Object.assign(new Error(error.message || 'Token update failed.'), { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw Object.assign(new Error('Token update failed.'), { status: 500 });
  }
  return row;
}

export async function refundTokensForUser(userId: string, cost: number) {
  if (!Number.isFinite(cost) || cost <= 0) return;
  const admin = getSupabaseAdmin();
  await admin.rpc('refund_tokens_for_user', { p_user_id: userId, p_cost: cost });
}

export function userIdFromAuthed(req: AuthedRequest): string | null {
  return req.authUser?.id ?? null;
}
