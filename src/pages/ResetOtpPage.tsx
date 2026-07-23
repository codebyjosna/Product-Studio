import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink } from '../components/AppHeader';

interface ResetOtpState {
  email?: string;
  otp?: string;
}

export function ResetOtpPage() {
  const { verifyResetOtp, pendingReset, hydratePendingReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state || {}) as ResetOtpState;

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const email =
    searchParams.get('email')?.trim().toLowerCase() ||
    state.email?.trim().toLowerCase() ||
    pendingReset?.email;

  useEffect(() => {
    if (!email) {
      navigate('/reset-password', { replace: true });
      return;
    }
    if (!pendingReset || pendingReset.email !== email) {
      void hydratePendingReset(email);
    }
  }, [email, pendingReset, hydratePendingReset, navigate]);

  const focusAt = (index: number) => {
    inputsRef.current[index]?.focus();
  };

  const applyDigits = (next: string[]) => {
    setDigits(next);
    if (next.every((d) => d.length === 1)) {
      void submitCode(next.join(''));
    }
  };

  const onChangeDigit = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const next = [...digits];
      for (let i = 0; i < chars.length; i++) next[i] = chars[i];
      applyDigits(next);
      focusAt(Math.min(chars.length, 5));
      return;
    }
    const next = [...digits];
    next[index] = cleaned;
    applyDigits(next);
    if (index < 5) focusAt(index + 1);
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusAt(index - 1);
    }
  };

  const submitCode = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyResetOtp(code, email);
      navigate(`/new-password?email=${encodeURIComponent(result.email)}`, {
        replace: true,
        state: { email: result.email },
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setDigits(['', '', '', '', '', '']);
      focusAt(0);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    await submitCode(code);
  };

  return (
    <AuthShell
      title="Verify email"
      subtitle={email ? `Enter the 6-digit code sent to ${email}` : 'Enter your 6-digit verification code'}
    >
      <AuthError message={error} />
      <p className="mb-4 text-xs text-mist bg-panel-elevated/60 border border-line rounded-lg px-3 py-2">
        Enter the 6-digit recovery code from your email.
      </p>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputsRef.current[index] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              value={digit}
              onChange={(e) => onChangeDigit(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              className="w-11 h-12 md:w-12 md:h-14 text-center font-mono text-lg font-semibold bg-ink/70 border border-line rounded-lg text-snow focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Continue
        </button>
      </form>
      <p className="mt-6 text-sm text-mist text-center">
        Wrong email? <AuthLink to="/reset-password">Start over</AuthLink>
      </p>
    </AuthShell>
  );
}
