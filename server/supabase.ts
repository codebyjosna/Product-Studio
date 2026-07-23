import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ProfileSession {
  userId: string;
  name: string;
  email: string;
  planId: PlanId;
  tokens: number | null;
}

let adminClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Service-role client for trusted server operations (never expose to browser). */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required on the server');
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function normalizePlanId(value: unknown): PlanId {
  if (value === 'starter' || value === 'pro' || value === 'enterprise') return value;
  return 'free';
}

export function profileToSession(row: {
  id: string;
  name: string;
  email: string;
  plan_id: string;
  tokens: number | null;
}): ProfileSession {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    planId: normalizePlanId(row.plan_id),
    tokens: row.tokens,
  };
}

export async function getUserFromBearer(authHeader: string | undefined): Promise<User | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function loadProfileSession(userId: string): Promise<ProfileSession | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return profileToSession(data);
}

export async function applyPlanForUser(userId: string, planId: PlanId): Promise<ProfileSession> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('apply_plan', {
    p_user_id: userId,
    p_plan_id: planId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return profileToSession(row);
}

export type AuthedRequest = Request & {
  authUser?: User;
  authSession?: ProfileSession;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    if (!isSupabaseServerConfigured()) {
      res.status(503).json({ error: 'Supabase auth is not configured on the server.' });
      return;
    }
    const user = await getUserFromBearer(req.header('authorization') || undefined);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized. Sign in required.' });
      return;
    }
    const session = await loadProfileSession(user.id);
    req.authUser = user;
    req.authSession = session ?? undefined;
    next();
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Auth check failed.' });
  }
}
