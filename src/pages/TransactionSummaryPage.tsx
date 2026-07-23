import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Home, RotateCcw, X } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../auth/AuthContext';
import { clearCheckoutDraft } from '../lib/checkoutDraft';
import { normalizePlanId } from '../auth/types';

export type TxnStatus = 'success' | 'failed';

export interface TransactionResult {
  status: TxnStatus;
  txnId: string;
  planName: string;
  planId: string;
  billing: string;
  amountLabel: string;
  message?: string;
  createdAt: string;
}

const STORE_PREFIX = 'ps_txn_';

export function saveTransactionResult(result: TransactionResult) {
  sessionStorage.setItem(STORE_PREFIX + result.txnId, JSON.stringify(result));
}

export function loadTransactionResult(txnId: string): TransactionResult | null {
  try {
    const raw = sessionStorage.getItem(STORE_PREFIX + txnId);
    if (!raw) return null;
    return JSON.parse(raw) as TransactionResult;
  } catch {
    return null;
  }
}

export function generateTxnId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < 12; i++) id += chars[bytes[i] % chars.length];
  return id;
}

export function TransactionSummaryPage() {
  const { txnId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setPlan } = useAuth();

  const result = useMemo(() => {
    const fromState = location.state as TransactionResult | null;
    if (fromState?.txnId && fromState.txnId === txnId) return fromState;
    if (txnId) return loadTransactionResult(txnId);
    return null;
  }, [location.state, txnId]);

  useEffect(() => {
    if (result?.status === 'success') {
      clearCheckoutDraft();
      if (user) {
        const plan = normalizePlanId(result.planId);
        setPlan(plan);
      }
    }
  }, [result?.status, result?.planId, user, setPlan]);

  if (!txnId || !result) {
    return <Navigate to="/" replace />;
  }

  const success = result.status === 'success';

  const goHome = () => {
    clearCheckoutDraft();
    if (user) navigate(`/${user.userId}`);
    else navigate('/');
  };

  const retry = () => {
    navigate(`/final-summary/${result.planId}?billing=${result.billing}`);
  };

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
        {success && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-sm bg-accent/70"
                style={{
                  left: `${8 + (i * 7) % 84}%`,
                  top: `${20 + (i * 11) % 60}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.2, 0.2],
                  y: [0, -40 - (i % 5) * 12, -80],
                  rotate: [0, 40 + i * 8],
                }}
                transition={{ duration: 1.6, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-line/90 bg-panel/80 backdrop-blur-xl p-6 md:p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {success ? (
            <div className="mb-6 flex justify-center">
              <div className="relative h-24 w-24">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-accent/30"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.6, 1.35, 1.15], opacity: [0, 0.7, 0] }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-accent/40"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: [0.7, 1.55], opacity: [0.5, 0] }}
                  transition={{ duration: 1.4, delay: 0.1, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-accent/15 border border-accent/50 flex items-center justify-center"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.2 }}
                  >
                    <Check className="w-10 h-10 text-accent" strokeWidth={3} />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-center">
              <motion.div
                className="h-24 w-24 rounded-full bg-danger/15 border border-danger/40 flex items-center justify-center"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              >
                <X className="w-10 h-10 text-danger" strokeWidth={3} />
              </motion.div>
            </div>
          )}

          <motion.h1
            className={`text-2xl md:text-3xl font-extrabold tracking-tight mb-2 ${
              success ? 'text-snow' : 'text-snow'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {success ? 'Payment successful' : 'Payment failed'}
          </motion.h1>

          <motion.p
            className="text-sm text-mist mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {success
              ? 'Your plan is confirmed. Thanks for upgrading Product Studio.'
              : result.message || 'Something went wrong while processing your payment.'}
          </motion.p>

          <motion.div
            className="rounded-xl border border-line bg-ink/50 p-4 mb-6 text-left space-y-2.5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-mist">Transaction ID</span>
              <span className="font-mono font-semibold tracking-wider text-accent">{result.txnId}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-mist">Status</span>
              <span className={`font-semibold ${success ? 'text-ok' : 'text-danger'}`}>
                {success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-mist">Plan</span>
              <span className="font-semibold text-snow">{result.planName}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-mist">Amount</span>
              <span className="font-semibold text-snow">{result.amountLabel}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-mist">Time</span>
              <span className="font-mono text-xs text-fog">
                {new Date(result.createdAt).toLocaleString()}
              </span>
            </div>
          </motion.div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {success ? (
              <button
                type="button"
                onClick={goHome}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim transition-colors"
              >
                <Home className="w-4 h-4" />
                Back to home
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goHome}
                  className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg border border-line bg-panel-elevated/80 font-mono text-xs font-bold uppercase tracking-widest text-fog hover:text-snow hover:border-line-strong transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Back to home
                </button>
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
