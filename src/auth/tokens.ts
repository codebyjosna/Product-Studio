import type { PlanId } from './types';
import { getTokenAllotment } from '../lib/catalog';

/** Format a token balance for display. `null` = unlimited. */
export function formatTokenBalance(tokens: number | null | undefined): string {
  if (tokens == null) return 'Unlimited';
  return String(Math.max(0, tokens));
}

/** Whether the balance covers a generation cost (from catalog / AuthContext). */
export function hasEnoughTokens(tokens: number | null | undefined, cost: number): boolean {
  if (tokens == null) return true; // unlimited
  return tokens >= cost;
}

/** Resolve plan allotment from DB catalog (async). */
export async function initialTokensForPlan(planId: PlanId): Promise<number | null> {
  return getTokenAllotment(planId);
}
