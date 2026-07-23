import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Hexagon, Triangle, Circle } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { SeoHead } from '../components/SeoHead';
import { Billing, PLANS, Plan, planPrice } from '../data/plans';

function PlanIcon({ type, popular }: { type: Plan['icon']; popular?: boolean }) {
  const color = popular ? 'text-[#c8f542]' : 'text-sky-400';
  const ring = popular
    ? 'border-[#c8f542]/40 bg-[#c8f542]/10 shadow-[0_0_24px_rgba(200,245,66,0.25)]'
    : 'border-sky-400/35 bg-sky-400/10';

  const Icon = type === 'triangle' ? Triangle : type === 'hex' ? Hexagon : Circle;

  return (
    <div className={`absolute -top-7 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full border flex items-center justify-center ${ring}`}>
      <Icon className={`w-6 h-6 ${color}`} strokeWidth={2.25} fill="currentColor" fillOpacity={0.15} />
    </div>
  );
}

export function UpgradePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const needsTokens = (location.state as { reason?: string } | null)?.reason === 'tokens';
  const [billing, setBilling] = useState<Billing>('monthly');

  const periodLabel = billing === 'monthly' ? '/ MO' : '/ YR';

  const selectPlan = (planId: string) => {
    navigate(`/order-summary/${planId}?billing=${billing}`);
  };

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <SeoHead page="upgrade" />
      <AppHeader />

      <main className="relative flex-1 overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(56,189,248,0.35), transparent 28%),
              radial-gradient(circle at 80% 70%, rgba(45,212,191,0.2), transparent 32%),
              linear-gradient(135deg, transparent 48%, rgba(56,189,248,0.08) 49%, rgba(56,189,248,0.08) 51%, transparent 52%),
              linear-gradient(45deg, transparent 48%, rgba(148,163,184,0.06) 49%, rgba(148,163,184,0.06) 51%, transparent 52%)
            `,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-12 md:py-16">
          {needsTokens && (
            <div className="mb-8 mx-auto max-w-xl text-center rounded-xl border border-warn/35 bg-warn/10 px-4 py-3 text-sm text-warn">
              You&apos;re out of tokens. Upgrade a plan to keep generating.
            </div>
          )}
          <div className="text-center mb-10 md:mb-12">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-snow mb-6">
              Flexible pricing for teams of all sizes.
            </h1>

            <div className="inline-flex items-center rounded-full border border-line bg-panel/80 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-5 py-2 rounded-full text-[11px] font-mono font-semibold uppercase tracking-[0.18em] transition-colors ${
                  billing === 'monthly'
                    ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                    : 'text-mist hover:text-snow'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-5 py-2 rounded-full text-[11px] font-mono font-semibold uppercase tracking-[0.18em] transition-colors ${
                  billing === 'annual'
                    ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                    : 'text-mist hover:text-snow'
                }`}
              >
                Annual
              </button>
            </div>
            {billing === 'annual' && (
              <p className="mt-3 text-xs font-mono text-accent">2 months free with annual billing</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 lg:items-stretch pt-8">
            {PLANS.map((plan) => {
              const price = planPrice(plan, billing);
              const popular = !!plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-[1.75rem] border px-6 pb-6 pt-12 ${
                    popular
                      ? 'lg:-mt-4 lg:mb-[-1rem] border-sky-400/35 bg-gradient-to-b from-sky-500/20 via-panel/90 to-panel shadow-[0_0_50px_rgba(56,189,248,0.12)]'
                      : 'border-line/90 bg-panel/75 backdrop-blur-md'
                  }`}
                >
                  <PlanIcon type={plan.icon} popular={popular} />

                  <div className="mb-5">
                    <span className="inline-flex px-3 py-1 rounded-full border border-line-strong text-[10px] font-mono uppercase tracking-[0.2em] text-mist">
                      {plan.name}
                    </span>
                  </div>

                  <div className="mb-2 flex items-end gap-2">
                    <span
                      className={`text-5xl md:text-6xl font-extrabold tracking-tight leading-none ${
                        popular ? 'text-[#c8f542]' : 'text-snow'
                      }`}
                    >
                      ${price}
                    </span>
                    <span className="pb-1.5 text-sm font-mono text-mist">{periodLabel}</span>
                  </div>

                  <p className="text-sm text-fog mb-6">{plan.tagline}</p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-fog">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            popular ? 'bg-[#c8f542]/15 text-[#c8f542]' : 'bg-sky-500/15 text-sky-400'
                          }`}
                        >
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => selectPlan(plan.id)}
                    className={`group w-full flex items-center overflow-hidden rounded-xl border transition-colors ${
                      popular
                        ? 'border-[#c8f542]/40 bg-[#0b1220] hover:border-[#c8f542]/70'
                        : 'border-line-strong bg-[#0b1220] hover:border-sky-400/50'
                    }`}
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center ${
                        popular ? 'bg-[#c8f542] text-ink' : 'bg-sky-500 text-white'
                      }`}
                    >
                      <span className="text-lg leading-none">›</span>
                    </span>
                    <span className="flex-1 text-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-snow">
                      Get started
                    </span>
                  </button>

                  {popular && (
                    <p className="mt-4 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-mist">
                      — Limited time offer —
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-10 text-center text-xs text-mist/80 font-mono">
            All plans include a 30-day access window from purchase.
          </p>
        </div>
      </main>
    </div>
  );
}
