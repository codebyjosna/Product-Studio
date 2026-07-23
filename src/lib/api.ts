import { getSupabase, isSupabaseConfigured } from './supabase';

/** API base for Express (optional). Empty = same origin `/api`. */
export function getApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  return fromEnv || '';
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  return fetch(url, { ...init, headers });
}

export async function edgeFetch(functionName: string, init: RequestInit = {}): Promise<Response> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');

  const token = await getAccessToken();
  if (!token) throw new Error('Sign in required.');

  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('apikey', anonKey);

  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, { ...init, headers });
}
