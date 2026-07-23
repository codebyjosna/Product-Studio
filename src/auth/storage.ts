import type { AuthSession, AuthUser, PendingReset, PendingSignup } from './types';

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

export function getSession(): AuthSession | null {
  return readJson<AuthSession>(SESSION_KEY);
}

export function setSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  writeJson(SESSION_KEY, session);
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
  };
  saveUsers([...users, user]);
  setPendingSignup(null);
  const session: AuthSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
  };
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
