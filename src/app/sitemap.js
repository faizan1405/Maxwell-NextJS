import { SITE_URL, IS_PRODUCTION_DEPLOY } from '../lib/seo';

// Because the storefront is a single client-rendered SPA, every storefront
// path (e.g. /shop, /faq, /cart) currently serves the homepage HTML with the
// same metadata and the same canonical URL ("/"). Listing those URLs in the
// sitemap today would point search engines at duplicate content, so we only
// include the canonical root. Dedicated server-rendered routes for /shop,
// category pages, and product detail pages are tracked as a future SEO
// enhancement in the audit report.
export default function sitemap() {
  if (!IS_PRODUCTION_DEPLOY) return [];
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/delivery-policy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/returns-refunds`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms-conditions`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];
}
