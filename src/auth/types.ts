export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  planId?: PlanId;
  /** Remaining tokens. `null` = unlimited (Enterprise). */
  tokens?: number | null;
}

export interface AuthSession {
  userId: string;
  name: string;
  email: string;
  planId: PlanId;
  /** Remaining tokens. `null` = unlimited (Enterprise). */
  tokens: number | null;
}

export interface PendingSignup {
  name: string;
  email: string;
  passwordHash: string;
  otp: string;
  expiresAt: number;
}

export interface PendingReset {
  email: string;
  otp: string;
  expiresAt: number;
  otpVerified?: boolean;
}

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function normalizePlanId(value: unknown): PlanId {
  if (value === 'starter' || value === 'pro' || value === 'enterprise') return value;
  return 'free';
}
