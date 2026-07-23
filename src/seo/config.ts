/** Central SEO & brand configuration — production landing / sitewide. */

export const SITE_NAME = 'Product Studio';
export const LEGAL_ENTITY = 'Codewix Studio';
export const SITE_TAGLINE =
  'AI product video studio — turn product photos into cinematic vibe reels';

/** 156 characters — AI Product Video Generator focused */
export const DEFAULT_TITLE =
  'AI Product Video Generator | Product Studio — Ads, Reels & Ecommerce Videos';

export const DEFAULT_DESCRIPTION =
  'Product Studio is an AI product video generator that turns photos into cinematic ads, Instagram reels & ecommerce videos. Faster creative cycles for teams.';

export const DEFAULT_KEYWORDS = [
  'AI Video Generator',
  'AI Product Video Generator',
  'AI Commercial Generator',
  'AI Advertisement Generator',
  'AI Marketing Video Maker',
  'AI Image to Video',
  'AI Product Photography',
  'AI Background Generator',
  'AI Scene Generator',
  'AI Product Showcase',
  'AI Video Editor',
  'AI Reel Generator',
  'AI TikTok Video Generator',
  'AI Instagram Reel Generator',
  'AI Ecommerce Video Generator',
  'AI Product Ads',
  'AI Video Creation Platform',
  'AI Video Maker',
  'AI Product Animation',
  'AI Video Software',
].join(', ');

export const COMPANY = {
  name: LEGAL_ENTITY,
  alternateName: SITE_NAME,
  email: 'info@codewix.in',
  telephone: '+91-9746109569',
  address: {
    streetAddress: '46/A1, Ground Floor, Mannur, Mattannur',
    addressLocality: 'Kannur',
    addressRegion: 'Kerala',
    postalCode: '670702',
    addressCountry: 'IN',
  },
} as const;

/** Primary locale + future expansion hooks */
export const DEFAULT_LOCALE = 'en_US';
export const DEFAULT_LANG = 'en';
export const SUPPORTED_LOCALES = [
  { hreflang: 'en', locale: 'en_US', pathPrefix: '' },
  { hreflang: 'en-IN', locale: 'en_IN', pathPrefix: '' },
  { hreflang: 'x-default', locale: 'en_US', pathPrefix: '' },
] as const;

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
export const FAVICON_PATH = '/favicon.svg';

export type SeoPageKey =
  | 'home'
  | 'signin'
  | 'signup'
  | 'upgrade'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'contact'
  | 'html-sitemap'
  | 'studio';

export const PAGE_SEO: Record<
  SeoPageKey,
  { title: string; description: string; path: string; noindex?: boolean }
> = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  },
  studio: {
    title: 'AI Product Video Studio | Product Studio Workspace',
    description:
      'Open the Product Studio workspace to generate AI product videos, atmospheres, Instagram reels, and ecommerce ads from product photos.',
    path: '/studio',
  },
  signin: {
    title: 'Sign In | Product Studio AI Video Generator',
    description:
      'Sign in to Product Studio to generate AI product videos, manage tokens, and access your cinematic reel workspace.',
    path: '/signin',
    noindex: true,
  },
  signup: {
    title: 'Create Account | Product Studio AI Video Maker',
    description:
      'Create a Product Studio account and get started with AI-powered product video generation for ecommerce and brand marketing.',
    path: '/signup',
  },
  upgrade: {
    title: 'Pricing & Plans | AI Product Video Generator — Product Studio',
    description:
      'Compare Free, Starter, Pro, and Enterprise plans for Product Studio. Scale AI product video generation with flexible tokens.',
    path: '/upgrade',
  },
  terms: {
    title: 'Terms & Conditions | Codewix Studio',
    description:
      'Terms and conditions for using Codewix Studio Product Studio AI product video services.',
    path: '/terms',
  },
  privacy: {
    title: 'Privacy Policy | Codewix Studio',
    description:
      'How Codewix Studio collects, uses, and protects your data when you use Product Studio AI video generation.',
    path: '/privacy',
  },
  refund: {
    title: 'Refund & Cancellation Policy | Codewix Studio',
    description:
      'Refund and cancellation terms for Codewix Studio Pro subscriptions and paid AI product video services.',
    path: '/refund',
  },
  contact: {
    title: 'Contact Us | Codewix Studio Product Studio Support',
    description:
      'Contact Codewix Studio for support, billing, account help, partnerships, and feedback. Email info@codewix.in or call +91 9746109569.',
    path: '/contact',
  },
  'html-sitemap': {
    title: 'HTML Sitemap | Product Studio — AI Product Video Generator',
    description:
      'Browse all Product Studio pages: studio, pricing, FAQ topics, contact, privacy, terms, and refund policy.',
    path: '/html-sitemap',
  },
};

