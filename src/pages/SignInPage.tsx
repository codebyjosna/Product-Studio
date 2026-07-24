import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink, FieldLabel, PasswordInput } from '../components/AppHeader';
import { SeoHead } from '../components/SeoHead';

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from;
  const fromGenerate = fromPath === 'generate';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await signIn(email, password);
      // ERR-107: return to checkout / internal path when provided
      const safeFrom =
        typeof fromPath === 'string' &&
        fromPath.startsWith('/') &&
        !fromPath.startsWith('//') &&
        fromPath !== 'generate'
          ? fromPath
          : null;
      navigate(safeFrom || `/${session.userId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SeoHead page="signin" />
    <AuthShell
      title="Sign in"
      subtitle={
        fromGenerate
          ? 'Sign in to generate images and videos in Product Studio'
          : 'Welcome back to Product Studio'
      }
    >
      {fromGenerate && (
        <p className="mb-4 text-xs font-mono text-accent/90 bg-accent/10 border border-accent/25 rounded-lg px-3 py-2">
          Generation requires an account. Sign in to continue.
        </p>
      )}
      <AuthError message={error} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="signin-email">Email</FieldLabel>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="w-full bg-ink/70 border border-line text-fog px-3 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 placeholder:text-mist/40"
          />
        </div>
        <div>
          <FieldLabel htmlFor="signin-password">Password</FieldLabel>
          <PasswordInput
            id="signin-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>
        <div className="flex justify-end">
          <AuthLink to="/reset-password">Reset password</AuthLink>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-mist text-center">
        Don&apos;t have an account? <AuthLink to="/signup">Sign up</AuthLink>
      </p>
    </AuthShell>
    </>
  );
}
