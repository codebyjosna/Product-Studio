import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { SeoHead } from '../components/SeoHead';
import { LandingSeoContent } from '../components/LandingSeoContent';
import { SITE_NAME } from '../seo/config';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [brief, setBrief] = React.useState('');

  const goStudio = (withBrief?: string) => {
    if (withBrief?.trim()) {
      try {
        sessionStorage.setItem('ps_landing_brief', withBrief.trim());
      } catch {
        /* ignore */
      }
    }
    if (user) navigate(`/${user.userId}`);
    else navigate('/studio');
  };

  const firstName = (user?.name || '').trim().split(/\s+/)[0];

  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <SeoHead page="home" />
      <LandingSeoContent />

      <header
        role="banner"
        className="relative z-20 flex items-center justify-between gap-4 px-6 md:px-10 h-14 md:h-16"
      >
        <Link
          to="/"
          title="Product Studio — AI Product Video Generator home"
          aria-label="Product Studio home"
          className="text-lg md:text-xl font-extrabold tracking-tight text-snow hover:opacity-90 transition-opacity"
        >
          {SITE_NAME}
        </Link>
        <button
          type="button"
          onClick={() => navigate(user ? `/${user.userId}` : '/signin')}
          aria-label={user ? 'Open your Product Studio workspace' : 'Sign in to Product Studio'}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold tracking-wide text-ink bg-white hover:bg-fog transition-colors rounded-full"
        >
          {user ? 'Open studio' : 'Sign in'}
        </button>
      </header>

      <main id="main-content" role="main" className="relative flex-1 flex flex-col">
        <section
          aria-labelledby="landing-hero-heading"
          className="relative min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 overflow-hidden"
        >
          <motion.div
            className="pill-badge mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="pill-new">New</span>
            <span>Cinematic AI product reels</span>
            <span className="text-white/40">→</span>
          </motion.div>

          <motion.h1
            id="landing-hero-heading"
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-snow text-center leading-[1.05]"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {SITE_NAME}
          </motion.h1>

          <motion.p
            className="mt-5 text-lg md:text-xl text-white/55 text-center max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            {firstName
              ? `What should we create, ${firstName}?`
              : 'Turn product photos into campaign-ready vibe reels.'}
          </motion.p>

          <motion.form
            className="command-bar mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32 }}
            onSubmit={(e) => {
              e.preventDefault();
              goStudio(brief);
            }}
          >
            <input
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Create a cinematic reel for my product…"
              aria-label="Describe your product video"
            />
            <button
              type="submit"
              className="shrink-0 w-10 h-10 rounded-full bg-white text-ink flex items-center justify-center hover:bg-fog transition-colors"
              aria-label="Get started"
            >
              <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </motion.form>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <button
              type="button"
              onClick={() => goStudio()}
              className="group inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-sky-300 transition-colors"
            >
              Open full studio
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            {!user && (
              <Link
                to="/signup"
                className="text-sm font-medium text-white/40 hover:text-snow transition-colors"
              >
                Create account
              </Link>
            )}
          </motion.div>
        </section>
      </main>

      <footer role="contentinfo" className="relative z-10 border-t border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-snow">{SITE_NAME}</p>
            <p className="mt-1 text-xs text-white/40">Cinematic product reels from still photography.</p>
          </div>
          <nav aria-label="Legal and support" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/terms" className="text-sm text-white/40 hover:text-sky-300 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="text-sm text-white/40 hover:text-sky-300 transition-colors">
              Privacy
            </Link>
            <Link to="/refund" className="text-sm text-white/40 hover:text-sky-300 transition-colors">
              Refund
            </Link>
            <Link to="/contact" className="text-sm text-white/40 hover:text-sky-300 transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
