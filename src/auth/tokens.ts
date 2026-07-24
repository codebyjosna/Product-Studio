import type { PlanId } from './types';
import { getTokenAllotment } from '../lib/catalog';

/** Format a token balance for display. `null` = unlimited (enterprise only). */
export function formatTokenBalance(tokens: number | null | undefined, planId?: string): string {
  if (tokens == null && planId === 'enterprise') return 'Unlimited';
  if (tokens == null) return '0';
  return String(Math.max(0, tokens));
}

/** Whether the balance covers a generation cost (from catalog / AuthContext). */
export function hasEnoughTokens(
  tokens: number | null | undefined,
  cost: number,
  planId?: string
): boolean {
  // ERR-121: only enterprise null means unlimited
  if (tokens == null) return planId === 'enterprise';
  return tokens >= cost;
}

/** Resolve plan allotment from DB catalog (async). */
export async function initialTokensForPlan(planId: PlanId): Promise<number | null> {
  return getTokenAllotment(planId);
}
