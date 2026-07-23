import type { AuthSession, PlanId } from '../auth/types';
import { normalizePlanId } from '../auth/types';
import type { ProfileRow } from '../lib/database.types';
import { apiFetch, edgeFetch } from '../lib/api';
import { getSupabase } from '../lib/supabase';

export function profileToSession(profile: ProfileRow): AuthSession {
  const planId = normalizePlanId(profile.plan_id);
  return {
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    planId,
    tokens: profile.tokens === undefined ? 0 : profile.tokens,
  };
}

export async function fetchProfile(userId?: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  let id = userId;
  if (!id) {
    const { data } = await supabase.auth.getUser();
    id = data.user?.id;
  }
  if (!id) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

const PROFILE_RETRY_DELAYS_MS = [200, 400, 800, 1200];

export async function fetchSessionFromAuth(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const userId = data.session.user.id;
  let profile = await fetchProfile(userId);
  for (let i = 0; !profile && i < PROFILE_RETRY_DELAYS_MS.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAYS_MS[i]));
    profile = await fetchProfile(userId);
  }

  if (!profile) return null;
  return profileToSession(profile);
}

export async function consumeTokensRpc(cost: number): Promise<AuthSession> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('consume_tokens', { p_cost: cost });
  if (error) {
    if (error.message.includes('insufficient_tokens')) {
      throw new Error('INSUFFICIENT_TOKENS');
    }
    throw new Error(error.message);
  }
  // rpc may return object or array depending on client version
  const row = (Array.isArray(data) ? data[0] : data) as ProfileRow | null;
  if (!row) throw new Error('Token update failed.');
  return profileToSession(row);
}

export interface ConfirmRazorpayPaymentPayload {
  planId: PlanId;
  billing: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amountLabel?: string;
}

export async function confirmRazorpayPaymentViaApi(
  payload: ConfirmRazorpayPaymentPayload
): Promise<{ session: AuthSession; txnCode: string; alreadyApplied?: boolean }> {
  const body = JSON.stringify(payload);

  try {
    const edgeRes = await edgeFetch('confirm-razorpay-payment', {
      method: 'POST',
      body,
    });
    const edgeBody = await edgeRes.json();
    if (edgeRes.ok && edgeBody.session && edgeBody.txnCode) {
      return {
        session: edgeBody.session as AuthSession,
        txnCode: String(edgeBody.txnCode),
        alreadyApplied: Boolean(edgeBody.alreadyApplied),
      };
    }
  } catch {
    // Fall through to Express
  }

  const res = await apiFetch('/api/razorpay/confirm-payment', {
    method: 'POST',
    body,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to confirm payment.');
  if (!result.session || !result.txnCode) {
    throw new Error('Payment confirmed but session was incomplete.');
  }
  return {
    session: result.session as AuthSession,
    txnCode: String(result.txnCode),
    alreadyApplied: Boolean(result.alreadyApplied),
  };
}

/** Soft client notes for failed/pending only — success rows are inserted by the server. */
export async function recordTransaction(input: {
  txnCode: string;
  planId: PlanId;
  billing: string;
  amountLabel?: string;
  status: 'failed' | 'pending';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  message?: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { error } = await supabase.from('transactions').insert({
    user_id: auth.user.id,
    txn_code: input.txnCode,
    plan_id: input.planId,
    billing: input.billing,
    amount_label: input.amountLabel ?? null,
    status: input.status,
    razorpay_order_id: input.razorpayOrderId ?? null,
    razorpay_payment_id: input.razorpayPaymentId ?? null,
    message: input.message ?? null,
  });
  if (error) {
    console.warn('Failed to record client transaction note:', error.message);
  }
}
