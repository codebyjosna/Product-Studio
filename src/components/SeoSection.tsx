import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clapperboard,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Workflow,
  ChevronDown,
} from 'lucide-react';
import { FAQ_ITEMS, SITE_NAME } from '../seo/config';

const OUTCOMES = [
  {
    icon: Gauge,
    title: 'Faster creative throughput',
    body: 'Ship product video variants in minutes instead of waiting on shoots, edits, and agency turnarounds.',
  },
  {
    icon: Clapperboard,
    title: 'Cinematic brand motion',
    body: 'Pair any SKU with atmosphere-driven scenes so every reel feels directed — not like a static slideshow.',
  },
  {
    icon: LineChart,
    title: 'More tests, clearer winners',
    body: 'Generate alternate cuts for ads, PDPs, and social. Iterate with natural-language edits and version history.',
  },
  {
    icon: Workflow,
    title: 'Built for catalog scale',
    body: 'From single hero SKUs to enterprise assortments — token plans and Enterprise unlimited keep production moving.',
  },
] as const;

const STEPS = [
  {
    step: '01',
    title: 'Select or generate a product',
    body: 'Upload a reference photo or generate a polished product image to anchor the reel.',
  },
  {
    step: '02',
    title: 'Lock the atmosphere',
    body: 'Choose a preset mood or describe a custom setting. Product Studio builds the visual world around your product.',
  },
  {
    step: '03',
    title: 'Generate, edit, download',
    body: 'AI writes the cinematic directive, Omni renders the reel, and you refine until the cut is campaign-ready.',
  },
] as const;

export function SeoSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section
      id="product-video-ai"
      aria-labelledby="seo-heading"
      className="relative border-t border-line/80 bg-panel/40"
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_20%_0%,rgba(45,212,191,0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-24 space-y-20">
        {/* Hero narrative */}
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent mb-4">
            AI product video platform
          </p>
          <h1
            id="seo-heading"
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-snow leading-[1.1]"
          >
            {SITE_NAME}: turn product photos into cinematic marketing reels
          </h1>
          <p className="mt-5 text-base md:text-lg text-fog leading-relaxed max-w-2xl">
            Enterprise teams use {SITE_NAME} to convert existing product photography into
            result-oriented video creatives — for ecommerce launches, paid social, and brand
            storytelling — without a full production crew for every SKU.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#studio-workspace"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-ink text-sm font-semibold hover:bg-accent-dim transition-colors"
            >
              Open studio
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/upgrade"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-line-strong text-snow text-sm font-semibold hover:border-accent/50 transition-colors"
            >
              View enterprise plans
            </Link>
          </div>
        </div>

        {/* Outcomes */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-snow mb-3">
            Outcomes marketing leaders measure
          </h2>
          <p className="text-mist max-w-2xl mb-10">
            Built for teams that need volume, consistency, and speed — not another novelty demo.
          </p>
          <ul className="grid sm:grid-cols-2 gap-6 md:gap-8 list-none p-0 m-0">
            {OUTCOMES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <div className="shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                  <Icon className="w-5 h-5" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-snow">{title}</h3>
                  <p className="mt-1.5 text-sm text-mist leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* How it works */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-snow mb-3">
            How Product Studio generates product videos
          </h2>
          <p className="text-mist max-w-2xl mb-10">
            A clear three-step workflow from still image to downloadable cinematic reel.
          </p>
          <ol className="grid md:grid-cols-3 gap-8 list-none p-0 m-0">
            {STEPS.map((item) => (
              <li key={item.step}>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Step {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-snow">{item.title}</h3>
                <p className="mt-2 text-sm text-mist leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Trust / enterprise */}
        <div className="rounded-2xl border border-line/80 bg-panel-elevated/50 px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <ShieldCheck className="w-6 h-6" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-snow">
                Enterprise-ready product video operations
              </h2>
              <p className="mt-2 text-sm md:text-base text-mist leading-relaxed max-w-3xl">
                Secure account access, plan-based tokens, Razorpay checkout, and an upgrade path
                from free exploration to unlimited Enterprise generation — so creative ops can
                standardize AI product video without shadow tools.
              </p>
            </div>
            <Link
              to="/upgrade"
              className="inline-flex items-center gap-2 shrink-0 text-sm font-semibold text-accent hover:text-accent-dim"
            >
              Compare plans
              <Sparkles className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-snow mb-3">
            Product video AI — frequently asked questions
          </h2>
          <p className="text-mist max-w-2xl mb-8">
            Straight answers for ecommerce, agency, and brand teams evaluating AI video generation.
          </p>
          <div className="divide-y divide-line/80 border-y border-line/80">
            {FAQ_ITEMS.map((item, index) => {
              const open = openFaq === index;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-snow">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {open && (
                    <p className="pb-5 text-sm text-mist leading-relaxed max-w-3xl -mt-1">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-snow">
            Ready to produce campaign-ready product reels?
          </h2>
          <p className="mt-3 text-mist text-sm md:text-base">
            Start in the studio above — or create an account to unlock generation tokens and
            scale your product video pipeline.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#studio-workspace"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-ink text-sm font-semibold hover:bg-accent-dim transition-colors"
            >
              Back to studio
            </a>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-line-strong text-snow text-sm font-semibold hover:border-accent/50 transition-colors"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
