/**
 * Legacy localStorage auth helpers were replaced by Supabase.
 * This module re-exports the Supabase-backed API for any remaining imports.
 */
export {
  getPendingSignup,
  setPendingSignup,
  getPendingReset,
  setPendingReset,
  consumeUserTokens,
  confirmPaymentAndApplyPlan,
  fetchSessionFromAuth as getSession,
  signOut,
} from './supabaseAuth';
