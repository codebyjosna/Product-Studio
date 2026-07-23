import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, FileText, LogOut, Shield, Sparkles, Coins } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PLAN_LABELS, type PlanId } from '../auth/types';
import { TOKENS_PER_GENERATION } from '../auth/tokens';

const menuItemClass =
  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-fog hover:bg-ink/60 hover:text-snow transition-colors';

function PlanBadge({ planId }: { planId: PlanId }) {
  const styles: Record<PlanId, string> = {
    free: 'border-line text-mist bg-panel-elevated/80',
    starter: 'border-sky-400/40 text-sky-300 bg-sky-500/10',
    pro: 'border-[#c8f542]/40 text-[#c8f542] bg-[#c8f542]/10',
    enterprise: 'border-accent/40 text-accent bg-accent/10',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${styles[planId]}`}
    >
      {PLAN_LABELS[planId]}
    </span>
  );
}

function TokenStatus({ tokens }: { tokens: number | null }) {
  const empty = tokens !== null && tokens < TOKENS_PER_GENERATION;
  const low = tokens !== null && tokens > 0 && tokens < TOKENS_PER_GENERATION * 2;

  return (
    <div
      title={tokens == null ? 'Unlimited tokens' : `${tokens} tokens remaining · ${TOKENS_PER_GENERATION} per generation`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
        empty
          ? 'border-danger/40 text-danger bg-danger/10'
          : low
            ? 'border-warn/40 text-warn bg-warn/10'
            : 'border-accent/35 text-accent bg-accent/10'
      }`}
    >
      <Coins className="w-3 h-3" />
      <span>{tokens == null ? '∞' : tokens}</span>
      <span className="text-[9px] opacity-70 normal-case tracking-normal font-medium">tokens</span>
    </div>
  );
}

export function AppHeader() {
  const { user, planId, tokens, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const go = (path: string) => {
    closeMenu();
    navigate(path);
  };

  return (
    <header className="shrink-0 z-20 flex items-center justify-between gap-4 px-6 md:px-10 h-14 md:h-16 border-b border-line/80 bg-panel/70 backdrop-blur-xl">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <Link
          to={user ? `/${user.userId}` : '/'}
          className="text-lg md:text-xl font-extrabold tracking-tight text-snow hover:text-accent transition-colors truncate"
        >
          Product Studio
        </Link>
        {user && (
          <>
            <PlanBadge planId={planId} />
            <TokenStatus tokens={tokens} />
          </>
        )}
      </div>

      {user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-line bg-panel-elevated/80 text-sm font-medium text-snow hover:border-accent/40 transition-colors"
          >
            <span className="max-w-[140px] truncate">{user.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-mist transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={closeMenu}
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-20 w-56 rounded-lg border border-line bg-panel-elevated shadow-lg overflow-hidden py-1"
              >
                <button type="button" role="menuitem" onClick={() => go('/upgrade')} className={menuItemClass}>
                  <Sparkles className="w-4 h-4 text-accent" />
                  Upgrade
                </button>
                <button type="button" role="menuitem" onClick={() => go('/terms')} className={menuItemClass}>
                  <FileText className="w-4 h-4" />
                  Terms &amp; Conditions
                </button>
                <button type="button" role="menuitem" onClick={() => go('/privacy')} className={menuItemClass}>
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </button>
                <div className="my-1 border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    signOut();
                    navigate('/');
                  }}
                  className={menuItemClass}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/signin')}
          className="inline-flex items-center justify-center px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink bg-accent hover:bg-accent-dim transition-colors rounded-md shadow-[0_0_0_1px_rgba(45,212,191,0.3)]"
        >
          Sign in
        </button>
      )}
    </header>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Password',
  autoComplete = 'current-password',
  required = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full bg-ink/70 border border-line text-fog pr-11 pl-3 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 placeholder:text-mist/40"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-mist hover:text-snow transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md rounded-xl border border-line/90 bg-panel/70 backdrop-blur-xl p-6 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h1 className="text-2xl font-extrabold tracking-tight text-snow mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-mist mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
      </main>
    </div>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-mono uppercase tracking-wider text-mist mb-1.5">
      {children}
    </label>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="text-xs font-mono text-danger bg-danger-soft/40 border border-danger/30 p-2.5 rounded-lg mb-4">
      {message}
    </p>
  );
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-accent hover:text-accent-dim transition-colors underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