export const INTERNAL_LINKS = [
  { href: '/', label: 'Home — AI Product Video Generator', title: 'Product Studio home' },
  { href: '/studio', label: 'AI Video Studio', title: 'Open the AI product video studio' },
  { href: '/upgrade', label: 'Pricing', title: 'AI product video generator pricing and plans' },
  { href: '/signup', label: 'Create account', title: 'Sign up for Product Studio' },
  { href: '/contact', label: 'Contact Us', title: 'Contact Codewix Studio support' },
  { href: '/privacy', label: 'Privacy Policy', title: 'Read our privacy policy' },
  { href: '/terms', label: 'Terms & Conditions', title: 'Read terms and conditions' },
  { href: '/refund', label: 'Refund Policy', title: 'Refund and cancellation policy' },
  { href: '/html-sitemap', label: 'HTML Sitemap', title: 'Full HTML sitemap' },
] as const;

export function buildOrganizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: COMPANY.name,
    alternateName: COMPANY.alternateName,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}${OG_IMAGE_PATH}`,
      width: 1200,
      height: 630,
    },
    image: `${siteUrl}${OG_IMAGE_PATH}`,
    description: DEFAULT_DESCRIPTION,
    email: COMPANY.email,
    telephone: COMPANY.telephone,
    address: {
      '@type': 'PostalAddress',
      ...COMPANY.address,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: COMPANY.email,
        telephone: COMPANY.telephone,
        availableLanguage: ['English'],
        areaServed: 'Worldwide',
      },
    ],
    sameAs: [] as string[],
  };
}

export function buildSoftwareSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: SITE_NAME,
    alternateName: [
      'AI Product Video Generator',
      'AI Video Maker',
      'AI Ecommerce Video Generator',
    ],
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'AI Video Creation Platform',
    operatingSystem: 'Web',
    url: siteUrl,
    image: `${siteUrl}${OG_IMAGE_PATH}`,
    description: DEFAULT_DESCRIPTION,
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '50',
      priceCurrency: 'USD',
      offerCount: 4,
      url: `${siteUrl}/upgrade`,
    },
    featureList: [
      'AI Product Video Generator',
      'AI Image to Video',
      'AI Product Photography',
      'AI Background Generator',
      'AI Scene Generator',
      'AI Product Showcase',
      'AI Reel Generator',
      'AI Instagram Reel Generator',
      'AI Ecommerce Video Generator',
      'AI Product Ads',
      'AI Video Editor',
    ],
    creator: { '@id': `${siteUrl}/#organization` },
    publisher: { '@id': `${siteUrl}/#organization` },
  };
}

export function buildWebSiteSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: SITE_NAME,
    alternateName: 'AI Product Video Generator',
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    inLanguage: DEFAULT_LANG,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/html-sitemap`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildWebPageSchema(opts: {
  siteUrl: string;
  path: string;
  title: string;
  description: string;
}) {
  const url = `${opts.siteUrl}${opts.path === '/' ? '' : opts.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': `${opts.siteUrl}/#website` },
    about: { '@id': `${opts.siteUrl}/#software` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: `${opts.siteUrl}${OG_IMAGE_PATH}`,
      width: 1200,
      height: 630,
    },
    inLanguage: DEFAULT_LANG,
    dateModified: '2026-07-23',
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
}

export function buildBreadcrumbSchema(
  siteUrl: string,
  crumbs: Array<{ name: string; path: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${siteUrl}${crumbs[crumbs.length - 1]?.path === '/' ? '' : crumbs[crumbs.length - 1]?.path}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path === '/' ? '' : c.path}`,
    })),
  };
}

export const FAQ_ITEMS = [
  {
    question: 'What is an AI product video generator?',
    answer:
      'An AI product video generator like Product Studio turns static product photos into cinematic marketing videos, ecommerce ads, and social reels using AI image-to-video and scene generation.',
  },
  {
    question: 'How does Product Studio create AI product videos?',
    answer:
      'Upload a product photo, choose or generate an atmosphere with the AI background and scene generator, then Product Studio renders a cinematic reel you can edit and download for ads or Instagram.',
  },
  {
    question: 'Can I make AI Instagram reels and TikTok-style product videos?',
    answer:
      'Yes. Product Studio is built as an AI reel generator and AI marketing video maker for short-form product showcases suited to Instagram Reels, TikTok-style clips, and ecommerce product ads.',
  },
  {
    question: 'Is Product Studio an AI ecommerce video generator for catalogs?',
    answer:
      'Yes. Teams use Product Studio as AI video software to produce product animation and AI product ads across SKUs without a full production shoot for every campaign.',
  },
  {
    question: 'Who should use this AI video creation platform?',
    answer:
      'Ecommerce brands, DTC marketers, agencies, and enterprise creative teams that need an AI commercial generator and AI advertisement generator with fast, on-brand product video output.',
  },
] as const;

/** @deprecated kept for any older imports — prefer buildOrganizationSchema */
export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  url: undefined as string | undefined,
  logo: undefined as string | undefined,
  sameAs: [] as string[],
};

/** @deprecated prefer buildSoftwareSchema */
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
