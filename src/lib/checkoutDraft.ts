import type { BillingAddress, CheckoutDraft } from './checkoutDraftTypes';
import { getSupabase } from './supabase';

export type { BillingAddress, CheckoutDraft } from './checkoutDraftTypes';

export async function saveCheckoutDraft(draft: CheckoutDraft): Promise<void> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sign in to continue checkout.');

  const { error } = await supabase.from('checkout_drafts').upsert(
    {
      user_id: auth.user.id,
      plan_id: draft.planId,
      billing: draft.billing,
      address: draft.address,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function loadCheckoutDraft(): Promise<CheckoutDraft | null> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('checkout_drafts')
    .select('plan_id, billing, address')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    planId: data.plan_id,
    billing: data.billing === 'annual' ? 'annual' : 'monthly',
    address: data.address as BillingAddress,
  };
}

export async function clearCheckoutDraft(): Promise<void> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('checkout_drafts').delete().eq('user_id', auth.user.id);
}
