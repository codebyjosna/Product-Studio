import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeadersFor } from '../_shared/cors.ts'

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  })
}

/** Locked: unpaid plan grants are no longer allowed. Use confirm-razorpay-payment. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(req) })
  return json(
    req,
    {
      error:
        'Direct plan upgrades are disabled. Complete Razorpay checkout; the app calls confirm-razorpay-payment after a verified payment.',
    },
    403,
  )
})
