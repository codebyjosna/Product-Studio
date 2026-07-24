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
  last_sent_at?: string | null;
}

export interface OtpResendStatus {
  ok: boolean;
  retryAfterSeconds: number;
  cooldownSeconds: number;
  lastSentAt: string | null;
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
  opts?: { name?: string | null; ttlMinutes?: number }
): Promise<void> {
  const { error } = await getSupabase().rpc('upsert_auth_pending', {
    p_email: email,
    p_kind: kind,
    p_name: opts?.name ?? null,
    p_otp_verified: false,
    p_ttl_minutes: opts?.ttlMinutes ?? 10,
  });
  if (error) throw new Error(error.message);
}

/** Requires authenticated session whose email matches (after real OTP/recovery). */
async function markAuthPendingVerified(email: string, kind: AuthPendingKind): Promise<void> {
  const { error } = await getSupabase().rpc('mark_auth_pending_verified', {
    p_email: email,
    p_kind: kind,
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
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at).getTime() : undefined,
  };
}

function mapPendingReset(row: AuthPendingRow): PendingReset {
  return {
    email: row.email,
    expiresAt: new Date(row.expires_at).getTime(),
    otpVerified: !!row.otp_verified,
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at).getTime() : undefined,
  };
}

function mapResendStatus(raw: Record<string, unknown> | null | undefined): OtpResendStatus {
  return {
    ok: Boolean(raw?.ok),
    retryAfterSeconds: Number(raw?.retry_after_seconds) || 0,
    cooldownSeconds: Number(raw?.cooldown_seconds) || 60,
    lastSentAt: raw?.last_sent_at ? String(raw.last_sent_at) : null,
  };
}

export async function getOtpResendStatus(
  email: string,
  kind: AuthPendingKind
): Promise<OtpResendStatus> {
  assertConfigured();
  const { data, error } = await getSupabase().rpc('get_otp_resend_status', {
    p_email: email.trim().toLowerCase(),
    p_kind: kind,
  });
  if (error) throw new Error(error.message);
  return mapResendStatus(data as Record<string, unknown>);
}

async function claimOtpResend(email: string, kind: AuthPendingKind): Promise<OtpResendStatus> {
  const { data, error } = await getSupabase().rpc('claim_otp_resend', {
    p_email: email.trim().toLowerCase(),
    p_kind: kind,
    p_force_initial: false,
  });
  if (error) throw new Error(error.message);
  return mapResendStatus(data as Record<string, unknown>);
}

/** Resend signup confirmation OTP (server-enforced cooldown). */
export async function resendSignUpOtp(email: string): Promise<OtpResendStatus> {
  assertConfigured();
  const normalized = email.trim().toLowerCase();
  const gate = await claimOtpResend(normalized, 'signup');
  if (!gate.ok) {
    throw new Error(`Please wait ${gate.retryAfterSeconds}s before requesting another code.`);
  }

  const supabase = getSupabase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalized,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
    },
  });
  if (error) {
    // Roll back claim window slightly by not failing hard on auth errors after claim —
    // still surface the error to the user.
    mapAuthError(error, 'Could not resend verification code.');
  }
  return gate;
}

/** Resend password-recovery OTP (server-enforced cooldown). */
export async function resendResetOtp(email: string): Promise<OtpResendStatus> {
  assertConfigured();
  const normalized = email.trim().toLowerCase();
  const gate = await claimOtpResend(normalized, 'reset');
  if (!gate.ok) {
    throw new Error(`Please wait ${gate.retryAfterSeconds}s before requesting another code.`);
  }

  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/new-password` : undefined,
  });
  if (error) mapAuthError(error, 'Could not resend recovery code.');
  return gate;
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

  await upsertAuthPending(normalized, 'signup', { name: displayName });
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

  await upsertAuthPending(normalized, 'reset');
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

  // Session now exists for this email — server RPC marks verified (ERR-103).
  await markAuthPendingVerified(normalized, 'reset');
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
  const sessionUser = sessionData.session?.user;
  if (!sessionUser) {
    throw new Error('Verify your email code before setting a new password.');
  }

  const normalized =
    (email || sessionUser.email || '').trim().toLowerCase() || undefined;
  if (!normalized || normalized !== (sessionUser.email || '').trim().toLowerCase()) {
    throw new Error('Session email mismatch. Restart password reset.');
  }

  const pending = await getPendingReset(normalized);
  const amr = (sessionData.session as { amr?: Array<{ method?: string }> } | null)?.amr;
  const isRecovery =
    Array.isArray(amr) && amr.some((a) => /recovery|otp|magiclink/i.test(String(a?.method || '')));
  const hashRecovery =
    typeof window !== 'undefined' &&
    (/type=recovery/i.test(window.location.hash || '') ||
      /type=recovery/i.test(window.location.search || ''));

  // ERR-144: require verified pending (OTP UI) or a recovery session — never a normal password login.
  if (pending?.otpVerified) {
    // ok
  } else if (isRecovery || hashRecovery) {
    try {
      await markAuthPendingVerified(normalized, 'reset');
    } catch {
      throw new Error('Start password reset again, then open the email link or enter the code.');
    }
  } else {
    throw new Error('Verify your email code before setting a new password.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) mapAuthError(error, 'Could not update password.');

  await clearAuthPending(normalized, 'reset').catch(() => undefined);

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
