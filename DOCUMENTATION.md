# Product Studio — Documentation

Remix: **Omni Product Studio** transforms static product photos into dynamic, cinematic “vibe reels” or video advertisements using Google Gemini and Omni video models.

---

## Table of contents

1. [App purpose & usage](#1-app-purpose--usage)
2. [Backend API keys needed](#2-backend-api-keys-needed)
3. [AI models used](#3-ai-models-used)
4. [Tech stack](#4-tech-stack)
5. [Design system & UI language](#5-design-system--ui-language)
6. [Global header & navigation](#6-global-header--navigation)
7. [Loading states](#7-loading-states)
8. [Page-by-page UI & flows](#8-page-by-page-ui--flows)
9. [Plans, tokens & billing](#9-plans-tokens--billing)
10. [Payment gateway (Razorpay)](#10-payment-gateway-razorpay)
11. [API endpoints](#11-api-endpoints)
12. [Local development](#12-local-development)

---

## 1. App purpose & usage

### Purpose

Remix: Omni Product Studio is designed to transform static product photos into dynamic, cinematic "vibe reels" or video advertisements.

### How it works

1. **Add a product**  
   Upload or select an existing image of a product (presets, AI-generated product image, or your own photo).

2. **Set the atmosphere**  
   You can either:
   - Select an existing atmosphere image / preset, or  
   - Type a custom prompt (e.g., "moody neon city streets" or "sunny beach").  
   If you type a prompt, the app generates an atmosphere image for you.

3. **Generate & edit**  
   The app combines the product and atmosphere, translates them into a cinematic directive, and generates a video reel. You can then iterate by providing edit instructions (e.g., "make the lighting warmer") to create new versions of the video. Version history is kept so you can switch between cuts.

### Access rules

| Action | Guest | Signed in |
|--------|-------|-----------|
| Browse home / studio UI | Yes | Yes |
| Generate images / submit video / edit | No → redirected to Sign in | Yes (requires tokens) |
| Upgrade / pay | Can open pages | Recommended (plan applied to account) |

After sign-in, home is served at `/<user-uuid>`. Guests use `/`.

---

## 2. Backend API keys needed

To make the core AI product work, you need:

### Required for generation

| Variable | Purpose |
|----------|---------|
| **`GEMINI_API_KEY`** | Required for **all** AI generation steps (atmosphere image, prompt writing, Omni video render/edit). |

> **Note:** If you are running this inside Google AI Studio, you don't need to manually hardcode this. Configure it via the platform's **Secrets** panel and it will be automatically injected into your app.

### Required for payments

| Variable | Purpose |
|----------|---------|
| **`RAZORPAY_KEY_ID`** | Public Razorpay key for Checkout |
| **`RAZORPAY_KEY_SECRET`** | Server secret used to create orders |
| **`RAZORPAY_CURRENCY`** | Optional default (app usually sends country-based currency; fallback `INR`) |

### Optional

| Variable | Purpose |
|----------|---------|
| **`APP_URL`** | Public app URL (AI Studio / Cloud Run often injects this) |

See `env.example` for a template. Local secrets go in `.env` or `.env.local` (gitignored).

---

## 3. AI models used

The app uses a multi-step pipeline powered by Google's Gemini models:

### Gemini Flash Lite (text → image)

- If a user types an atmosphere description instead of uploading an image, the app uses **`gemini-3.1-flash-lite-image`** to generate a custom background image from their text prompt.
- A **`gemini-3.1-flash-lite`** text step first expands the short setting into a richer image prompt before rendering.

### Gemini Flash (prompt translation & vision)

- The app uses a Gemini Flash / Flash Lite vision+text path to analyze the product image alongside the atmosphere image and write a highly detailed **cinematic directive** (video prompt).

### Gemini Omni Flash (video rendering)

- Core video generation is handled by the Omni backend model **`gemini-omni-flash-preview`**.
- It takes the cinematic prompt plus reference images and renders the final video stream.
- It also supports **interaction chaining** (`previous_interaction_id`) so follow-up text edits create new versions without re-uploading images.

---

## 4. Tech stack

### Frontend

| Layer | Choice |
|-------|--------|
| UI library | **React 19** |
| Bundler / dev | **Vite 6** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) |
| Routing | **React Router DOM v7** (URL-based pages) |
| Motion | **Motion** (`motion/react`) |
| Icons | **Lucide React** |
| Fonts | **Sora** (sans), **IBM Plex Mono** (mono) |

### Backend

| Layer | Choice |
|-------|--------|
| Server | **Express** (`server.ts`) |
| AI SDK | **`@google/genai`** |
| Payments | **Razorpay** Node SDK + Checkout.js |
| Env | **dotenv** |
| Prod bundle | **esbuild** → `dist/server.cjs` |
| Dev runner | **tsx** |

### Architecture notes

- SPA frontend talks to `/api/*` on the same Express host.
- In development, Express mounts Vite middleware (HMR).
- In production, Express serves `dist/` static assets and SPA fallback.
- Auth, plans, tokens, FX, fiscal, and checkout drafts are persisted in **Supabase Postgres** (not browser storage).
- Route modules are **lazy-loaded**; every navigation shows a **skeleton** first.

---

## 5. Design system & UI language

### Visual theme

- Dark cinematic shell (`ink` / slate navy), not flat black-only.
- Background: layered radial gradients + soft grid mesh + subtle ambient drift.
- Accent: teal (`#2dd4bf`) for CTAs and focus.
- Pro pricing highlight: lime (`#c8f542`) on the popular plan card.
- Surfaces: frosted panels, thin `line` borders, mono labels for tooling feel.

### Shared chrome

- **`AppHeader`**: brand, plan badge, token status, Sign in **or** name dropdown.
- **`AuthShell`**: centered card layout for auth / legal forms.
- **`PageSkeleton`**: shimmer bones matching studio / auth / upgrade / checkout layouts.

### Header badges (signed-in)

| Badge | Meaning |
|-------|---------|
| **Free / Starter / Pro / Enterprise** | Active plan (defaults to **Free**) |
| **Token count** (or ∞) | Remaining generation tokens |

---

## 6. Global header & navigation

### Header actions

| Control | Behavior |
|---------|----------|
| **Product Studio** (logo) | Home: `/` (guest) or `/<userId>` (signed in) |
| **Sign in** | → `/signin` |
| **Name** dropdown | Upgrade, Terms & Conditions, Privacy Policy, Sign out |
| **Upgrade** (menu) | → `/upgrade` |
| **Terms** | → `/terms` |
| **Privacy** | → `/privacy` |
| **Sign out** | Clears session → `/` |

### Route map (URL-based)

| Route | Page |
|-------|------|
| `/` | Studio (guest). Signed-in users redirect to `/<uuid>` |
| `/<uuid>` | Studio home for that user (guests may also open studio UI here) |
| `/signin` | Sign in |
| `/signup` | Sign up (name, email, password) |
| `/verify-otp` | 6-digit signup OTP |
| `/reset-password` | Reset — email |
| `/reset-otp` | Reset — OTP |
| `/new-password` | Reset — new password → signed-in home |
| `/upgrade` | Pricing plans |
| `/order-summary/:planId?billing=` | Plan + billing address |
| `/final-summary/:planId?billing=` | Taxed total in local currency |
| `/transaction-summary/:txnId` | Payment success / failure |
| `/terms` | Terms & Conditions |
| `/privacy` | Privacy Policy |
| `*` | Redirect → `/` |

### Primary user journeys

```
Guest home → try Generate → Sign in → Studio (/uuid)
Sign up → OTP → Studio (/uuid) [Free + 30 tokens]
Upgrade → Order summary → Final summary → Razorpay → Transaction summary → Home
Forgot password → OTP → New password → Home (signed in)
```

---

## 7. Loading states

### Route navigation skeletons

On **every** pathname/search change:

1. App shows a shimmer **skeleton** (~450ms minimum) matched to the destination:
   - **Studio** — header + left builder + right stage
   - **Auth** — header + centered form card
   - **Upgrade** — header + title + three pricing cards
   - **Checkout** — header + summary/form card
2. Lazy page chunk loads under **React Suspense** (same skeletons as fallback).

Implemented in `NavigationShell` + `PageSkeleton`.

### In-page generation loading (Studio)

| State | UI |
|-------|----|
| Idle | “Awaiting render” stage |
| Generating atmosphere | Spinner + status + log ticker |
| Writing prompt | Spinner + logs |
| Rendering video | Spinner + Omni status polling logs |
| Video ready | Player + version controls |
| Error | Inline error panel in the stage |

### Payment loading

- Final summary: “Converting with live exchange rates…” while FX loads.
- Proceed to pay: button spinner until Razorpay Checkout opens.
- Transaction success: animated checkmark + particle motion.

---

## 8. Page-by-page UI & flows

### 8.1 Studio / Home — `/` or `/<userId>`

**Layout**

- Top header.
- **Left column (~480px):** Product Images + Atmospheres uploaders + Submit.
- **Right column:** Video stage, version strip, edit form, input thumbs, prompt drawer.

**Product / Atmosphere panels**

- Prompt textarea + suggestion chips.
- **Generate … image** CTA.
- Or upload / drop zone.
- Selected image preview with reset.

**Submit**

- Enabled when product + atmosphere are present and not generating.
- Starts atmosphere (if typed), prompt translation, then Omni video; polls until `ACTIVE`.

**Post-render**

- Version label, Edit, Download.
- Edit textarea → Submit Edit (new version via Omni chain).
- Prompt accordion for the selected version.

**Guards**

- Guest generate/upload/submit/edit → Sign in.
- Signed-in but tokens &lt; 10 → Upgrade (out of tokens).

**Cost:** 10 tokens per image generation, video submit, or edit.

---

### 8.2 Sign in — `/signin`

**UI:** Auth card — email, password (show/hide), Reset password link, Sign in CTA, Sign up link.

**Special:** If navigated from a generate action, shows “Generation requires an account…” banner.

**Success:** → `/<userId>`.

---

### 8.3 Sign up — `/signup`

**UI:** Name, email, password (show/hide), Continue.

**Success:** → `/verify-otp` (demo OTP shown when no email provider).

---

### 8.4 Verify OTP (signup) — `/verify-otp`

**UI:** Six digit boxes (paste supported), Verify & continue.

**Success:** Creates Free account (30 tokens) → `/<userId>`.

---

### 8.5 Reset password — `/reset-password`

**UI:** Email → Send code → `/reset-otp`.

---

### 8.6 Reset OTP — `/reset-otp`

**UI:** Six digit OTP → Continue → `/new-password`.

---

### 8.7 New password — `/new-password`

**UI:** New password + confirm (show/hide) → Save & continue.

**Success:** Signs user in → `/<userId>`.

---

### 8.8 Upgrade — `/upgrade`

**UI**

- Headline: “Flexible pricing for teams of all sizes.”
- Monthly / Annual toggle (annual = 10× monthly, “2 months free”).
- Three cards:

| Plan | Monthly | Tokens (allotment) |
|------|---------|----------------------|
| Starter | $3 | 1,000 |
| Pro (highlighted) | $10 | 4,500 |
| Enterprise | $50 | Unlimited |

- Get started → `/order-summary/<planId>?billing=monthly|annual`.
- If opened due to empty tokens: warning banner at top.

---

### 8.9 Order summary — `/order-summary/:planId`

**UI**

- Plan name, billing cycle, access (30 days), tokens, list price (USD).
- Included features list.
- **Billing address:** Name, Email, Full address, City, State, Pincode (optional), Country (searchable dropdown).
- Buttons: **Back** (Upgrade), **Next**.

**Next:** Saves checkout draft → `/final-summary/:planId?billing=…`.

---

### 8.10 Final summary — `/final-summary/:planId`

**UI**

- Selected plan, country, currency.
- **Plan amount** — USD converted via FX (Frankfurter + fallbacks) for billing country currency.
- **Tax** — rate/label by country (e.g. India GST 18%, UAE VAT 5%).
- **Total** = plan amount + tax.
- Bill-to block (address snapshot).
- Buttons: **Back** (order summary), **Proceed to pay** → Razorpay Checkout.

Requires a valid checkout draft; otherwise redirects back to order summary.

---

### 8.11 Transaction summary — `/transaction-summary/:txnId`

**UI**

- **Success:** Animated checkmark + confetti-style motion, “Payment successful”.
- **Failed:** Error icon, failure message.
- Shared details: **12-character alphanumeric Transaction ID**, status, plan, amount, timestamp.

**Buttons**

- Success → **Back to home** (applies purchased plan + token allotment).
- Failed → **Back to home** + **Retry** (returns to final summary).

---

### 8.12 Terms — `/terms`

**UI:** Auth-shell card with short Terms & Conditions copy.

---

### 8.13 Privacy — `/privacy`

**UI:** Auth-shell card with short Privacy Policy copy.

---

## 9. Plans, tokens & billing

| Plan | Default tokens | Notes |
|------|----------------|-------|
| Free | **30** | Granted at signup |
| Starter | **1,000** | Granted on successful payment |
| Pro | **4,500** | Granted on successful payment |
| Enterprise | **Unlimited** (`∞` in header) | Granted on successful payment |

- **Cost:** **10 tokens** per generation action (AI image, video submit, or edit).
- Header shows live remaining balance.
- Balance ≤ insufficient for one generation → user is sent to Upgrade with an out-of-tokens message.
- Auth + token state live in Supabase Auth + `profiles` (no localStorage).

---

## 10. Payment gateway (Razorpay)

### Flow

1. Client calls `POST /api/razorpay/create-order` with plan, billing cycle, address, currency, and amount (minor units including tax).
2. Server creates a Razorpay **order** with Key ID + Secret.
3. Client loads `https://checkout.razorpay.com/v1/checkout.js` and opens Checkout (prefilled name/email).
4. On success or `payment.failed`, app navigates to Transaction Summary with a new 12-char ID.

### Server endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/razorpay/config` | Public key + currency (health/config) |
| `POST` | `/api/razorpay/create-order` | Create payable order |

### Notes

- Razorpay keys must be set in the environment for Checkout to open.
- Amplify **static-only** hosting cannot run the Express order API; deploy the Node server (or equivalent) for payments and AI.

---

## 11. API endpoints

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/generate-image` | Product/atmosphere image from prompt |
| `POST` | `/api/generate-atmosphere` | Text setting → Flash Lite prompt → atmosphere image |
| `POST` | `/api/generate-prompt` | Vision + cinematic directive |
| `POST` | `/api/generate-video` | Omni Flash video create |
| `POST` | `/api/edit-video` | Omni chained edit |
| `GET` | `/api/file-status/:fileId` | Poll render state |
| `GET` | `/api/video/:fileId` | Stream / download video |
| `POST` | `/api/razorpay/create-order` | Payment order |
| `GET` | `/api/razorpay/config` | Razorpay public config |

(Additional legacy `/api/generate` helpers may exist in `server.ts` for related image flows.)

---

## 12. Local development

```bash
npm install
cp env.example .env.local   # then fill GEMINI_API_KEY (+ Razorpay if testing pay)
npm run dev                 # Express + Vite on port 3000
```

Production build:

```bash
npm run build
npm start                   # serves dist + API via dist/server.cjs
```

Typecheck:

```bash
npm run lint
```

---

## File map (high level)

| Path | Role |
|------|------|
| `src/pages/StudioPage.tsx` | Main studio UI |
| `src/pages/*Auth* / Reset* / NewPassword*` | Auth flows |
| `src/pages/UpgradePage.tsx` | Pricing |
| `src/pages/OrderSummaryPage.tsx` | Billing address |
| `src/pages/FinalSummaryPage.tsx` | FX + tax total + pay |
| `src/pages/TransactionSummaryPage.tsx` | Payment result |
| `src/components/AppHeader.tsx` | Global header |
| `src/components/NavigationShell.tsx` | Router + skeletons |
| `src/components/PageSkeleton.tsx` | Skeleton layouts |
| `src/auth/*` | Session, plans, tokens |
| `src/data/plans.ts` | Plan catalog |
| `src/data/taxCurrency.ts` | Country currency + tax |
| `server.ts` | Express + Gemini/Omni + Razorpay |
| `DOCUMENTATION.md` | This file |

---

*Product Studio — Omni cinematic product reels, powered by Gemini.*
