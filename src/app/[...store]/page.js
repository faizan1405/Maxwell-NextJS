import { buildPageMetadata } from '../../lib/seo';

const ROUTE_META = {
  'privacy-policy': {
    title: 'Privacy Policy',
    description: 'How Amahle Blue collects, uses and protects your personal information in compliance with POPIA.',
    path: '/privacy-policy',
  },
  'terms-conditions': {
    title: 'Terms & Conditions',
    description: 'Terms and conditions governing the use of the Amahle Blue website and the purchase of our products.',
    path: '/terms-conditions',
  },
  'delivery-policy': {
    title: 'Delivery Policy',
    description: 'Delivery areas, timeframes and costs for Amahle Blue orders across South Africa.',
    path: '/delivery-policy',
  },
  'returns-refunds': {
    title: 'Returns & Refunds Policy',
    description: 'Our returns and refunds policy for Amahle Blue cleaning and car-care products.',
    path: '/returns-refunds',
  },
  'faq': {
    title: 'FAQ — Frequently Asked Questions',
    description: 'Answers to common questions about Amahle Blue products, ordering, delivery and returns.',
    path: '/faq',
  },
};

export function generateMetadata({ params }) {
  const slug = Array.isArray(params?.store) ? params.store.join('/') : (params?.store || '');
  const meta = ROUTE_META[slug];
  if (!meta) return {};
  return buildPageMetadata(meta);
}

export { default } from '../page';
