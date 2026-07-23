/** Central SEO & brand configuration for Product Studio. */

export const SITE_NAME = 'Product Studio';
export const SITE_TAGLINE =
  'AI product video studio — turn product photos into cinematic vibe reels';

export const DEFAULT_TITLE =
  'Product Studio | AI Product Video Generator — Cinematic Reels from Photos';

export const DEFAULT_DESCRIPTION =
  'Product Studio is an enterprise-ready AI product video platform. Upload a product photo, choose an atmosphere, and generate cinematic marketing reels with Gemini Omni. Faster creative cycles, on-brand motion, measurable campaign output.';

export const DEFAULT_KEYWORDS = [
  'AI product video generator',
  'product video AI',
  'cinematic product reels',
  'ecommerce video marketing',
  'AI vibe reels',
  'product photography to video',
  'Gemini product video',
  'Omni video generation',
  'brand content studio',
  'enterprise product marketing AI',
  'shopify product video',
  'DTC creative automation',
].join(', ');

/** Prefer VITE_SITE_URL in production; falls back to current origin in the browser. */
export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://productstudio.app';
}

export const OG_IMAGE_PATH = '/og-image.svg';

export type SeoPageKey =
  | 'home'
  | 'signin'
  | 'signup'
  | 'upgrade'
  | 'terms'
  | 'privacy';

export const PAGE_SEO: Record<
  SeoPageKey,
  { title: string; description: string; path: string; noindex?: boolean }
> = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  },
  signin: {
    title: 'Sign In | Product Studio',
    description:
      'Sign in to Product Studio to generate AI product videos, manage tokens, and access your cinematic reel workspace.',
    path: '/signin',
    noindex: true,
  },
  signup: {
    title: 'Create Account | Product Studio',
    description:
      'Create a Product Studio account and get started with AI-powered product video generation for ecommerce and brand marketing.',
    path: '/signup',
  },
  upgrade: {
    title: 'Pricing & Plans | Product Studio',
    description:
      'Compare Starter, Pro, and Enterprise plans for Product Studio. Scale AI product video generation with flexible tokens and unlimited creative output.',
    path: '/upgrade',
  },
  terms: {
    title: 'Terms & Conditions | Product Studio',
    description: 'Terms and conditions for using Product Studio AI product video services.',
    path: '/terms',
  },
  privacy: {
    title: 'Privacy Policy | Product Studio',
    description:
      'How Product Studio collects, uses, and protects your data when you generate AI product videos.',
    path: '/privacy',
  },
};

export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  url: undefined as string | undefined,
  logo: undefined as string | undefined,
  sameAs: [] as string[],
};

export const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  description: DEFAULT_DESCRIPTION,
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '0',
    highPrice: '50',
    priceCurrency: 'USD',
    offerCount: 4,
  },
  featureList: [
    'AI product image generation',
    'Atmosphere-driven cinematic reels',
    'Gemini Omni video pipeline',
    'Iterative video editing with version history',
    'Enterprise plans and token-based generation',
  ],
};

export const FAQ_ITEMS = [
  {
    question: 'What is Product Studio?',
    answer:
      'Product Studio is an AI product video platform that turns static product photos into cinematic marketing reels. Pair your product with an atmosphere, then generate and refine video creatives for ecommerce, DTC, and brand campaigns.',
  },
  {
    question: 'How does AI product video generation work?',
    answer:
      'You upload or select a product image, choose or generate an atmosphere, and Product Studio writes a cinematic directive then renders a reel with Gemini Omni. You can edit versions with natural-language instructions and download the final MP4.',
  },
  {
    question: 'Who is Product Studio built for?',
    answer:
      'Ecommerce teams, DTC brands, agencies, and enterprise creative ops that need faster product video output without a full production shoot for every SKU or campaign angle.',
  },
  {
    question: 'Can Product Studio scale for enterprise teams?',
    answer:
      'Yes. Plans include token-based generation for Starter and Pro, plus Enterprise unlimited tokens for high-volume product video production across catalogs and markets.',
  },
  {
    question: 'What results should marketing teams expect?',
    answer:
      'Faster creative cycles, consistent on-brand motion assets from existing photography, and more testable product video variants for ads, PDPs, and social — without waiting on traditional video production timelines.',
  },
] as const;
