import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { AuthShell, AuthError, AuthLink } from '../components/AppHeader';
import { OtpResendControl } from '../components/OtpResendControl';

interface OtpLocationState {
  email?: string;
  mode?: 'signup' | 'reset';
}

export function VerifyOtpPage() {
  const { verifySignUpOtp, resendSignUpOtp, pendingSignup, hydratePendingSignup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state || {}) as OtpLocationState;

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const email =
    searchParams.get('email')?.trim().toLowerCase() ||
    state.email?.trim().toLowerCase() ||
    pendingSignup?.email;

  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
      return;
    }
    if (!pendingSignup || pendingSignup.email !== email) {
      void hydratePendingSignup(email);
      return;
    }
    // ERR-129: honor OTP expiry
    if (pendingSignup.expiresAt && Date.now() > pendingSignup.expiresAt) {
      setError('Code expired. Request a new one.');
    }
  }, [email, pendingSignup, hydratePendingSignup, navigate]);

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
    if (pendingSignup?.expiresAt && Date.now() > pendingSignup.expiresAt) {
      setError('Code expired. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      const session = await verifySignUpOtp(code, email);
      navigate(`/${session.userId}`, { replace: true });
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
        Check your inbox for the 6-digit verification code we sent you.
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
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold tracking-wide text-ink bg-accent hover:bg-accent-dim rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Verify & continue
        </button>
      </form>
      {email ? (
        <OtpResendControl
          email={email}
          kind="signup"
          onResend={() => resendSignUpOtp(email)}
        />
      ) : null}
      <p className="mt-6 text-sm text-mist text-center">
        Wrong email? <AuthLink to="/signup">Start over</AuthLink>
      </p>
    </AuthShell>
  );
}
