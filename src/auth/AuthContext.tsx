import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession, PendingReset, PendingSignup, PlanId } from './types';
import { normalizePlanId } from './types';
import { formatTokenBalance, hasEnoughTokens } from './tokens';
import { getTokensPerGeneration } from '../lib/catalog';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import {
  completePasswordReset as completePasswordResetApi,
  confirmPaymentAndApplyPlan,
  type ConfirmRazorpayPaymentPayload,
  consumeUserTokens,
  fetchSessionFromAuth,
  getPendingReset,
  getPendingSignup,
  signInWithPassword,
  signOut as signOutApi,
  startPasswordReset as startPasswordResetApi,
  startSignUp as startSignUpApi,
  resendSignUpOtp as resendSignUpOtpApi,
  resendResetOtp as resendResetOtpApi,
  verifyResetOtp as verifyResetOtpApi,
  verifySignUpOtp as verifySignUpOtpApi,
  type OtpResendStatus,
} from './supabaseAuth';

interface AuthContextValue {
  user: AuthSession | null;
  planId: PlanId;
  tokens: number | null;
  tokensLabel: string;
  generationCost: number;
  canGenerate: boolean;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  startSignUp: (name: string, email: string, password: string) => Promise<{ email: string; session?: AuthSession }>;
  verifySignUpOtp: (otp: string, email?: string) => Promise<AuthSession>;
  resendSignUpOtp: (email?: string) => Promise<OtpResendStatus>;
  startPasswordReset: (email: string) => Promise<{ email: string }>;
  verifyResetOtp: (otp: string, email?: string) => Promise<{ email: string }>;
  resendResetOtp: (email?: string) => Promise<OtpResendStatus>;
  completePasswordReset: (newPassword: string, email?: string) => Promise<AuthSession>;
  /** Verify Razorpay payment server-side and apply the purchased plan. */
  confirmPayment: (
    payload: ConfirmRazorpayPaymentPayload
  ) => Promise<{ session: AuthSession; txnCode: string; alreadyApplied?: boolean }>;
  /** Deduct generation tokens. Returns false if insufficient / not signed in. Prefer server charging for generate routes. */
  consumeTokens: (cost?: number) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  /** Hydrate pending signup from DB when landing with ?email= */
  hydratePendingSignup: (email: string) => Promise<PendingSignup | null>;
  /** Hydrate pending reset from DB when landing with ?email= */
  hydratePendingReset: (email: string) => Promise<PendingReset | null>;
  pendingSignup: PendingSignup | null;
  pendingReset: PendingReset | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [generationCost, setGenerationCost] = useState(10);
  const [pendingSignup, setPendingSignupState] = useState<PendingSignup | null>(null);
  const [pendingReset, setPendingResetState] = useState<PendingReset | null>(null);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      return;
    }
    try {
      const session = await fetchSessionFromAuth();
      setUser(session);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!isSupabaseConfigured()) {
        if (mounted) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const [session, tokensCost] = await Promise.all([
          fetchSessionFromAuth(),
          getTokensPerGeneration().catch(() => 10),
        ]);
        if (mounted) {
          setUser(session);
          setGenerationCost(tokensCost);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    void boot();

    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      void (async () => {
        try {
          const next = await fetchSessionFromAuth();
          if (mounted) setUser(next);
        } catch {
          if (mounted) setUser(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      authReady,
      planId: user ? normalizePlanId(user.planId) : 'free',
      tokens: user ? user.tokens : null,
      tokensLabel: user ? formatTokenBalance(user.tokens) : '—',
      generationCost,
      canGenerate: user ? hasEnoughTokens(user.tokens, generationCost) : false,
      pendingSignup,
      pendingReset,
      refreshSession,
      hydratePendingSignup: async (email) => {
        const pending = await getPendingSignup(email);
        setPendingSignupState(pending);
        return pending;
      },
      hydratePendingReset: async (email) => {
        const pending = await getPendingReset(email);
        setPendingResetState(pending);
        return pending;
      },
      signIn: async (email, password) => {
        const session = await signInWithPassword(email, password);
        setUser(session);
        return session;
      },
      startSignUp: async (name, email, password) => {
        const result = await startSignUpApi(name, email, password);
        setPendingSignupState(result.pending);
        const session = await fetchSessionFromAuth();
        if (session) {
          setUser(session);
          return { email: result.email, session };
        }
        return { email: result.email };
      },
      verifySignUpOtp: async (otp, email) => {
        const target = email || pendingSignup?.email;
        if (!target) throw new Error('Signup session expired. Please sign up again.');
        const session = await verifySignUpOtpApi(target, otp);
        setPendingSignupState(null);
        setUser(session);
        return session;
      },
      resendSignUpOtp: async (email) => {
        const target = email || pendingSignup?.email;
        if (!target) throw new Error('Signup session expired. Please sign up again.');
        const status = await resendSignUpOtpApi(target);
        const pending = await getPendingSignup(target);
        setPendingSignupState(pending);
        return status;
      },
      startPasswordReset: async (email) => {
        const result = await startPasswordResetApi(email);
        setPendingResetState(result.pending);
        return { email: result.email };
      },
      verifyResetOtp: async (otp, email) => {
        const target = email || pendingReset?.email;
        if (!target) throw new Error('Reset session expired. Please try again.');
        const result = await verifyResetOtpApi(target, otp);
        setPendingResetState(result.pending);
        return { email: result.email };
      },
      resendResetOtp: async (email) => {
        const target = email || pendingReset?.email;
        if (!target) throw new Error('Reset session expired. Please try again.');
        const status = await resendResetOtpApi(target);
        const pending = await getPendingReset(target);
        setPendingResetState(pending);
        return status;
      },
      completePasswordReset: async (newPassword, email) => {
        const target = email || pendingReset?.email;
        const session = await completePasswordResetApi(newPassword, target);
        setPendingResetState(null);
        setUser(session);
        return session;
      },
      confirmPayment: async (payload) => {
        const result = await confirmPaymentAndApplyPlan(payload);
        setUser(result.session);
        return result;
      },
      consumeTokens: async (cost = generationCost) => {
        if (!user) return false;
        const result = await consumeUserTokens(cost);
        if (result.session) setUser(result.session);
        return result.ok;
      },
      signOut: async () => {
        await signOutApi();
        setUser(null);
        setPendingSignupState(null);
        setPendingResetState(null);
      },
    };
  }, [user, authReady, generationCost, pendingSignup, pendingReset, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
