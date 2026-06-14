// Central SEO configuration for Amahle Blue (Maxwell NextJS).
// Keep this file free of secrets, imports from server-only code, and per-customer data.

const FALLBACK_SITE_URL = 'https://www.amahle-blue.co.za';

function readEnv(name) {
  if (typeof process === 'undefined' || !process.env) return '';
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function normaliseUrl(url) {
  if (!url) return '';
  let u = url.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u.replace(/\/+$/, '');
}

// Production canonical URL. Order of precedence:
//   1. NEXT_PUBLIC_SITE_URL (set in Vercel project settings)
//   2. Hardcoded fallback (current production deployment)
// We do NOT use VERCEL_URL here because it points at the per-deployment URL
// (e.g. preview deployments), which would pollute canonical tags and the sitemap.
export const SITE_URL = normaliseUrl(readEnv('NEXT_PUBLIC_SITE_URL')) || FALLBACK_SITE_URL;

// VERCEL_ENV is "production" | "preview" | "development". We use it to suppress
// indexing on non-production deployments so previews never compete with the
// real site in search results.
const VERCEL_ENV = readEnv('VERCEL_ENV');
export const IS_PRODUCTION_DEPLOY = VERCEL_ENV ? VERCEL_ENV === 'production' : true;

export const BRAND_NAME = 'Amahle Blue';
export const SITE_NAME = 'Amahle Blue';
export const LOCALE = 'en_ZA';

export const DEFAULT_TITLE = 'Amahle Blue | Cleaning and Car-Care Products in South Africa';
export const TITLE_TEMPLATE = '%s | Amahle Blue';

export const DEFAULT_DESCRIPTION =
  'Shop household cleaning, sanitising and car-care products from Amahle Blue. Locally manufactured in Gauteng with fast nationwide delivery across South Africa.';

// Reuse the existing logo as the default share image. The logo is a JPG so it
// is broadly supported by social platforms even though it is not the
// recommended 1200x630 OG aspect.
export const DEFAULT_OG_IMAGE = '/assets/amahle-blue-logo.jpg';

// Build an absolute URL from a path that may be relative or already absolute.
export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${suffix}`;
}

// Helper to build a Next.js Metadata object for a public page.
// Pass { title, description, path } at minimum.
export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  ogType = 'website',
  noindex = false,
} = {}) {
  const url = absoluteUrl(path);
  const resolvedTitle = title || DEFAULT_TITLE;
  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: ogType,
      url,
      siteName: SITE_NAME,
      title: resolvedTitle,
      description,
      locale: LOCALE,
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), alt: BRAND_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
  };
}

// Verified business details mirrored from src/lib/storeContext.js BRAND for
// use in JSON-LD. Kept in sync manually because storeContext is a client
// module and importing it from server metadata would pull in React.
export const BUSINESS = {
  name: BRAND_NAME,
  legalName: 'Amahle Blue',
  email: 'info@amahle-blue.co.za',
  telephone: '+27671014345',
  address: {
    streetAddress: 'Unit H, 13 Main Reef Road',
    addressLocality: 'Boksburg',
    addressRegion: 'Gauteng',
    addressCountry: 'ZA',
  },
  sameAs: [
    'https://www.facebook.com/share/17sDJXMKSz/',
    'https://www.instagram.com/amahle_blue/',
  ],
  logo: absoluteUrl(DEFAULT_OG_IMAGE),
};
