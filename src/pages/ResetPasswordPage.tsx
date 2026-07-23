import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink, FieldLabel } from '../components/AppHeader';

export function ResetPasswordPage() {
  const { startPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await startPasswordReset(email);
      navigate('/reset-otp', {
        replace: true,
        state: { email: result.email, otp: result.otp },
      });
    } catch (err: any) {
      setError(err.message || 'Could not start reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter your email to receive a 6-digit code">
      <AuthError message={error} />
      <form onSubmit={onRequestCode} className="space-y-4">
        <div>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full bg-ink/70 border border-line text-fog px-3 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 placeholder:text-mist/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Send code
        </button>
      </form>
      <p className="mt-6 text-sm text-mist text-center">
        Remembered it? <AuthLink to="/signin">Sign in</AuthLink>
      </p>
    </AuthShell>
  );
}
