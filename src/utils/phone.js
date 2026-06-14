export function phoneDigits(raw) {
  return String(raw || '').replace(/\D/g, '');
}

export function normalizeSaPhone(raw) {
  let digits = phoneDigits(raw);
  if (!digits) return '';
  if (digits.startsWith('0027')) digits = digits.slice(2);
  if (digits.startsWith('27') && digits.length === 11) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `27${digits.slice(1)}`;
  return digits;
}

export function saPhoneVariants(raw) {
  const normalized = normalizeSaPhone(raw);
  if (!normalized) return [];

  const variants = new Set([normalized]);
  if (normalized.startsWith('27') && normalized.length === 11) {
    variants.add(`0${normalized.slice(2)}`);
    variants.add(`+${normalized}`);
  }
  return [...variants];
}

export function saPhoneRegexes(raw) {
  const normalized = normalizeSaPhone(raw);
  if (!normalized || !normalized.startsWith('27') || normalized.length !== 11) return [];

  const national = `0${normalized.slice(2)}`;
  const localPattern = national.split('').join('\\D*');
  const intlRestPattern = normalized.slice(2).split('').join('\\D*');

  return [
    new RegExp(`^\\D*${localPattern}\\D*$`),
    new RegExp(`^\\D*(?:\\+?27|0027)\\D*${intlRestPattern}\\D*$`),
  ];
}
