import { useEffect } from 'react';
import {
  COMPANY,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_LANG,
  DEFAULT_LOCALE,
  DEFAULT_TITLE,
  FAVICON_PATH,
  FAQ_ITEMS,
  OG_IMAGE_PATH,
  PAGE_SEO,
  SITE_NAME,
  SUPPORTED_LOCALES,
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildSoftwareSchema,
  buildWebPageSchema,
  buildWebSiteSchema,
  getSiteUrl,
  type SeoPageKey,
} from '../seo/config';

function upsertMeta(attr: 'name' | 'property' | 'http-equiv', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, attrs?: Record<string, string>) {
  const selector = attrs?.hreflang
    ? `link[rel="${rel}"][hreflang="${attrs.hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  }
}

function upsertJsonLd(id: string, data: Record<string, unknown> | null) {
  if (!data) {
    document.getElementById(id)?.remove();
    return;
  }
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function ensurePreconnect(href: string, crossOrigin?: boolean) {
  const existing = document.head.querySelector(`link[rel="preconnect"][href="${href}"]`);
  if (existing) return;
  const el = document.createElement('link');
  el.rel = 'preconnect';
  el.href = href;
  if (crossOrigin) el.crossOrigin = 'anonymous';
  document.head.appendChild(el);
}

function ensureDnsPrefetch(href: string) {
  const existing = document.head.querySelector(`link[rel="dns-prefetch"][href="${href}"]`);
  if (existing) return;
  const el = document.createElement('link');
  el.rel = 'dns-prefetch';
  el.href = href;
  document.head.appendChild(el);
}

const BREADCRUMBS: Partial<Record<SeoPageKey, Array<{ name: string; path: string }>>> = {
  home: [{ name: 'Home', path: '/' }],
  studio: [
    { name: 'Home', path: '/' },
    { name: 'Studio', path: '/studio' },
  ],
  upgrade: [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/upgrade' },
  ],
  contact: [
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ],
  terms: [
    { name: 'Home', path: '/' },
    { name: 'Terms & Conditions', path: '/terms' },
  ],
  privacy: [
    { name: 'Home', path: '/' },
    { name: 'Privacy Policy', path: '/privacy' },
  ],
  refund: [
    { name: 'Home', path: '/' },
    { name: 'Refund Policy', path: '/refund' },
  ],
  'html-sitemap': [
    { name: 'Home', path: '/' },
    { name: 'HTML Sitemap', path: '/html-sitemap' },
  ],
  signup: [
    { name: 'Home', path: '/' },
    { name: 'Sign Up', path: '/signup' },
  ],
};

export function SeoHead({
  page = 'home',
  title,
  description,
  path,
  noindex,
}: {
  page?: SeoPageKey;
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}) {
  useEffect(() => {
    const preset = PAGE_SEO[page];
    const siteUrl = getSiteUrl();
    const pageTitle = title ?? preset.title ?? DEFAULT_TITLE;
    const pageDescription = description ?? preset.description ?? DEFAULT_DESCRIPTION;
    const pagePath = path ?? preset.path ?? '/';
    const canonical = `${siteUrl}${pagePath === '/' ? '' : pagePath}`;
    const ogImage = `${siteUrl}${OG_IMAGE_PATH}`;
    const shouldNoIndex = noindex ?? preset.noindex ?? false;

    document.documentElement.lang = DEFAULT_LANG;
    document.title = pageTitle;

    // Performance hints (CWV)
    ensurePreconnect('https://fonts.googleapis.com');
    ensurePreconnect('https://fonts.gstatic.com', true);
    ensureDnsPrefetch('https://fonts.googleapis.com');
    ensureDnsPrefetch('https://fonts.gstatic.com');

    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'keywords', DEFAULT_KEYWORDS);
    upsertMeta(
      'name',
      'robots',
      shouldNoIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    upsertMeta('name', 'googlebot', shouldNoIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    upsertMeta('name', 'bingbot', shouldNoIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'author', COMPANY.name);
    upsertMeta('name', 'publisher', COMPANY.name);
    upsertMeta('name', 'application-name', SITE_NAME);
    upsertMeta('name', 'apple-mobile-web-app-title', SITE_NAME);
    upsertMeta('name', 'apple-mobile-web-app-capable', 'yes');
    upsertMeta('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');
    upsertMeta('name', 'mobile-web-app-capable', 'yes');
    upsertMeta('name', 'theme-color', '#070b12');
    upsertMeta('name', 'msapplication-TileColor', '#070b12');
    upsertMeta('name', 'msapplication-config', 'none');
    upsertMeta('name', 'format-detection', 'telephone=no');
    upsertMeta('name', 'referrer', 'strict-origin-when-cross-origin');
    upsertMeta('name', 'color-scheme', 'dark');

    // Open Graph + locale
    upsertMeta('property', 'og:type', page === 'home' ? 'website' : 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:secure_url', ogImage);
    upsertMeta('property', 'og:image:type', 'image/png');
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} — AI Product Video Generator`);
    upsertMeta('property', 'og:locale', DEFAULT_LOCALE);
    upsertMeta('property', 'og:locale:alternate', 'en_IN');

    // Twitter / X
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertMeta('name', 'twitter:image:alt', `${SITE_NAME} — AI Product Video Generator`);

    upsertLink('canonical', canonical);
    upsertLink('manifest', `${siteUrl}/site.webmanifest`);
    upsertLink('icon', `${siteUrl}${FAVICON_PATH}`, { type: 'image/svg+xml' });
    upsertLink('apple-touch-icon', `${siteUrl}${FAVICON_PATH}`);
    upsertLink('sitemap', `${siteUrl}/sitemap.xml`, { type: 'application/xml' });

    for (const loc of SUPPORTED_LOCALES) {
      upsertLink('alternate', canonical, { hreflang: loc.hreflang });
    }

    // Structured data
    upsertJsonLd('ld-organization', buildOrganizationSchema(siteUrl));
    upsertJsonLd('ld-software', buildSoftwareSchema(siteUrl));
    upsertJsonLd('ld-website', buildWebSiteSchema(siteUrl));
    upsertJsonLd(
      'ld-webpage',
      buildWebPageSchema({
        siteUrl,
        path: pagePath,
        title: pageTitle,
        description: pageDescription,
      })
    );

    const crumbs = BREADCRUMBS[page] ?? [{ name: pageTitle, path: pagePath }];
    upsertJsonLd('ld-breadcrumb', buildBreadcrumbSchema(siteUrl, crumbs));

    if (page === 'home') {
      upsertJsonLd('ld-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${siteUrl}/#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      });
    } else {
      upsertJsonLd('ld-faq', null);
    }

    // Article / Review intentionally omitted — no blog posts or testimonials on this surface
  }, [page, title, description, path, noindex]);

  return null;
}
