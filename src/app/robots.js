import { SITE_URL, IS_PRODUCTION_DEPLOY } from '../lib/seo';

export default function robots() {
  // Block crawling entirely on preview/dev deployments so they don't compete
  // with production in search results.
  if (!IS_PRODUCTION_DEPLOY) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: SITE_URL,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/order-confirmed',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
