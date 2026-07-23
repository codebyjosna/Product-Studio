import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { getPlanById, parseBilling, planPrice } from '../data/plans';
import { loadCheckoutDraft } from '../lib/checkoutDraft';
import { convertFromUsd } from '../lib/fx';
import {
  formatMoney,
  getFiscalForCountry,
  toMinorUnits,
} from '../data/taxCurrency';
import {
  generateTxnId,
  saveTransactionResult,
  type TransactionResult,
} from './TransactionSummaryPage';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface Totals {
  planAmount: number;
  taxAmount: number;
  total: number;
  exchangeRate: number;
}

export function FinalSummaryPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const billing = parseBilling(searchParams.get('billing'));
  const plan = getPlanById(planId);
  const navigate = useNavigate();

  const draft = loadCheckoutDraft();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingFx, setLoadingFx] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressOk =
    !!draft &&
    draft.planId === planId &&
    draft.billing === billing &&
    !!draft.address?.country;

  const fiscal = addressOk ? getFiscalForCountry(draft.address.country) : null;
  const usdPrice = plan ? planPrice(plan, billing) : 0;

  useEffect(() => {
    if (!plan || !addressOk || !fiscal) {
      setLoadingFx(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingFx(true);
      try {
        const planAmount = await convertFromUsd(usdPrice, fiscal.currency);
        const taxAmount = planAmount * fiscal.taxRate;
        const total = planAmount + taxAmount;
        const exchangeRate = planAmount / usdPrice;
        if (!cancelled) {
          setTotals({ planAmount, taxAmount, total, exchangeRate });
        }
      } catch {
        if (!cancelled) setError('Could not load exchange rates.');
      } finally {
        if (!cancelled) setLoadingFx(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan, addressOk, fiscal?.currency, usdPrice]);

  if (!plan) return <Navigate to="/upgrade" replace />;
  if (!addressOk || !draft) {
    return <Navigate to={`/order-summary/${planId}?billing=${billing}`} replace />;
  }

  const goToTransaction = (status: 'success' | 'failed', message?: string) => {
    if (!totals || !fiscal) return;
    const txnId = generateTxnId();
    const result: TransactionResult = {
      status,
      txnId,
      planName: plan.name,
      planId: plan.id,
      billing,
      amountLabel: formatMoney(totals.total, fiscal),
      message,
      createdAt: new Date().toISOString(),
    };
    saveTransactionResult(result);
    setPaying(false);
    navigate(`/transaction-summary/${txnId}`, { replace: true, state: result });
  };

  const onPay = async () => {
    if (!totals || !fiscal) return;
    setError(null);
    setPaying(true);
    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billing,
          billingAddress: draft.address,
          currency: fiscal.currency,
          amountMinor: toMinorUnits(totals.total, fiscal.currency),
          planAmountMajor: totals.planAmount,
          taxAmountMajor: totals.taxAmount,
          totalMajor: totals.total,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to start Razorpay checkout.');
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Could not load Razorpay payment gateway.');
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Product Studio',
        description: `${plan.name} plan (${billing})`,
        order_id: orderData.orderId,
        prefill: {
          name: draft.address.name,
          email: draft.address.email,
        },
        theme: { color: '#2dd4bf' },
        handler: () => {
          goToTransaction('success');
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      rzp.on('payment.failed', (response: any) => {
        const msg =
          response?.error?.description ||
          response?.error?.reason ||
          'Payment was declined or could not be completed.';
        goToTransaction('failed', msg);
      });

      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Unable to open Razorpay.');
      setPaying(false);
    }
  };

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <AppHeader />

      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-lg rounded-2xl border border-line/90 bg-panel/75 backdrop-blur-xl p-6 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-2">
            Final summary
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-snow mb-6">
            Confirm &amp; pay
          </h1>

          <div className="rounded-xl border border-line bg-ink/50 p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Selected plan</span>
              <span className="text-sm font-semibold text-snow">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Country</span>
              <span className="text-sm font-semibold text-snow">{draft.address.country}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Currency</span>
              <span className="text-sm font-semibold text-snow">{fiscal?.currency}</span>
            </div>

            {loadingFx || !totals || !fiscal ? (
              <div className="flex items-center gap-2 py-4 text-mist text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Converting with live exchange rates…
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-sm text-mist">Plan amount</span>
                  <span className="text-sm font-semibold text-snow">
                    {formatMoney(totals.planAmount, fiscal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-mist">
                    {fiscal.taxLabel} ({(fiscal.taxRate * 100).toFixed(fiscal.taxRate * 100 % 1 ? 1 : 0)}%)
                  </span>
                  <span className="text-sm font-semibold text-snow">
                    {formatMoney(totals.taxAmount, fiscal)}
                  </span>
                </div>
                <div className="border-t border-line pt-3 flex items-end justify-between gap-3">
                  <span className="text-sm text-mist">Total</span>
                  <span className={`text-3xl font-extrabold tracking-tight ${plan.popular ? 'text-[#c8f542]' : 'text-snow'}`}>
                    {formatMoney(totals.total, fiscal)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-mist/70 pt-1">
                  Converted from ${usdPrice.toFixed(2)} USD @ {totals.exchangeRate.toFixed(4)} {fiscal.currency}/USD
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-line/70 bg-panel-elevated/40 p-4 mb-6 text-xs text-mist space-y-1 font-mono">
            <p className="text-fog font-sans text-sm font-medium mb-2">Bill to</p>
            <p>{draft.address.name}</p>
            <p>{draft.address.email}</p>
            <p>{draft.address.fullAddress}</p>
            <p>
              {draft.address.city}, {draft.address.state}
              {draft.address.pincode ? ` ${draft.address.pincode}` : ''}
            </p>
            <p>{draft.address.country}</p>
          </div>

          {error && (
            <p className="mb-4 text-xs font-mono text-danger bg-danger-soft/40 border border-danger/30 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate(`/order-summary/${plan.id}?billing=${billing}`)}
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg border border-line bg-panel-elevated/80 font-mono text-xs font-bold uppercase tracking-widest text-fog hover:text-snow hover:border-line-strong transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onPay}
              disabled={paying || loadingFx || !totals}
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim transition-colors disabled:opacity-60"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Proceed to pay
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
