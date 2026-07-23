import type { AuthSession, PendingReset, PendingSignup } from './types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { getTokensPerGeneration } from '../lib/catalog';
import {
  confirmRazorpayPaymentViaApi,
  type ConfirmRazorpayPaymentPayload,
  consumeTokensRpc,
  fetchSessionFromAuth,
  profileToSession,
  fetchProfile,
} from './profile';

type AuthPendingKind = 'signup' | 'reset';

interface AuthPendingRow {
  email: string;
  kind: string;
  name: string | null;
  otp_verified: boolean;
  expires_at: string;
}

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (see supabase/README.md).'
    );
  }
}

function mapAuthError(error: { message: string } | null, fallback: string): never {
  const msg = error?.message || fallback;
  if (/already registered|already been registered/i.test(msg)) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  if (/invalid login credentials/i.test(msg)) {
    throw new Error('Incorrect email or password.');
  }
  if (/email not confirmed/i.test(msg)) {
    throw new Error('Confirm your email with the code we sent, then sign in.');
  }
  if (/Token has expired|otp_expired|expired/i.test(msg)) {
    throw new Error('Code expired. Request a new one.');
  }
  if (/Invalid token|token is invalid|otp_disabled/i.test(msg)) {
    throw new Error('Invalid verification code.');
  }
  throw new Error(msg);
}

async function upsertAuthPending(
  email: string,
  kind: AuthPendingKind,
  opts?: { name?: string | null; otpVerified?: boolean; ttlMinutes?: number }
): Promise<void> {
  const { error } = await getSupabase().rpc('upsert_auth_pending', {
    p_email: email,
    p_kind: kind,
    p_name: opts?.name ?? null,
    p_otp_verified: opts?.otpVerified ?? false,
    p_ttl_minutes: opts?.ttlMinutes ?? 10,
  });
  if (error) throw new Error(error.message);
}

async function clearAuthPending(email: string, kind: AuthPendingKind): Promise<void> {
  const { error } = await getSupabase().rpc('clear_auth_pending', {
    p_email: email,
    p_kind: kind,
  });
  if (error) throw new Error(error.message);
}

