import type { AuthSession, PendingReset, PendingSignup, PlanId } from './types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  applyPlanViaApi,
  consumeTokensRpc,
  fetchSessionFromAuth,
  profileToSession,
  fetchProfile,
} from './profile';
import { TOKENS_PER_GENERATION } from './tokens';

const PENDING_SIGNUP_KEY = 'ps_pending_signup';
const PENDING_RESET_KEY = 'ps_pending_reset';

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown | null) {
  if (value == null) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function getPendingSignup(): PendingSignup | null {
  return readJson<PendingSignup>(PENDING_SIGNUP_KEY);
}

export function setPendingSignup(pending: PendingSignup | null) {
  writeJson(PENDING_SIGNUP_KEY, pending);
}

export function getPendingReset(): PendingReset | null {
  return readJson<PendingReset>(PENDING_RESET_KEY);
}

export function setPendingReset(pending: PendingReset | null) {
  writeJson(PENDING_RESET_KEY, pending);
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
): Promise<{ email: string }> {
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
    setPendingSignup(null);
    return { email: normalized };
  }

  setPendingSignup({
    name: displayName,
    email: normalized,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return { email: normalized };
}

export async function verifySignUpOtp(email: string, otp: string): Promise<AuthSession> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

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

  const pending = getPendingSignup();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (pending?.name && user) {
    await supabase.from('profiles').update({ name: pending.name }).eq('id', user.id);
  }
  setPendingSignup(null);

  const session = await fetchSessionFromAuth();
  if (!session) throw new Error('Verified, but session was not created.');
  return session;
}

export async function startPasswordReset(email: string): Promise<{ email: string }> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/new-password` : undefined,
  });
  if (error) mapAuthError(error, 'Could not start password reset.');

  setPendingReset({
    email: normalized,
    expiresAt: Date.now() + 10 * 60 * 1000,
    otpVerified: false,
  });

  return { email: normalized };
}

export async function verifyResetOtp(email: string, otp: string): Promise<{ email: string }> {
  assertConfigured();
  const supabase = getSupabase();
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: otp.trim(),
    type: 'recovery',
  });
  if (error) mapAuthError(error, 'Invalid verification code.');

  setPendingReset({
    email: normalized,
    expiresAt: Date.now() + 10 * 60 * 1000,
    otpVerified: true,
  });

  return { email: normalized };
}

export async function completePasswordReset(newPassword: string): Promise<AuthSession> {
  assertConfigured();
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');

  const pending = getPendingReset();
  if (!pending?.otpVerified) {
    throw new Error('Verify your email code before setting a new password.');
  }

  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) mapAuthError(error, 'Could not update password.');

  setPendingReset(null);
  const session = await fetchSessionFromAuth();
  if (!session) throw new Error('Password updated. Please sign in again.');
  return session;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  await supabase.auth.signOut();
  setPendingSignup(null);
  setPendingReset(null);
}

export async function consumeUserTokens(cost = TOKENS_PER_GENERATION): Promise<
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'no_user' | 'insufficient'; session: AuthSession | null }
> {
  try {
    const session = await consumeTokensRpc(cost);
    return { ok: true, session };
  } catch (e: any) {
    if (e?.message === 'INSUFFICIENT_TOKENS') {
      const session = await fetchSessionFromAuth();
      return { ok: false, reason: 'insufficient', session };
    }
    const session = await fetchSessionFromAuth();
    return { ok: false, reason: 'no_user', session };
  }
}

export async function setUserPlan(planId: PlanId): Promise<AuthSession> {
  return applyPlanViaApi(planId);
}

export { fetchSessionFromAuth, fetchProfile, profileToSession };
