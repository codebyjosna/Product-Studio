# Edge Functions — Product Studio

Deployed functions (require user JWT `Authorization: Bearer <access_token>`):

| Function | Method | Purpose |
|----------|--------|---------|
| `me` | GET | Return current profile session |
| `consume-tokens` | POST `{ "cost": 10 }` | Deduct generation tokens |
| `apply-plan` | POST | **Disabled (403)** — use `confirm-razorpay-payment` |
| `create-razorpay-order` | POST | Auth required; server-priced Razorpay order |
| `confirm-razorpay-payment` | POST | Verify signature + apply plan |
| `update-fx-rates` | POST | Refresh `countries.fx_rate` (cron 01:00 & 13:00 UTC) |

Base URL:

```
https://cszskydtgrsocmtgteik.supabase.co/functions/v1/<function-name>
```

Secrets set via CLI (never commit):

- `GEMINI_API_KEY`
- `EXCHANGE_RATE_API_KEY` (ExchangeRate-API v6)
- `FX_CRON_SECRET` (optional header auth for `update-fx-rates`)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by the platform for linked projects; extra secrets are listed in project dashboard → Edge Functions → Secrets.
