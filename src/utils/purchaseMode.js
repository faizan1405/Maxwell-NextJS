export const PURCHASE_MODES = ['cart', 'quote'];

export function hasPositivePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function normalizePurchaseMode(mode, price) {
  const raw = String(mode || '').toLowerCase();
  if (raw === 'quote') return 'quote';
  if (raw === 'both') return hasPositivePrice(price) ? 'cart' : 'quote';
  return hasPositivePrice(price) ? 'cart' : 'quote';
}

export function normalizeAdminPurchaseMode(mode, price) {
  const raw = String(mode || '').toLowerCase();
  if (raw === 'quote') return 'quote';
  if (raw === 'both') return hasPositivePrice(price) ? 'cart' : 'quote';
  return 'cart';
}
