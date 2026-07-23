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
