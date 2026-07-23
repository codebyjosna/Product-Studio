import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../auth/AuthContext';
import type { AppPlan } from '../lib/catalog';
import { formatMoney, getFiscalForCountry, getPlanById, parseBilling, planPrice } from '../lib/catalog';
import { loadCheckoutDraft, type CheckoutDraft } from '../lib/checkoutDraft';
import { convertFromUsd } from '../lib/fx';
import { apiFetch, edgeFetch } from '../lib/api';
import { recordTransaction } from '../auth/profile';
import { normalizePlanId } from '../auth/types';
import { generateTxnId } from './TransactionSummaryPage';

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

type Fiscal = NonNullable<Awaited<ReturnType<typeof getFiscalForCountry>>>;

async function createRazorpayOrder(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);

  try {
    const edgeRes = await edgeFetch('create-razorpay-order', {
      method: 'POST',
      body: payload,
    });
    const edgeData = await edgeRes.json();
    if (edgeRes.ok) return edgeData;
  } catch {
    // Fall through to Express
  }

  const orderRes = await apiFetch('/api/razorpay/create-order', {
    method: 'POST',
    body: payload,
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(orderData.error || 'Failed to start Razorpay checkout.');
  }
  return orderData;
}

export function FinalSummaryPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const billing = parseBilling(searchParams.get('billing'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady, confirmPayment } = useAuth();

  const [plan, setPlan] = useState<AppPlan | null | undefined>(undefined);
  const [draft, setDraft] = useState<CheckoutDraft | null | undefined>(undefined);
  const [fiscal, setFiscal] = useState<Fiscal | null>(null);
  const [usdPrice, setUsdPrice] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingFx, setLoadingFx] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [foundPlan, loadedDraft] = await Promise.all([
          getPlanById(planId),
          loadCheckoutDraft(),
        ]);
        if (cancelled) return;
        setPlan(foundPlan ?? null);
        setDraft(loadedDraft);

        if (foundPlan) {
          const price = await planPrice(foundPlan, billing);
          if (!cancelled) setUsdPrice(price);
        }

        const country = loadedDraft?.address?.country;
        if (
          loadedDraft &&
          loadedDraft.planId === planId &&
          loadedDraft.billing === billing &&
          country
        ) {
          const f = await getFiscalForCountry(country);
          if (!cancelled) setFiscal(f);
        } else if (!cancelled) {
          setFiscal(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not load checkout.');
          setPlan(null);
          setDraft(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, billing]);

  const addressOk =
    !!draft &&
    draft.planId === planId &&
    draft.billing === billing &&
    !!draft.address?.country &&
    !!fiscal;

  useEffect(() => {
    if (!plan || !addressOk || !fiscal || !usdPrice) {
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
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load exchange rates.');
      } finally {
        if (!cancelled) setLoadingFx(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan, addressOk, fiscal, usdPrice]);

  if (!authReady || plan === undefined || draft === undefined) {
    return (
      <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </main>
      </div>
    );
  }
  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (!plan) return <Navigate to="/upgrade" replace />;
  if (!draft || draft.planId !== planId || draft.billing !== billing || !draft.address?.country) {
    return <Navigate to={`/order-summary/${planId}?billing=${billing}`} replace />;
  }

  const goToTransaction = async (status: 'success' | 'failed', message?: string, txnId?: string) => {
    if (!totals || !fiscal) return;
    const id = txnId || generateTxnId();
    const amountLabel = formatMoney(totals.total, fiscal);

    if (status === 'failed') {
      try {
        await recordTransaction({
          txnCode: id,
          planId: normalizePlanId(plan.id),
          billing,
          amountLabel,
          status: 'failed',
          message,
        });
      } catch {
        // Still navigate — page may show missing if insert failed
      }
    }

    setPaying(false);
    navigate(`/transaction-summary/${id}`, { replace: true });
  };

  const onPay = async () => {
    if (!totals || !fiscal) return;
    setError(null);
    setPaying(true);
    try {
      // Server computes pricing authority — do not send amountMinor/tax from client.
      const orderData = await createRazorpayOrder({
        planId: plan.id,
        billing,
        billingAddress: draft.address,
      });

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Could not load Razorpay payment gateway.');
      }

      const amountLabel = formatMoney(totals.total, fiscal);

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
        handler: (response) => {
          void (async () => {
            try {
              const { txnCode } = await confirmPayment({
                planId: plan.id,
                billing,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amountLabel,
              });
              await goToTransaction('success', undefined, txnCode);
            } catch (err: any) {
              await goToTransaction(
                'failed',
                err?.message || 'Payment could not be confirmed.'
              );
            }
          })();
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
        void goToTransaction('failed', msg);
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
              disabled={paying || loadingFx || !totals || !fiscal}
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
