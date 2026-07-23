import type { AuthSession, PlanId } from '../auth/types';
import { normalizePlanId } from '../auth/types';
import type { ProfileRow } from '../lib/database.types';
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

export async function fetchSessionFromAuth(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const profile = await fetchProfile(data.session.user.id);
  if (profile) return profileToSession(profile);

  // Profile trigger race — synthesize from auth user until row exists
  const u = data.session.user;
  return {
    userId: u.id,
    name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Creator',
    email: (u.email || '').toLowerCase(),
    planId: 'free',
    tokens: 30,
  };
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

export async function applyPlanViaApi(planId: PlanId): Promise<AuthSession> {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not signed in.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  // Prefer Supabase Edge Function when configured; fall back to Express.
  if (supabaseUrl && anonKey) {
    const edgeRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/apply-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ planId }),
    });
    const edgeBody = await edgeRes.json();
    if (edgeRes.ok && edgeBody.session) return edgeBody.session as AuthSession;
    // If edge fails, try Express below
  }

  const res = await fetch('/api/billing/apply-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to apply plan.');
  return body.session as AuthSession;
}

export async function recordTransaction(input: {
  txnCode: string;
  planId: PlanId;
  billing: string;
  amountLabel?: string;
  status: 'success' | 'failed' | 'pending';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  message?: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  await supabase.from('transactions').insert({
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
}
