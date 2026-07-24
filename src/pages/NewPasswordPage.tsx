import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink, FieldLabel, PasswordInput } from '../components/AppHeader';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface NewPasswordState {
  email?: string;
}

/** True when the Supabase session came from recovery OTP / recovery email link. */
function isRecoverySession(session: {
  amr?: Array<{ method?: string }>;
} | null): boolean {
  if (!session) return false;
  const amr = session.amr;
  if (Array.isArray(amr) && amr.some((a) => /recovery|otp|magiclink/i.test(String(a?.method || '')))) {
    return true;
  }
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (/type=recovery/i.test(hash) || /type=recovery/i.test(search)) return true;
  }
  return false;
}

export function NewPasswordPage() {
  const { completePasswordReset, pendingReset, hydratePendingReset, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state || {}) as NewPasswordState;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryAllowed, setRecoveryAllowed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const email =
    searchParams.get('email')?.trim().toLowerCase() ||
    state.email?.trim().toLowerCase() ||
    pendingReset?.email;

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!authReady) return;

      let pending = pendingReset;
      if (email && (!pending || pending.email !== email)) {
        pending = await hydratePendingReset(email);
      }

      // ERR-144: only OTP-verified pending (from verifyResetOtp) OR a recovery session.
      if (pending?.otpVerified) {
        if (pending.expiresAt && Date.now() > pending.expiresAt) {
          if (!cancelled) {
            setError('Reset code expired. Request a new one.');
            setRecoveryAllowed(false);
            setCheckingSession(false);
          }
          return;
        }
        if (!cancelled) {
          setRecoveryAllowed(true);
          setCheckingSession(false);
        }
        return;
      }

      if (isSupabaseConfigured()) {
        try {
          const { data } = await getSupabase().auth.getSession();
          const session = data.session;
          const sessionEmail = session?.user?.email?.trim().toLowerCase();
          if (session && sessionEmail && (!email || sessionEmail === email) && isRecoverySession(session as { amr?: Array<{ method?: string }> })) {
            try {
              await getSupabase().rpc('mark_auth_pending_verified', {
                p_email: sessionEmail,
                p_kind: 'reset',
              });
            } catch {
              // pending must exist from startPasswordReset
            }
            const refreshed = await hydratePendingReset(sessionEmail);
            if (refreshed?.otpVerified || isRecoverySession(session as { amr?: Array<{ method?: string }> })) {
              if (!cancelled) {
                setRecoveryAllowed(true);
                setCheckingSession(false);
              }
              return;
            }
          }
        } catch {
          // fall through
        }
      }

      if (!cancelled) {
        setCheckingSession(false);
        const resetPath = email
          ? `/reset-otp?email=${encodeURIComponent(email)}`
          : '/reset-password';
        navigate(pending || email ? resetPath : '/reset-password', { replace: true });
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [authReady, pendingReset, email, hydratePendingReset, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const session = await completePasswordReset(password, email);
      navigate(`/${session.userId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || checkingSession || !recoveryAllowed) {
    return (
      <AuthShell title="New password" subtitle="Preparing password reset…">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="New password" subtitle="Choose a new password for your account">
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
        </div>
        <div>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save &amp; continue
        </button>
        <p className="text-center text-xs text-mist">
          <AuthLink to="/signin">Back to sign in</AuthLink>
        </p>
      </form>
    </AuthShell>
  );
}
