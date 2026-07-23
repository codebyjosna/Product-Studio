import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AuthSession, PendingReset, PendingSignup } from './types';
import {
  createUserFromPending,
  findUserByEmail,
  generateOtp,
  getPendingReset,
  getPendingSignup,
  getSession,
  hashPassword,
  setPendingReset,
  setPendingSignup,
  setSession,
  updatePassword,
} from './storage';

interface AuthContextValue {
  user: AuthSession | null;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  startSignUp: (name: string, email: string, password: string) => Promise<{ email: string; otp: string }>;
  verifySignUpOtp: (otp: string) => Promise<AuthSession>;
  startPasswordReset: (email: string) => Promise<{ email: string; otp: string }>;
  verifyResetOtp: (otp: string) => Promise<{ email: string }>;
  completePasswordReset: (newPassword: string) => Promise<AuthSession>;
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

  const value = useMemo<AuthContextValue>(() => ({
    user,
    pendingSignup,
    pendingReset,
    signIn: async (email, password) => {
      const existing = findUserByEmail(email);
      if (!existing) throw new Error('No account found with this email.');
      const passwordHash = await hashPassword(password);
      if (existing.passwordHash !== passwordHash) {
        throw new Error('Incorrect password.');
      }
      const session: AuthSession = {
        userId: existing.id,
        name: existing.name,
        email: existing.email,
      };
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
      const session: AuthSession = {
        userId: existing.id,
        name: existing.name,
        email: existing.email,
      };
      setSession(session);
      setUser(session);
      return session;
    },
    signOut: () => {
      setSession(null);
      setUser(null);
    },
  }), [user, pendingSignup, pendingReset]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
