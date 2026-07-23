# Supabase setup — Product Studio

This app uses **Supabase** for:

| Layer | What |
|-------|------|
| **Auth** | Email + password, signup OTP, password-reset OTP |
| **Database** | `profiles`, `transactions`, `media_assets` |
| **Storage** | `product-uploads`, `atmosphere-uploads`, `generated-videos` |

## 1. Create a project

1. Go to [https://supabase.com](https://supabase.com) → New project  
2. Copy:
   - **Project URL**
   - **anon public** key  
   - **service_role** key (server only — never ship to the browser)

## 2. Run the migration

In Supabase Dashboard → **SQL Editor** → New query:

Paste and run the full contents of:

`supabase/migrations/001_init.sql`

That creates tables, RLS, RPCs (`consume_tokens`, `apply_plan`), storage buckets, and the signup profile trigger.

## 3. Auth email settings (OTP)

Dashboard → **Authentication** → **Providers** → Email:

- Enable Email
- Enable **Confirm email**

Dashboard → **Authentication** → **Email Templates**:

- **Confirm signup** and **Reset password** should include the 6-digit token:

```html
<p>Your code is: {{ .Token }}</p>
```

Also set **Site URL** and **Redirect URLs** to your app origin (e.g. `http://localhost:3000` and your Amplify URL).

## 4. Environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Server (Express) — same URL + service role
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Also keep your existing `GEMINI_API_KEY` / Razorpay vars.

## 5. Verify

```bash
npm run dev
```

- Sign up → check email for OTP → verify  
- Upload a product photo → object appears under Storage → `product-uploads/{userId}/...`  
- Generate → token balance drops in `profiles.tokens`  
- Successful Razorpay checkout → `/api/billing/apply-plan` updates plan via service role  

## Security notes

- Clients **cannot** set `plan_id` / `tokens` directly (RLS + trigger).  
- Plan upgrades go through Express `POST /api/billing/apply-plan` with the user JWT.  
- Service role key stays on the server only.
