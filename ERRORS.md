# Product Studio — ERRORS.md

**Audits:** 2026-07-24 (remediate → claim GO → **re-audit**)  

Migration `009` + `010` applied. Edge redeployed for prior pass.

---

## Verdict (this re-audit)

**NO-GO.** Prior remediations mostly hold, but **3 new blockers** remain (1 CRITICAL, 2 HIGH). Do not treat payment confirm or Edge video soft-check as closed.

| Area | Status |
|------|--------|
| ERR-147 / 104 / 144 / 107 / OTP / Razorpay notes / atomic tokens | **VERIFIED FIXED** |
| ERR-122 / 124 / 125 / 129 / 133 / 134 / 135–136 | **VERIFIED FIXED** |
| ERR-110 charge-after | **VERIFIED FIXED** |
| ERR-110 soft balance | **BROKEN** (wrong column) → **ERR-148** |
| Confirm ownership on replay | **NEW CRITICAL** → **ERR-149** |
| Edge same-plan renewal | **NEW HIGH** → **ERR-150** |
| ERR-040 OG PNG | **PARTIAL** (file exists, **untracked** → Amplify 404) |

---

## NEW — must fix

| ID | Sev | Finding | Impact | Fix |
|----|-----|---------|--------|-----|
| **ERR-149** | **CRITICAL** | Confirm short-circuit on existing success txn (and duplicate race) calls `ensurePlan*` for the **caller** and never checks `txn.user_id === auth.user.id`. Ownership notes are only enforced on the first-insert path. | Any logged-in user who obtains another user's Razorpay `order_id` / `payment_id` / `signature` (visible in Checkout / network) can replay confirm and receive the paid plan. Edge + Express. | On existing/raced success txn: if `existing.user_id !== user.id` → **403**. Only then `ensurePlan`. |
| **ERR-148** | **HIGH** | Soft balance selects nonexistent `profiles.tokens_remaining`. Schema column is `tokens`. | **Prod Edge:** PostgREST error → assert fails → **all generate/edit video 404**. **Express:** ignores error → soft-check skipped (charge-after still protects tokens). | Select/compare `tokens` (enterprise null = unlimited). Redeploy `studio-api` + ship Express. |
| **ERR-150** | **HIGH** | After a **new** success claim, Edge calls `ensurePlanApplied` which **skips** `apply_plan` when `plan_id` already matches. | Same-plan renewal on Amplify (Edge-only) does **not** refill tokens. Express first-claim correctly always `applyPlanForUser`. | On first successful claim path: always `apply_plan` (keep ensurePlan only for retry/orphan recovery). |

---

## Still open / partial

| ID | Sev | Notes |
|----|-----|-------|
| **ERR-040** | MED | `public/og-image.png` on disk + HTML refs OK, but file is **git untracked** (`??`). Amplify from git → OG 404. Commit PNG (or generate in CI). |
| ERR-129 residual | LOW | `NewPasswordPage` submit does not re-check `expiresAt` if tab left open past expiry. |
| Edge `rememberOwnership` | MED | Returns early when `!fileId` — never stores `interaction_id` alone → edit ownership can 403 if URI parse fails. Express stores interaction anyway. |
| Express `/api/generate` | LOW | Charges tokens without `enforceAiRateLimit` (legacy route). |

---

## Verified fixed (re-confirmed)

| ID | Notes |
|----|-------|
| ERR-147 | ensurePlan on mismatch + delete claim on apply fail (Edge + Express) |
| ERR-104 | Skip apply when plan already matches (retry path) |
| ERR-110 charge-after | Video/edit: Omni success → then consume (no pre-charge timeout eat) |
| ERR-122 | Upload → `/api/describe` |
| ERR-124 | Rate limit on generation paths only; not file-status/video |
| ERR-125 | Storage remove on sign/meta failure |
| ERR-129 | OTP pages honor `expiresAt` (gate + submit) |
| ERR-133 | FX cron URL from vault `project_url` (010) |
| ERR-134 | CORS allowlist — no `*` |
| ERR-135/136 | Docs: Edge prod + `server-build/server.cjs` |
| Unpaid apply-plan | 403 Edge + Express |
| OTP forge / mark verified | Hardened in 009 |
| Razorpay captured + notes + unique payment id | Hold |
| Edge-only Razorpay when no `VITE_API_URL` | Hold |
| ERR-144 / 107 | Recovery-only reset; safe sign-in `from` |
| Atomic token RPCs | Hold |
| Atmosphere metered + typed 2× | Hold |
| CSP / video `Cache-Control: private, no-store` | Hold |

---

## Evidence (new findings)

**ERR-149** — no `user_id` check on existing txn:

- `supabase/functions/confirm-razorpay-payment/index.ts` ~142–149, ~195–208  
- `server/billing.ts` ~179–183, ~245–254  

**ERR-148** — wrong column:

- `studio-api/index.ts` `assertHasTokens` selects `tokens_remaining`  
- `server.ts` generate-video / edit-video soft-check same  
- Schema: `profiles.tokens` (`001_init.sql`, `database.types.ts`)

**ERR-150** — Edge new claim:

- `confirm-razorpay-payment/index.ts` ~213–214 uses `ensurePlanApplied` (skip if plan matches)  
- Express `billing.ts` ~259–261 always `applyPlanForUser` on fresh claim  

---

## Go-live checklist

- [ ] **ERR-149** confirm ownership on replay (must)  
- [ ] **ERR-148** `tokens` column + redeploy `studio-api` (must — Edge video broken)  
- [ ] **ERR-150** Edge always apply on first claim  
- [ ] Commit `public/og-image.png`  
- [ ] Amplify deploy + Razorpay smoke  
- [ ] Vault `project_url` for FX cron  
- [ ] Rotate exposed PATs  
