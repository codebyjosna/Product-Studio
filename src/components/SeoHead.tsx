import { useEffect } from 'react';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  FAQ_ITEMS,
  OG_IMAGE_PATH,
  ORGANIZATION_SCHEMA,
  SITE_NAME,
  SOFTWARE_SCHEMA,
  getSiteUrl,
  type SeoPageKey,
  PAGE_SEO,
} from '../seo/config';

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

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

    document.title = pageTitle;

    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'keywords', DEFAULT_KEYWORDS);
    upsertMeta('name', 'robots', shouldNoIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertMeta('name', 'googlebot', shouldNoIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'application-name', SITE_NAME);
    upsertMeta('name', 'theme-color', '#070b12');

    upsertMeta('property', 'og:type', page === 'home' ? 'website' : 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} — AI product video studio`);
    upsertMeta('property', 'og:locale', 'en_US');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', ogImage);

    upsertLink('canonical', canonical);

    const org = {
      ...ORGANIZATION_SCHEMA,
      url: siteUrl,
      logo: ogImage,
    };
    const software = {
      ...SOFTWARE_SCHEMA,
      url: siteUrl,
      image: ogImage,
    };
    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: siteUrl,
      description: DEFAULT_DESCRIPTION,
      publisher: { '@type': 'Organization', name: SITE_NAME },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    upsertJsonLd('ld-organization', org);
    upsertJsonLd('ld-software', software);
    upsertJsonLd('ld-website', website);
    if (page === 'home') {
      upsertJsonLd('ld-faq', faq);
    } else {
      document.getElementById('ld-faq')?.remove();
    }
  }, [page, title, description, path, noindex]);

  return null;
}
