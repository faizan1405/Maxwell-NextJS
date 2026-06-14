import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/main.scss';
import {
  SITE_URL,
  SITE_NAME,
  BRAND_NAME,
  LOCALE,
  DEFAULT_TITLE,
  TITLE_TEMPLATE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  IS_PRODUCTION_DEPLOY,
  BUSINESS,
  absoluteUrl,
} from '../lib/seo';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: BRAND_NAME }],
  generator: 'Next.js',
  keywords: [
    'Amahle Blue',
    'cleaning products South Africa',
    'car care South Africa',
    'sanitiser South Africa',
    'household cleaners',
    'Gauteng cleaning products',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: LOCALE,
    images: [{ url: DEFAULT_OG_IMAGE, alt: BRAND_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: '/assets/amahle-blue-logo.jpg',
    apple: '/assets/amahle-blue-logo.jpg',
    shortcut: '/assets/amahle-blue-logo.jpg',
  },
  // Block indexing on preview/dev deployments so they don't compete with production.
  robots: IS_PRODUCTION_DEPLOY
    ? { index: true, follow: true, googleBot: { index: true, follow: true } }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BUSINESS.legalName,
  alternateName: BUSINESS.name,
  url: SITE_URL,
  logo: BUSINESS.logo,
  email: BUSINESS.email,
  telephone: BUSINESS.telephone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: BUSINESS.address.streetAddress,
    addressLocality: BUSINESS.address.addressLocality,
    addressRegion: BUSINESS.address.addressRegion,
    addressCountry: BUSINESS.address.addressCountry,
  },
  sameAs: BUSINESS.sameAs,
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'en-ZA',
  publisher: { '@type': 'Organization', name: BUSINESS.legalName, url: SITE_URL },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-ZA" className={`${bricolage.variable} ${jakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
