/**
 * WhatsApp quote helpers — pure functions, no React.
 *
 * Used by ProductCard and QuickView to render the "Get Quote on WhatsApp" CTA
 * for products whose admin-configured purchaseMode is 'quote' or 'both'.
 *
 * Number resolution order (first non-empty wins):
 *   1. product.whatsappNumber
 *   2. settings.whatsapp.number
 *   3. fallback '27671014345'  (Amahle Blue main line)
 *
 * Message template uses {{variable}} placeholders. Supported variables:
 *   productName, variant, price, productUrl, sku
 *
 * Missing/empty values render as the literal "-" so the recipient still sees
 * a coherent message ("Variant/Size: -" rather than "Variant/Size: undefined").
 */

import { formatZar } from './currency';

const FALLBACK_NUMBER = '27671014345';
const FALLBACK_MESSAGE = `Hello Amahle Blue, I am interested in this product:

Product: {{productName}}
Variant/Size: {{variant}}
Price: {{price}}
SKU: {{sku}}
Product Link: {{productUrl}}

Please send me more details and quotation.`;

export function resolveWaNumber(product, settings) {
  const fromProduct = String(product?.whatsappNumber || '').replace(/[^\d+]/g, '');
  if (fromProduct) return fromProduct.replace(/^\+/, '');
  const fromSettings = String(settings?.whatsapp?.number || '').replace(/[^\d+]/g, '');
  if (fromSettings) return fromSettings.replace(/^\+/, '');
  return FALLBACK_NUMBER;
}

export function resolveWaTemplate(product, settings) {
  const fromProduct = String(product?.whatsappMessage || '').trim();
  if (fromProduct) return fromProduct;
  const fromSettings = String(settings?.whatsapp?.defaultMessage || '').trim();
  if (fromSettings) return fromSettings;
  return FALLBACK_MESSAGE;
}

export function renderTemplate(template, vars) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const v = vars[key];
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
  });
}

export function productUrl(product) {
  if (typeof window === 'undefined') return product?.id ? `/shop?p=${product.id}` : '/shop';
  return `${window.location.origin}/shop?p=${encodeURIComponent(product?.id || '')}`;
}

export function buildWaUrl(product, { variant = null, settings = null } = {}) {
  const number = resolveWaNumber(product, settings);
  const template = resolveWaTemplate(product, settings);

  const variantName = variant?.name || variant || product?.size || '';
  const variantPrice = variant?.price ?? product?.price ?? 0;
  const priceStr = variantPrice > 0 ? formatZar(variantPrice) : 'On request';

  const message = renderTemplate(template, {
    productName: product?.name || '',
    variant: variantName,
    price: priceStr,
    productUrl: productUrl(product),
    sku: product?.sku || '',
  });

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productPurchaseMode(product) {
  const mode = String(product?.purchaseMode || 'cart').toLowerCase();
  if (mode === 'quote' || mode === 'both') return mode;
  return 'cart';
}

export function showCart(product) {
  const mode = productPurchaseMode(product);
  return mode === 'cart' || mode === 'both';
}

export function showWhatsApp(product) {
  const mode = productPurchaseMode(product);
  if (mode === 'cart') return false;
  return product?.whatsappEnabled !== false;
}
