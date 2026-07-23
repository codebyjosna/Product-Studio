import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getOtpResendStatus, type OtpResendStatus } from '../auth/supabaseAuth';

interface OtpResendControlProps {
  email: string;
  kind: 'signup' | 'reset';
  onResend: () => Promise<OtpResendStatus | void>;
}

export function OtpResendControl({ email, kind, onResend }: OtpResendControlProps) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyStatus = useCallback((status: OtpResendStatus) => {
    setCooldown(status.cooldownSeconds || 60);
    setSecondsLeft(status.retryAfterSeconds > 0 ? status.retryAfterSeconds : 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await getOtpResendStatus(email, kind);
        if (!cancelled) applyStatus(status);
      } catch {
        if (!cancelled) {
          setSecondsLeft(cooldown);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, kind, applyStatus, cooldown]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setError(null);
    setMessage(null);
    setResending(true);
    try {
      const status = await onResend();
      if (status) applyStatus({ ...status, retryAfterSeconds: status.cooldownSeconds || cooldown });
      else setSecondsLeft(cooldown);
      setMessage('A new code has been sent.');
    } catch (err: any) {
      const msg = err?.message || 'Could not resend code.';
      setError(msg);
      const match = /wait (\d+)s/i.exec(msg);
      if (match) setSecondsLeft(Number(match[1]));
    } finally {
      setResending(false);
    }
  };

  const canResend = secondsLeft <= 0 && !resending;

  return (
    <div className="mt-4 text-center space-y-2">
      {message ? <p className="text-xs text-accent">{message}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {canResend ? (
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending}
          className="text-sm font-semibold text-accent hover:text-accent-dim transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Resend code
        </button>
      ) : (
        <p className="text-sm text-mist">
          Resend code in{' '}
          <span className="font-mono text-snow tabular-nums">
            {String(Math.floor(secondsLeft / 60)).padStart(1, '0')}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </span>
        </p>
      )}
    </div>
  );
}
