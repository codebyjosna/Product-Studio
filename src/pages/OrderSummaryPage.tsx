import React, { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CountrySelect } from '../components/CountrySelect';
import { getPlanById, parseBilling, planPrice } from '../data/plans';
import { useAuth } from '../auth/AuthContext';
import { saveCheckoutDraft } from '../lib/checkoutDraft';

const fieldClass =
  'w-full bg-ink/70 border border-line text-fog px-3 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 placeholder:text-mist/40';

function FieldLabel({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-mono uppercase tracking-wider text-mist mb-1.5">
      {children}
      {optional && <span className="ml-1 normal-case tracking-normal text-mist/60">(optional)</span>}
    </label>
  );
}

export function OrderSummaryPage() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const billing = parseBilling(searchParams.get('billing'));
  const plan = getPlanById(planId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('');

  if (!plan) {
    return <Navigate to="/upgrade" replace />;
  }

  const price = planPrice(plan, billing);
  const periodLabel = billing === 'monthly' ? 'Monthly' : 'Annual';

  const onNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !fullAddress.trim() || !city.trim() || !state.trim() || !country.trim()) {
      setError('Please fill in all required billing fields.');
      return;
    }

    saveCheckoutDraft({
      planId: plan.id,
      billing,
      address: {
        name: name.trim(),
        email: email.trim(),
        fullAddress: fullAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim() || undefined,
        country: country.trim(),
      },
    });

    navigate(`/final-summary/${plan.id}?billing=${billing}`);
  };

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <AppHeader />

      <main className="flex-1 flex items-start justify-center p-6 md:p-10 overflow-y-auto">
        <form
          onSubmit={onNext}
          className="w-full max-w-lg rounded-2xl border border-line/90 bg-panel/75 backdrop-blur-xl p-6 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] my-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-2">
            Order summary
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-snow mb-1">
            {plan.name} plan
          </h1>
          <p className="text-sm text-mist mb-6">{plan.tagline}</p>

          <div className="rounded-xl border border-line bg-ink/50 p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Plan</span>
              <span className="text-sm font-semibold text-snow">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Billing</span>
              <span className="text-sm font-semibold text-snow">{periodLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Access</span>
              <span className="text-sm font-semibold text-snow">{plan.duration}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-mist">Tokens</span>
              <span className="text-sm font-semibold text-snow">{plan.tokens}</span>
            </div>
            <div className="border-t border-line pt-3 flex items-end justify-between gap-3">
              <span className="text-sm text-mist">List price (USD)</span>
              <div className="text-right">
                <span className={`text-3xl font-extrabold tracking-tight ${plan.popular ? 'text-[#c8f542]' : 'text-snow'}`}>
                  ${price}
                </span>
                <span className="ml-1 text-xs font-mono text-mist">
                  {billing === 'monthly' ? '/ mo' : '/ yr'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-mist mb-2">Included</p>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-fog">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fog mb-4">
              Billing address
            </h2>
            <div className="space-y-3.5">
              <div>
                <FieldLabel htmlFor="bill-name">Name</FieldLabel>
                <input
                  id="bill-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Full name"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="bill-email">Email</FieldLabel>
                <input
                  id="bill-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="bill-address">Full address</FieldLabel>
                <textarea
                  id="bill-address"
                  required
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  autoComplete="street-address"
                  placeholder="Street, building, landmark"
                  className={`${fieldClass} resize-none`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel htmlFor="bill-city">City</FieldLabel>
                  <input
                    id="bill-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                    placeholder="City"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bill-state">State</FieldLabel>
                  <input
                    id="bill-state"
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    autoComplete="address-level1"
                    placeholder="State / emirate"
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel htmlFor="bill-pincode" optional>
                    Pincode
                  </FieldLabel>
                  <input
                    id="bill-pincode"
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    autoComplete="postal-code"
                    placeholder="If applicable"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="bill-country">Country</FieldLabel>
                  <CountrySelect
                    id="bill-country"
                    value={country}
                    onChange={setCountry}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-xs font-mono text-danger bg-danger-soft/40 border border-danger/30 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/upgrade')}
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg border border-line bg-panel-elevated/80 font-mono text-xs font-bold uppercase tracking-widest text-fog hover:text-snow hover:border-line-strong transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-lg font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim transition-colors"
            >
              Next
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
