const ghs = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ghs0 = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 });

export const money = (n, { compact = false } = {}) => {
  const v = Number(n) || 0;
  // Whole amounts read cleaner without ".00" (GH₵13,900), as shops in Ghana write prices.
  if ((compact && v >= 1000) || Number.isInteger(v)) return `GH₵${ghs0.format(v)}`;
  return `GH₵${ghs.format(v)}`;
};

export const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

export const dateTime = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};

export const dateShort = (v) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

export const timeAgo = (v) => {
  const d = toDate(v);
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(d);
};

export const slugify = (s = '') =>
  s.toString().toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export const discountPct = (price, compareAt) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

export const pluralize = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

export const orderNumber = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const arr = crypto.getRandomValues(new Uint32Array(8));
  for (const x of arr) s += alphabet[x % alphabet.length];
  return `GH-${s}`;
};
