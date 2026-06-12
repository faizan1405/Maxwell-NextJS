export function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatZar(value) {
  const amount = normalizeAmount(value);
  const sign = amount < 0 ? '-' : '';
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}R ${grouped}.${dec}`;
}

export function formatZarCompact(value, options = {}) {
  const { threshold = 10000 } = options;
  const amount = normalizeAmount(value);
  const abs = Math.abs(amount);

  if (abs < threshold) return formatZar(amount);

  const sign = amount < 0 ? '-' : '';
  const units = [
    { value: 1_000_000_000, suffix: 'b' },
    { value: 1_000_000, suffix: 'm' },
    { value: 1_000, suffix: 'k' },
  ];
  const unit = units.find((u) => abs >= u.value) || units[units.length - 1];

  return `${sign}R${(abs / unit.value).toFixed(1)}${unit.suffix}`;
}

export const formatCurrency = formatZar;