function mapPendingSignup(row: AuthPendingRow): PendingSignup {
  return {
    name: row.name || '',
    email: row.email,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

function mapPendingReset(row: AuthPendingRow): PendingReset {
  return {
    email: row.email,
    expiresAt: new Date(row.expires_at).getTime(),
    otpVerified: !!row.otp_verified,
  };
}

export async function getPendingSignup(email?: string): Promise<PendingSignup | null> {
  if (!email?.trim()) return null;
  assertConfigured();
  const { data, error } = await getSupabase().rpc('get_auth_pending', {
    p_email: email.trim().toLowerCase(),
    p_kind: 'signup',
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as AuthPendingRow | null | undefined;
  if (!row) return null;
  return mapPendingSignup(row);
}

export async function getPendingReset(email?: string): Promise<PendingReset | null> {
  if (!email?.trim()) return null;
  assertConfigured();
  const { data, error } = await getSupabase().rpc('get_auth_pending', {
    p_email: email.trim().toLowerCase(),
    p_kind: 'reset',
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as AuthPendingRow | null | undefined;
  if (!row) return null;
  return mapPendingReset(row);
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) mapAuthError(error, 'Sign in failed.');
  const session = await fetchSessionFromAuth();
  if (!session) throw new Error('Signed in but profile was not found.');
  return session;
}

export async function startSignUp(
  name: string,
  email: string,
  password: string
): Promise<{ email: string; pending: PendingSignup | null }> {
  assertConfigured();
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();
  const displayName = name.trim() || normalized.split('@')[0];

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: {
      data: { name: displayName },
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
    },
  });

  if (error) mapAuthError(error, 'Sign up failed.');

  // If email confirmation is disabled, session is already active.
  if (data.session) {
    await clearAuthPending(normalized, 'signup').catch(() => undefined);
    return { email: normalized, pending: null };
  }

  await upsertAuthPending(normalized, 'signup', { name: displayName, otpVerified: false });
  const pending = await getPendingSignup(normalized);
  return { email: normalized, pending };
}

export async function verifySignUpOtp(email: string, otp: string): Promise<AuthSession> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  const pending = await getPendingSignup(normalized);

  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: otp.trim(),
    type: 'signup',
  });
  if (error) {
    // Some projects use email OTP token type
    const retry = await supabase.auth.verifyOtp({
      email: normalized,
      token: otp.trim(),
      type: 'email',
    });
    if (retry.error) mapAuthError(error, 'Verification failed.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (pending?.name && user) {
    await supabase.from('profiles').update({ name: pending.name }).eq('id', user.id);
  }
  await clearAuthPending(normalized, 'signup').catch(() => undefined);

  const session = await fetchSessionFromAuth();
  if (!session) throw new Error('Verified, but session was not created.');
  return session;
}

export async function startPasswordReset(email: string): Promise<{ email: string; pending: PendingReset | null }> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/new-password` : undefined,
  });
  if (error) mapAuthError(error, 'Could not start password reset.');

  await upsertAuthPending(normalized, 'reset', { otpVerified: false });
  const pending = await getPendingReset(normalized);
  return { email: normalized, pending };
}

export async function verifyResetOtp(email: string, otp: string): Promise<{ email: string; pending: PendingReset | null }> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: otp.trim(),
    type: 'recovery',
  });
  if (error) mapAuthError(error, 'Invalid verification code.');

  await upsertAuthPending(normalized, 'reset', { otpVerified: true });
  const pending = await getPendingReset(normalized);
  return { email: normalized, pending };
}

export async function completePasswordReset(
  newPassword: string,
  email?: string
): Promise<AuthSession> {
  assertConfigured();
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');

  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const hasSession = !!sessionData.session;
  const normalized =
    (email || sessionData.session?.user?.email || '').trim().toLowerCase() || undefined;
  const pending = normalized ? await getPendingReset(normalized) : null;

  if (!pending?.otpVerified && !hasSession) {
    throw new Error('Verify your email code before setting a new password.');
  }

  // Recovery email link creates a session without going through OTP UI.
  if (hasSession && !pending?.otpVerified && normalized) {
    await upsertAuthPending(normalized, 'reset', { otpVerified: true });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) mapAuthError(error, 'Could not update password.');

  if (normalized) {
    await clearAuthPending(normalized, 'reset').catch(() => undefined);
  }

  const session = await fetchSessionFromAuth();
  if (!session) throw new Error('Password updated. Please sign in again.');
  return session;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  await supabase.auth.signOut();
  if (email) {
    await clearAuthPending(email, 'signup').catch(() => undefined);
    await clearAuthPending(email, 'reset').catch(() => undefined);
  }
}

export async function consumeUserTokens(cost?: number): Promise<
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'no_user' | 'insufficient' | 'error'; session: AuthSession | null }
> {
  try {
    const amount = cost ?? (await getTokensPerGeneration());
    const session = await consumeTokensRpc(amount);
    return { ok: true, session };
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT_TOKENS') {
      const session = await fetchSessionFromAuth();
      return { ok: false, reason: 'insufficient', session };
    }
    const session = await fetchSessionFromAuth();
    return { ok: false, reason: 'error', session };
  }
}

/** Confirm a verified Razorpay payment and apply the purchased plan (server-side). */
export async function confirmPaymentAndApplyPlan(
  payload: ConfirmRazorpayPaymentPayload
): Promise<{ session: AuthSession; txnCode: string; alreadyApplied?: boolean }> {
  return confirmRazorpayPaymentViaApi(payload);
}

export { fetchSessionFromAuth, fetchProfile, profileToSession };
export type { ConfirmRazorpayPaymentPayload };
