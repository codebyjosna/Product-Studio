import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession, PendingReset, PendingSignup, PlanId } from './types';
import { normalizePlanId } from './types';
import {
  TOKENS_PER_GENERATION,
  formatTokenBalance,
  hasEnoughTokens,
} from './tokens';
import {
  consumeUserTokens,
  createUserFromPending,
  ensureUserTokens,
  findUserByEmail,
  generateOtp,
  getPendingReset,
  getPendingSignup,
  getSession,
  hashPassword,
  setPendingReset,
  setPendingSignup,
  setSession,
  toSession,
  updatePassword,
  updateUserPlan,
} from './storage';

interface AuthContextValue {
  user: AuthSession | null;
  planId: PlanId;
  tokens: number | null;
  tokensLabel: string;
  generationCost: number;
  canGenerate: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  startSignUp: (name: string, email: string, password: string) => Promise<{ email: string; otp: string }>;
  verifySignUpOtp: (otp: string) => Promise<AuthSession>;
  startPasswordReset: (email: string) => Promise<{ email: string; otp: string }>;
  verifyResetOtp: (otp: string) => Promise<{ email: string }>;
  completePasswordReset: (newPassword: string) => Promise<AuthSession>;
  setPlan: (planId: PlanId) => void;
  /** Returns true if tokens were consumed; false if insufficient / no user. */
  consumeTokens: (cost?: number) => boolean;
  signOut: () => void;
  pendingSignup: PendingSignup | null;
  pendingReset: PendingReset | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const OTP_TTL_MS = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(() => getSession());
  const [pendingSignup, setPendingSignupState] = useState<PendingSignup | null>(() => getPendingSignup());
  const [pendingReset, setPendingResetState] = useState<PendingReset | null>(() => getPendingReset());

  // Backfill tokens for older sessions/users once per login
  useEffect(() => {
    if (!user) return;
    const refreshed = ensureUserTokens(user.userId);
    if (
      refreshed &&
      (refreshed.tokens !== user.tokens || refreshed.planId !== user.planId)
    ) {
      setUser(refreshed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const value = useMemo<AuthContextValue>(() => {
    const tokens = user ? user.tokens : null;
    return {
      user,
      planId: user ? normalizePlanId(user.planId) : 'free',
      tokens: user ? user.tokens : null,
      tokensLabel: user ? formatTokenBalance(user.tokens) : '—',
      generationCost: TOKENS_PER_GENERATION,
      canGenerate: user ? hasEnoughTokens(user.tokens) : false,
      pendingSignup,
      pendingReset,
      signIn: async (email, password) => {
        const existing = findUserByEmail(email);
        if (!existing) throw new Error('No account found with this email.');
        const passwordHash = await hashPassword(password);
        if (existing.passwordHash !== passwordHash) {
          throw new Error('Incorrect password.');
        }
        let session = toSession(existing);
        // Persist resolved tokens onto user record if missing
        const ensured = ensureUserTokens(existing.id);
        if (ensured) session = ensured;
        setSession(session);
        setUser(session);
        return session;
      },
      startSignUp: async (name, email, password) => {
        const normalized = email.trim().toLowerCase();
        if (findUserByEmail(normalized)) {
          throw new Error('An account with this email already exists. Sign in instead.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const otp = generateOtp();
        const pending: PendingSignup = {
          name: name.trim(),
          email: normalized,
          passwordHash: await hashPassword(password),
          otp,
          expiresAt: Date.now() + OTP_TTL_MS,
        };
        setPendingSignup(pending);
        setPendingSignupState(pending);
        return { email: normalized, otp };
      },
      verifySignUpOtp: async (otp) => {
        const pending = getPendingSignup();
        if (!pending) throw new Error('Signup session expired. Please sign up again.');
        if (pending.otp !== otp.trim()) throw new Error('Invalid verification code.');
        const session = createUserFromPending(pending);
        setPendingSignupState(null);
        setUser(session);
        return session;
      },
      startPasswordReset: async (email) => {
        const normalized = email.trim().toLowerCase();
        const existing = findUserByEmail(normalized);
        if (!existing) throw new Error('No account found with this email.');
        const otp = generateOtp();
        const pending: PendingReset = {
          email: normalized,
          otp,
          expiresAt: Date.now() + OTP_TTL_MS,
          otpVerified: false,
        };
        setPendingReset(pending);
        setPendingResetState(pending);
        return { email: normalized, otp };
      },
      verifyResetOtp: async (otp) => {
        const pending = getPendingReset();
        if (!pending) throw new Error('Reset session expired. Please try again.');
        if (pending.otp !== otp.trim()) throw new Error('Invalid verification code.');
        const verified: PendingReset = {
          ...pending,
          otpVerified: true,
          expiresAt: Date.now() + OTP_TTL_MS,
        };
        setPendingReset(verified);
        setPendingResetState(verified);
        return { email: pending.email };
      },
      completePasswordReset: async (newPassword) => {
        const pending = getPendingReset();
        if (!pending) throw new Error('Reset session expired. Please try again.');
        if (!pending.otpVerified) throw new Error('Verify your email code before setting a new password.');
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
        await updatePassword(pending.email, newPassword);
        setPendingResetState(null);
        const existing = findUserByEmail(pending.email);
        if (!existing) throw new Error('Account not found.');
        const session = ensureUserTokens(existing.id) ?? toSession(existing);
        setSession(session);
        setUser(session);
        return session;
      },
      setPlan: (planId) => {
        if (!user) return;
        const session = updateUserPlan(user.userId, planId);
        if (session) setUser(session);
      },
      consumeTokens: (cost = TOKENS_PER_GENERATION) => {
        if (!user) return false;
        const result = consumeUserTokens(user.userId, cost);
        if (result.session) setUser(result.session);
        return result.ok;
      },
      signOut: () => {
        setSession(null);
        setUser(null);
      },
    };
  }, [user, pendingSignup, pendingReset]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
