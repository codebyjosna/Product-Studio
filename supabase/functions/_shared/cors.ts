/** Shared origin allowlist for Edge Functions (ERR-134). */

export const ALLOWED_ORIGINS = new Set([
  'https://www.codewix.in',
  'https://codewix.in',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

export function corsHeadersFor(
  req: Request,
  extraAllowHeaders = '',
): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.codewix.in'
  const baseHeaders =
    'authorization, x-client-info, apikey, content-type, x-studio-path, range, x-cron-secret'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': extraAllowHeaders
      ? `${baseHeaders}, ${extraAllowHeaders}`
      : baseHeaders,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'content-range, accept-ranges, content-length, content-type',
    Vary: 'Origin',
  }
}
