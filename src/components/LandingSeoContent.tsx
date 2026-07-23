import React from 'react';
import { Link } from 'react-router-dom';
import { FAQ_ITEMS, INTERNAL_LINKS, SITE_NAME } from '../seo/config';

/**
 * Crawlable SEO content + internal links.
 * Visually hidden — does not change landing layout, spacing, or styling.
 */
export function LandingSeoContent() {
  return (
    <aside className="sr-only" aria-label="Additional information about Product Studio">
      <nav aria-label="Primary SEO navigation">
        <ul>
          {INTERNAL_LINKS.map((item) => (
            <li key={item.href}>
              <Link to={item.href} title={item.title}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <a href="#seo-features" title="AI product video generator features">
              Features
            </a>
          </li>
          <li>
            <a href="#seo-faq" title="Frequently asked questions about AI product videos">
              FAQ
            </a>
          </li>
          <li>
            <Link to="/upgrade" title="Pricing for AI product video generator plans">
              Pricing
            </Link>
          </li>
        </ul>
      </nav>

      <section id="seo-features">
        <h2>AI Product Video Generator features</h2>
        <p>
          {SITE_NAME} is an AI video creation platform and AI product video generator for ecommerce
          teams. Create AI product ads, AI Instagram reels, and cinematic AI product showcases from
          still photography with AI image to video workflows.
        </p>
        <h3>AI image to video and product photography</h3>
        <p>
          Use AI product photography inputs with an AI background generator and AI scene generator to
          stage products, then render motion with an AI video maker and AI video editor.
        </p>
        <h3>AI reel generator for social and ecommerce</h3>
        <p>
          Produce AI marketing videos, AI commercial generator outputs, AI advertisement generator
          cuts, AI TikTok video generator-style clips, and AI ecommerce video generator assets for
          catalogs and paid social.
        </p>
        <h3>AI video software for product animation</h3>
        <p>
          {SITE_NAME} combines AI product animation, AI product ads, and AI video software tooling so
          brands ship campaign-ready reels without traditional production timelines.
        </p>
      </section>

      <section id="seo-faq">
        <h2>Frequently asked questions</h2>
        {FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>

      <section id="seo-legal">
        <h2>Policies and support</h2>
        <p>
          Review our{' '}
          <Link to="/terms" title="Terms and Conditions">
            Terms &amp; Conditions
          </Link>
          ,{' '}
          <Link to="/privacy" title="Privacy Policy">
            Privacy Policy
          </Link>
          , and{' '}
          <Link to="/refund" title="Refund and Cancellation Policy">
            Refund Policy
          </Link>
          , or{' '}
          <Link to="/contact" title="Contact Us">
            Contact Us
          </Link>{' '}
          for support. See the{' '}
          <Link to="/html-sitemap" title="HTML Sitemap">
            HTML Sitemap
          </Link>{' '}
          for all pages.
        </p>
      </section>
    </aside>
  );
}
