import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SeoHead } from '../components/SeoHead';
import { INTERNAL_LINKS, SITE_NAME } from '../seo/config';

/** Crawlable HTML sitemap — linked from robots.txt and landing SEO nav (not a design change to home). */
export function HtmlSitemapPage() {
  return (
    <>
      <SeoHead page="html-sitemap" />
      <div className="app-shell min-h-screen w-full flex flex-col font-sans text-snow">
        <AppHeader />
        <main className="flex-1 mx-auto w-full max-w-3xl px-6 md:px-10 py-10 md:py-14">
          <h1 className="text-3xl font-extrabold tracking-tight text-snow">HTML Sitemap</h1>
          <p className="mt-3 text-sm text-mist">
            Index of {SITE_NAME} pages for crawlers and visitors.
          </p>
          <nav aria-label="HTML sitemap" className="mt-10">
            <ul className="space-y-3 text-sm text-fog">
              {INTERNAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    title={item.title}
                    className="text-accent hover:text-accent-dim transition-colors"
                  >
                    {item.label}
                  </Link>
                  <span className="text-mist/60 ml-2">{item.href}</span>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-12 pt-6 border-t border-line/80 text-sm text-mist">
            <Link to="/" className="text-accent hover:text-accent-dim" title="Back to home">
              ← Back to home
            </Link>
          </p>
        </main>
      </div>
    </>
  );
}
