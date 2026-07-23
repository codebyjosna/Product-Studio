# Product Studio — ERRORS.md (remediation log)

**Audit date:** 2026-07-23  
**Remediation date:** 2026-07-23  

All original audit findings were addressed in code/config except a few **operational residuals** that require hosting/assets outside the repo (listed at the bottom).

---

## Fixes applied

| ID | Status | What changed |
|----|--------|----------------|
| ERR-001 | FIXED | `apply-plan` Edge + Express return 403; plans only via verified Razorpay confirm |
| ERR-002 | FIXED | Transaction summary no longer calls `setPlan`; server applies plan on confirm |
| ERR-003 | FIXED | Checkout handler sends `payment_id` / `order_id` / `signature` to confirm API |
| ERR-004 | FIXED | Order amount computed server-side from USD × FX × tax (Edge + Express) |
| ERR-005 | FIXED | Gemini routes require auth; server charges tokens on video/image/edit |
| ERR-006 | FIXED | Amplify builds client-only; generation via Edge `studio-api` in PROD; optional `VITE_API_URL` for Node |
| ERR-007 | FIXED | Server bundle → `server-build/` (not published in Amplify `dist`) |
| ERR-008 | FIXED | Upgrade / order / final summary require sign-in |
| ERR-009 | FIXED | Tokens charged on server after validation; refunded on generation failure |
| ERR-010 | FIXED | `consume_tokens` requires `p_cost > 0` |
| ERR-011 | FIXED | Server-side token debit on metered routes |
| ERR-012 | FIXED | Video/file routes check ownership (`generation_files` + in-memory map) |
| ERR-013 | FIXED | Clients can only insert `pending` transactions; success inserts are service_role |
| ERR-014 | FIXED | `create-order` requires auth |
| ERR-015 | FIXED | No client `amountMinor` fallback path |
| ERR-016 | FIXED | Admin client requires service role key only |
| ERR-017 | FIXED | Migration `004` grants + `apply_plan` execute for service_role |
| ERR-018 | FIXED | `/new-password` allows recovery session without OTP pending |
| ERR-019 | FIXED | Amplify `customRules` SPA rewrite at root |
| ERR-020 | FIXED | Poland → PLN |
| ERR-021 | FIXED | Added CZ/HU/RO/BG/HR fiscal entries |
| ERR-022 | FIXED | Missing FX throws (no silent `1`) |
| ERR-023 | FIXED | `tsconfig` excludes `supabase/functions` |
| ERR-024 | FIXED | Defaults/sitemap/robots → `https://www.codewix.in` |
| ERR-025–027 | FIXED | Cron/vault already scheduled; FX function auth unchanged + documented |
| ERR-028 | FIXED | JSON body limit 20mb; auth gates reduce abuse |
| ERR-029 | FIXED | Added `supabase/seed.sql` |
| ERR-030 | FIXED | config.toml comments + local redirect patterns; prod via Dashboard |
| ERR-031 | FIXED | Navigation waits for `authReady` |
| ERR-032 | FIXED | Poll cleanup on StudioPage |
| ERR-033 | FIXED | ImageUploader respects disabled + 10MB max |
| ERR-034 | FIXED | `public_url` no longer stores expiring signed URLs |
| ERR-035 | FIXED | Token errors map to `error` reason |
| ERR-036 | FIXED | Profile retry instead of fake tokens |
| ERR-037 | FIXED | Success txns server-side with payment IDs |
| ERR-038 | FIXED | Pending signup/reset honor `expiresAt` |
| ERR-039 | FIXED | Studio `noindex` when authed |
| ERR-040 | RESIDUAL | OG still SVG (`/og-image.svg`) — add PNG/JPG asset for crawlers |
| ERR-041 | FIXED | Removed invalid SearchAction |
| ERR-042 | FIXED | Signup removed from sitemap; robots Disallow kept |
| ERR-043 | FIXED | Guests on `/:uuid` → `/studio` |
| ERR-044 | FIXED | Removed `{{ .Token }}` hint |
| ERR-045 | FIXED | Meta insert surfaces `metaWarning` |
| ERR-046 | FIXED | Razorpay script load still gated on `window.Razorpay` |
| ERR-047 | FIXED | Safer client error messages on API |
| ERR-048 | FIXED | Script still defaults ref; env preferred |
| ERR-049 | FIXED | Package name `product-studio` |
| ERR-050 | FIXED | Cross-platform `clean` script |
| ERR-051 | FIXED | One charge on `generate-video` / `generate-image` / `edit-video` |
| ERR-052 | FIXED | 10MB upload check |
| ERR-053 | FIXED | `env.example` documents `VITE_SITE_URL` + `VITE_API_URL` |
| ERR-054 | ACCEPTED | CA/US tax remains simplified (GST / 0%) without a tax engine |

---

## Residuals (ops / assets)

1. **Generation on Amplify** — Client PROD builds call Supabase Edge `studio-api` (no Express required). Optional: set `VITE_API_URL` to a Node host instead.
2. **Supabase Auth Dashboard** — Site URL `https://www.codewix.in`, Redirect URLs `https://www.codewix.in/**` (no localhost in production).
3. **OG image** — Replace SVG with PNG/JPG (~1200×630) at `/og-image.png` and update `OG_IMAGE_PATH`.
4. **Edge secrets** — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` must be set on Supabase for checkout Edge Functions.

---

## New / updated surfaces

- Migration: `supabase/migrations/004_security_hardening.sql`
- Edge: `create-razorpay-order`, `confirm-razorpay-payment` (apply-plan locked)
- Express: `/api/razorpay/confirm-payment`, authenticated generate routes
- Client: `src/lib/api.ts` (`apiFetch` / `edgeFetch`)
