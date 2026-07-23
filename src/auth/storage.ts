import type { AuthSession, AuthUser, PendingReset, PendingSignup, PlanId } from './types';
import { normalizePlanId } from './types';
import { TOKENS_PER_GENERATION, initialTokensForPlan } from './tokens';

const USERS_KEY = 'ps_users';
const SESSION_KEY = 'ps_session';
const PENDING_SIGNUP_KEY = 'ps_pending_signup';
const PENDING_RESET_KEY = 'ps_pending_reset';

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getUsers(): AuthUser[] {
  return readJson<AuthUser[]>(USERS_KEY) ?? [];
}

function saveUsers(users: AuthUser[]) {
  writeJson(USERS_KEY, users);
}

export function findUserByEmail(email: string): AuthUser | undefined {
  const normalized = email.trim().toLowerCase();
  return getUsers().find((u) => u.email === normalized);
}

/** Resolve tokens: explicit value, or allotment for plan if never set. */
export function resolveTokens(user: Pick<AuthUser, 'planId' | 'tokens'>): number | null {
  if (user.tokens === null) return null;
  if (typeof user.tokens === 'number') return Math.max(0, user.tokens);
  return initialTokensForPlan(normalizePlanId(user.planId));
}

function toSession(user: AuthUser): AuthSession {
  const planId = normalizePlanId(user.planId);
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    planId,
    tokens: resolveTokens({ planId, tokens: user.tokens }),
  };
}

export function getSession(): AuthSession | null {
  const session = readJson<AuthSession>(SESSION_KEY);
  if (!session) return null;
  const planId = normalizePlanId(session.planId);
  return {
    ...session,
    planId,
    tokens: resolveTokens({ planId, tokens: session.tokens }),
  };
}

export function setSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  writeJson(SESSION_KEY, {
    ...session,
    planId: normalizePlanId(session.planId),
    tokens: resolveTokens(session),
  });
}

export function getPendingSignup(): PendingSignup | null {
  const pending = readJson<PendingSignup>(PENDING_SIGNUP_KEY);
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
    return null;
  }
  return pending;
}

export function setPendingSignup(pending: PendingSignup | null) {
  if (!pending) {
    localStorage.removeItem(PENDING_SIGNUP_KEY);
    return;
  }
  writeJson(PENDING_SIGNUP_KEY, pending);
}

export function getPendingReset(): PendingReset | null {
  const pending = readJson<PendingReset>(PENDING_RESET_KEY);
  if (!pending) return null;
  if (Date.now() > pending.expiresAt) {
    localStorage.removeItem(PENDING_RESET_KEY);
    return null;
  }
  return pending;
}

export function setPendingReset(pending: PendingReset | null) {
  if (!pending) {
    localStorage.removeItem(PENDING_RESET_KEY);
    return;
  }
  writeJson(PENDING_RESET_KEY, pending);
}

export function createUserFromPending(pending: PendingSignup): AuthSession {
  const users = getUsers();
  if (users.some((u) => u.email === pending.email)) {
    throw new Error('An account with this email already exists.');
  }
  const user: AuthUser = {
    id: crypto.randomUUID(),
    name: pending.name,
    email: pending.email,
    passwordHash: pending.passwordHash,
    planId: 'free',
    tokens: initialTokensForPlan('free'),
  };
  saveUsers([...users, user]);
  setPendingSignup(null);
  const session = toSession(user);
  setSession(session);
  return session;
}

export async function updatePassword(email: string, newPassword: string) {
  const users = getUsers();
  const normalized = email.trim().toLowerCase();
  const idx = users.findIndex((u) => u.email === normalized);
  if (idx < 0) throw new Error('Account not found.');
  users[idx] = {
    ...users[idx],
    passwordHash: await hashPassword(newPassword),
  };
  saveUsers(users);
  setPendingReset(null);
}

/** Activate a paid plan and grant its token allotment. */
export function updateUserPlan(userId: string, planId: PlanId): AuthSession | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  const normalized = normalizePlanId(planId);
  users[idx] = {
    ...users[idx],
    planId: normalized,
    tokens: initialTokensForPlan(normalized),
  };
  saveUsers(users);
  const session = toSession(users[idx]);
  setSession(session);
  return session;
}

export type ConsumeResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'no_user' | 'insufficient'; session: AuthSession | null };

/** Deduct generation cost from the user's balance. */
export function consumeUserTokens(
  userId: string,
  cost = TOKENS_PER_GENERATION
): ConsumeResult {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, reason: 'no_user', session: null };

  const current = resolveTokens(users[idx]);
  if (current === null) {
    const session = toSession(users[idx]);
    setSession(session);
    return { ok: true, session };
  }
  if (current < cost) {
    const session = toSession(users[idx]);
    setSession(session);
    return { ok: false, reason: 'insufficient', session };
  }

  users[idx] = { ...users[idx], tokens: current - cost };
  saveUsers(users);
  const session = toSession(users[idx]);
  setSession(session);
  return { ok: true, session };
}

/** Ensure legacy users get a free token balance when missing. */
export function ensureUserTokens(userId: string): AuthSession | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  if (users[idx].tokens === undefined) {
    const planId = normalizePlanId(users[idx].planId);
    users[idx] = {
      ...users[idx],
      planId,
      tokens: initialTokensForPlan(planId),
    };
    saveUsers(users);
  }
  const session = toSession(users[idx]);
  setSession(session);
  return session;
}

export { toSession };
