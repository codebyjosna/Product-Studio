import { getSupabase, isSupabaseConfigured } from './supabase';

/** API base for Express (optional). Empty = same origin `/api` in local `npm run dev`. */
export function getApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
  return fromEnv || '';
}

export async function getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

function isStudioGenerationPath(path: string): boolean {
  return (
    path.startsWith('/api/generate-') ||
    path.startsWith('/api/edit-video') ||
    path.startsWith('/api/file-status/') ||
    path.startsWith('/api/video/') ||
    path.startsWith('/api/describe')
  );
}

/**
 * On Amplify (static PROD build) there is no Express. Route generation to
 * Supabase Edge `studio-api`. Local `npm run dev` keeps same-origin Express.
 * Explicit `VITE_API_URL` always wins (dedicated Node host).
 */
function shouldUseStudioEdge(path: string): boolean {
  if (getApiBase()) return false;
  if (!isStudioGenerationPath(path)) return false;
  return Boolean(import.meta.env.PROD);
}

async function studioEdgeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured (needed for generation on this host).');
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Sign in required.');

  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('apikey', anonKey);
  headers.set('x-studio-path', path);

  return fetch(`${supabaseUrl}/functions/v1/studio-api`, { ...init, headers });
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (shouldUseStudioEdge(path)) {
    return studioEdgeFetch(path, init);
  }

  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  return fetch(url, { ...init, headers });
}

/**
 * Parse API JSON safely. Amplify/static hosts often return index.html for /api/*,
 * which previously surfaced as: Unexpected token '<', "<!doctype "...
 */
export async function readApiJson<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML')
  ) {
    const base = getApiBase();
    throw new Error(
      base
        ? `Generation API at ${base} returned a web page instead of JSON. Check that the Node server is running and VITE_API_URL is correct.`
        : 'Generation API returned HTML instead of JSON. Redeploy after studio-api Edge is live, or set VITE_API_URL to a Node API host.'
    );
  }

  if (!trimmed) {
    throw new Error(res.ok ? 'Empty API response.' : `API error (${res.status}).`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.ok
        ? 'Invalid API response (not JSON).'
        : `API error (${res.status}): ${trimmed.slice(0, 160)}`
    );
  }
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
