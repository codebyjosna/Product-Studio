/**
 * Legacy auth storage helpers — pending signup/reset now live in Supabase
 * (`auth_pending` via RPCs) and React state in AuthContext. No browser storage.
 */
export {
  getPendingSignup,
  getPendingReset,
  consumeUserTokens,
  confirmPaymentAndApplyPlan,
  fetchSessionFromAuth as getSession,
  signOut,
} from './supabaseAuth';
