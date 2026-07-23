import type { PlanId } from './types';

/** Tokens spent per generation action (image, video submit, or edit). */
export const TOKENS_PER_GENERATION = 10;

/** Initial / plan allotments. `null` = unlimited. */
export const PLAN_TOKEN_ALLOTMENT: Record<PlanId, number | null> = {
  free: 30,
  starter: 1000,
  pro: 4500,
  enterprise: null,
};

export function initialTokensForPlan(planId: PlanId): number | null {
  return PLAN_TOKEN_ALLOTMENT[planId];
}

export function formatTokenBalance(tokens: number | null | undefined): string {
  if (tokens == null) return 'Unlimited';
  return String(Math.max(0, tokens));
}

export function hasEnoughTokens(tokens: number | null | undefined, cost = TOKENS_PER_GENERATION): boolean {
  if (tokens == null) return true; // unlimited
  return tokens >= cost;
}
