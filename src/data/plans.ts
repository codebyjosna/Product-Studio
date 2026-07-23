export type Billing = 'monthly' | 'annual';

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  tagline: string;
  tokens: string;
  duration: string;
  features: string[];
  popular?: boolean;
  icon: 'circle' | 'triangle' | 'hex';
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 3,
    tagline: 'Best for trying Product Studio',
    tokens: '1,000 tokens',
    duration: '30 days',
    features: [
      '1,000 generation tokens',
      '30-day access window',
      'Standard render quality',
      'Email support',
    ],
    icon: 'circle',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 10,
    tagline: 'Most popular plan',
    tokens: '4,500 tokens',
    duration: '30 days',
    features: [
      '4,500 generation tokens',
      '30-day access window',
      'Priority render queue',
      'HD video exports',
      'Chat support',
    ],
    popular: true,
    icon: 'triangle',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 50,
    tagline: 'Best for growing brands',
    tokens: 'Unlimited tokens',
    duration: '30 days',
    features: [
      'Unlimited generation tokens',
      '30-day access window',
      'Highest priority queue',
      'Team-ready workflow',
      'Dedicated support',
    ],
    icon: 'hex',
  },
];

export function getPlanById(id: string | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((p) => p.id === id);
}

export function planPrice(plan: Plan, billing: Billing): number {
  return billing === 'monthly' ? plan.monthlyPrice : plan.monthlyPrice * 10;
}

export function parseBilling(value: string | null | undefined): Billing {
  return value === 'annual' ? 'annual' : 'monthly';
}
