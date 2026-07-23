export interface BillingAddress {
  name: string;
  email: string;
  fullAddress: string;
  city: string;
  state: string;
  pincode?: string;
  country: string;
}

export interface CheckoutDraft {
  planId: string;
  billing: 'monthly' | 'annual';
  address: BillingAddress;
}

const KEY = 'ps_checkout_draft';

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(KEY);
}
