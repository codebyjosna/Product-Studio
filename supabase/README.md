# Supabase setup — Product Studio

## Linked project

- **URL:** `https://cszskydtgrsocmtgteik.supabase.co`
- **Migrations:** `001_init.sql`, `002_countries_fx.sql` (countries + USD base pricing), `003_fx_cron.sql`
- **Edge Functions:** `me`, `consume-tokens`, `apply-plan`, `update-fx-rates`

## Auth email OTP (Resend SMTP)

Custom SMTP is configured on the project Auth settings:

| Setting | Value |
|---------|--------|
| Host | `smtp.resend.com` |
| Port | `465` |
| User | `resend` |
| Pass | Resend API key |
| From | `info@codewix.in` |
| Sender name | Product Studio |
| OTP length | 6 digits |

Confirm signup / reset templates include `{{ .Token }}`.

**Required:** Verify the `codewix.in` domain (or your sender domain) in the [Resend dashboard](https://resend.com/domains). Until verified, Resend may reject sends from `info@codewix.in`. For testing only, you can temporarily use `beth.t@example.com` as the sender.

## Local env

Copy values into `.env.local` (gitignored). Never commit service role / access tokens / DB password / Resend keys.

```env
VITE_SUPABASE_URL=https://cszskydtgrsocmtgteik.supabase.co
VITE_SUPABASE_ANON_KEY=<anon jwt>
SUPABASE_URL=https://cszskydtgrsocmtgteik.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role jwt>
GEMINI_API_KEY=<gemini key>
```

## CLI commands

```bash
npx supabase login --token <SUPABASE_ACCESS_TOKEN>
npx supabase link --project-ref cszskydtgrsocmtgteik
npx supabase db push
npx supabase functions deploy me
npx supabase functions deploy consume-tokens
npx supabase functions deploy apply-plan
npx supabase functions deploy update-fx-rates --no-verify-jwt
npx supabase secrets set EXCHANGE_RATE_API_KEY=... FX_CRON_SECRET=...
node --env-file=.env.local scripts/schedule-fx-cron.mjs
```

## Countries / FX

- Table `public.countries`: `name`, `code_alpha2`, `code_alpha3`, `currency_code`, `fx_rate` (USD base)
- `app_settings.base_pricing_usd`: plan prices in USD
- Cron `update-fx-rates-1am-1pm`: `0 1,13 * * *` (01:00 & 13:00 UTC)

Dashboard → Authentication → Email Templates: include `{{ .Token }}` in Confirm signup / Reset password.

## Edge Function URLs

```
https://cszskydtgrsocmtgteik.supabase.co/functions/v1/me
https://cszskydtgrsocmtgteik.supabase.co/functions/v1/consume-tokens
https://cszskydtgrsocmtgteik.supabase.co/functions/v1/apply-plan
https://cszskydtgrsocmtgteik.supabase.co/functions/v1/update-fx-rates
```

Pass `Authorization: Bearer <user_access_token>` and `apikey: <anon_key>` for user functions. `update-fx-rates` uses service role or `x-cron-secret`.
