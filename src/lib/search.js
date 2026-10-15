// Client-side catalogue search & faceting. A single-store catalogue (hundreds to a
// few thousand items) fits comfortably in memory, giving instant results with typo
// tolerance, which beats Firestore's prefix-only queries.

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFKD').replace(/[^\w\s.]/g, ' ');

const haystack = (p) =>
  norm([p.name, p.brand, p.category, p.condition, p.sku, ...(p.tags || []), ...(p.keywords || []),
    ...Object.values(p.specs || {})].join(' '));

// Tiny edit-distance check for typo tolerance (e.g. "lenevo" → "lenovo").
const near = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

export const searchProducts = (products, q) => {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return products;
  const scored = [];
  for (const p of products) {
    const h = haystack(p);
    const words = h.split(/\s+/);
    const name = norm(p.name);
    let score = 0;
    let ok = true;
    for (const t of terms) {
      if (name.includes(t)) score += 5;
      else if (h.includes(t)) score += 2;
      else if (t.length > 3 && words.some((w) => near(w, t))) score += 1;
      else { ok = false; break; }
    }
    if (ok) scored.push([score + (p.featured ? 0.5 : 0) + (p.stock > 0 ? 0.5 : 0), p]);
  }
  return scored.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
};

export const parseGb = (s) => {
  if (s == null) return 0;
  if (typeof s === 'number') return s;
  const m = String(s).match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
  if (!m) return 0;
  return m[2].toLowerCase() === 'tb' ? parseFloat(m[1]) * 1024 : parseFloat(m[1]);
};

export const cpuFamily = (s = '') => {
  const t = s.toLowerCase();
  if (/apple|m[1-4]\b/.test(t)) return 'Apple M-series';
  if (/i9|ultra 9|ryzen 9/.test(t)) return t.includes('ryzen') ? 'AMD Ryzen 9' : 'Intel Core i9 / Ultra 9';
  if (/i7|ultra 7/.test(t)) return 'Intel Core i7 / Ultra 7';
  if (/i5|ultra 5/.test(t)) return 'Intel Core i5 / Ultra 5';
  if (/i3/.test(t)) return 'Intel Core i3';
  if (/ryzen 7/.test(t)) return 'AMD Ryzen 7';
  if (/ryzen 5/.test(t)) return 'AMD Ryzen 5';
  if (/ryzen 3/.test(t)) return 'AMD Ryzen 3';
  if (/celeron|pentium|n100|n200/.test(t)) return 'Intel Celeron / N-series';
  if (/snapdragon/.test(t)) return 'Snapdragon';
  return t ? 'Other' : '';
};

export const SORTS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'discount', label: 'Biggest discount' },
];

export const sortProducts = (list, sort) => {
  const a = [...list];
  const disc = (p) => (p.compareAtPrice > p.price ? (p.compareAtPrice - p.price) / p.compareAtPrice : 0);
  switch (sort) {
    case 'price-asc': return a.sort((x, y) => x.price - y.price);
    case 'price-desc': return a.sort((x, y) => y.price - x.price);
    case 'newest': return a.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
    case 'rating': return a.sort((x, y) => (y.rating || 0) - (x.rating || 0) || (y.reviewCount || 0) - (x.reviewCount || 0));
    case 'popular': return a.sort((x, y) => (y.soldCount || 0) - (x.soldCount || 0));
    case 'discount': return a.sort((x, y) => disc(y) - disc(x));
    default: return a;
  }
};

export const PRICE_BANDS = [
  { value: '0-3000', label: 'Under GH₵3,000' },
  { value: '3000-6000', label: 'GH₵3,000 – 6,000' },
  { value: '6000-10000', label: 'GH₵6,000 – 10,000' },
  { value: '10000-20000', label: 'GH₵10,000 – 20,000' },
  { value: '20000-', label: 'Above GH₵20,000' },
];

const gpuDedicated = (g = '') => /rtx|gtx|radeon rx|arc a|quadro|rtx a/i.test(g);

/** Does a laptop suit a given use case? Admin-tagged first, otherwise inferred from specs. */
export const fitsUse = (p, use) => {
  if (p.useCases?.length) return p.useCases.includes(use);
  const ram = parseGb(p.specs?.ram);
  const name = `${p.name} ${p.specs?.processor || ''}`.toLowerCase();
  switch (use) {
    case 'gaming': return gpuDedicated(p.specs?.graphics);
    case 'creative': return ram >= 16 || /macbook pro|xps|zbook|precision/i.test(name);
    case 'coding': return ram >= 16;
    case 'business': return /thinkpad|elitebook|latitude|probook|vostro|surface|macbook/i.test(name);
    case 'student': return p.price <= 8000;
    default: return true;
  }
};
