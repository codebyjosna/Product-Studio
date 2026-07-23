import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink, FieldLabel, PasswordInput } from '../components/AppHeader';

interface NewPasswordState {
  email?: string;
}

export function NewPasswordPage() {
  const { completePasswordReset, pendingReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as NewPasswordState;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const email = state.email || pendingReset?.email;

  useEffect(() => {
    if (!pendingReset?.otpVerified) {
      navigate(pendingReset ? '/reset-otp' : '/reset-password', { replace: true });
    }
  }, [pendingReset, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const session = await completePasswordReset(password);
      navigate(`/${session.userId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="New password"
      subtitle={email ? `Choose a new password for ${email}` : 'Choose a new password'}
    >
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Re-enter password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save & continue
        </button>
      </form>
      <p className="mt-6 text-sm text-mist text-center">
        <AuthLink to="/signin">Back to sign in</AuthLink>
      </p>
    </AuthShell>
  );
}
