import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { SeoHead } from '../components/SeoHead';
import { SITE_NAME } from '../seo/config';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goStudio = () => {
    if (user) navigate(`/${user.userId}`);
    else navigate('/studio');
  };

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <SeoHead page="home" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-6 md:px-10 h-14 md:h-16">
        <Link
          to="/"
          className="text-lg md:text-xl font-extrabold tracking-tight text-snow hover:text-accent transition-colors"
        >
          {SITE_NAME}
        </Link>
        <button
          type="button"
          onClick={() => navigate(user ? `/${user.userId}` : '/signin')}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold tracking-wide text-ink bg-accent hover:bg-accent-dim transition-colors rounded-md shadow-[0_0_0_1px_rgba(45,212,191,0.3)]"
        >
          {user ? 'Open studio' : 'Sign in'}
        </button>
      </header>

      {/* Hero — one composition */}
      <main className="relative flex-1 flex flex-col">
        <section className="relative min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex flex-col justify-end overflow-hidden">
          {/* Full-bleed visual plane */}
          <div className="absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[#070b12]" />
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0.7, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 70% 55% at 72% 38%, rgba(45, 212, 191, 0.28), transparent 58%),
                  radial-gradient(ellipse 45% 40% at 18% 62%, rgba(56, 189, 248, 0.14), transparent 55%),
                  linear-gradient(115deg, #070b12 0%, #0a121c 42%, #0c1a22 100%)
                `,
              }}
            />
            {/* Soft horizon / stage light — edge-to-edge, not a card */}
            <motion.div
              className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink via-ink/80 to-transparent"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            />
            <motion.div
              className="absolute left-1/2 top-[28%] h-[min(42vw,280px)] w-[min(70vw,520px)] -translate-x-1/2 rounded-full bg-accent/20 blur-[90px]"
              animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.06, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative z-10 px-6 md:px-10 pb-16 md:pb-24 pt-28 md:pt-0 max-w-3xl">
            <motion.p
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              AI product video studio
            </motion.p>
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-snow leading-[1.05]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              {SITE_NAME}
            </motion.h1>
            <motion.p
              className="mt-5 text-base md:text-lg text-fog leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28 }}
            >
              Turn product photos into cinematic marketing reels — atmosphere, motion, and
              campaign-ready cuts in one studio.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button
                type="button"
                onClick={goStudio}
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-accent text-ink text-sm font-semibold tracking-wide hover:bg-accent-dim transition-colors shadow-[0_0_0_1px_rgba(45,212,191,0.35),0_16px_48px_rgba(45,212,191,0.18)]"
              >
                Get started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {!user && (
                <Link
                  to="/signup"
                  className="inline-flex items-center px-5 py-3.5 rounded-lg border border-line-strong text-sm font-semibold text-fog hover:text-snow hover:border-accent/40 transition-colors"
                >
                  Create account
                </Link>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line/80 bg-panel/50 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-8 md:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-snow">{SITE_NAME}</p>
            <p className="mt-1 text-xs text-mist">
              Cinematic product reels from still photography.
            </p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              to="/terms"
              className="text-sm text-mist hover:text-accent transition-colors"
            >
              Terms and Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-mist hover:text-accent transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund"
              className="text-sm text-mist hover:text-accent transition-colors"
            >
              Refund &amp; Cancellation
            </Link>
            <Link
              to="/contact"
              className="text-sm text-mist hover:text-accent transition-colors"
            >
              Contact Us
            </Link>
          </nav>
        </div>
        <div className="border-t border-line/60 px-6 md:px-10 py-4">
          <p className="mx-auto max-w-6xl text-[11px] text-mist/70">
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
