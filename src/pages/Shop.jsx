import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, SearchX } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { searchProducts, sortProducts, SORTS, PRICE_BANDS, parseGb, cpuFamily, fitsUse } from '../lib/search';
import { CONDITIONS, USE_CASES } from '../lib/constants';
import { ProductGrid } from '../components/ProductCard';
import { Modal, ProductCardSkeleton, Empty, cx } from '../components/ui';

const PAGE = 24;
const list = (v) => (v ? v.split(',').filter(Boolean) : []);
const RAM_OPTS = [4, 8, 16, 32];
const STORAGE_OPTS = [128, 256, 512, 1024];

function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 py-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-bold">
        {title}<ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Check({ checked, onChange, label, count }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-[18px] w-[18px] rounded border-slate-300 text-navy-600 focus:ring-navy-500" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-ink-muted">{count}</span>}
    </label>
  );
}

export default function Shop({ deals }) {
  const { slug, brand: brandParam } = useParams();
  const [sp, setSp] = useSearchParams();
  const { products, categories, loading } = useStore();
  const [sheet, setSheet] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const q = sp.get('q') || '';
  const sort = sp.get('sort') || (q ? 'relevance' : deals ? 'discount' : 'popular');
  const f = {
    brand: list(sp.get('brand')).concat(brandParam ? [decodeURIComponent(brandParam)] : []),
    cond: list(sp.get('cond')),
    price: sp.get('price') || '',
    ram: list(sp.get('ram')).map(Number),
    storage: list(sp.get('storage')).map(Number),
    cpu: list(sp.get('cpu')),
    use: sp.get('use') || '',
    instock: sp.get('instock') === '1',
    cat: slug || sp.get('cat') || '',
  };

  const category = categories.find((c) => c.slug === f.cat);
  const isLaptopContext = !f.cat || f.cat === 'laptops';

  useEffect(() => { setShown(PAGE); }, [sp, slug, brandParam]);

  const set = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value === '' || value == null || (Array.isArray(value) && !value.length) || value === false) next.delete(key);
    else next.set(key, Array.isArray(value) ? value.join(',') : value === true ? '1' : value);
    setSp(next, { replace: true });
  };
  const toggleIn = (key, arr, v) => set(key, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const clearAll = () => setSp(q ? { q } : {}, { replace: true });

  // Base set: search + category scope (facet counts are computed on this).
  const base = useMemo(() => {
    let r = q ? searchProducts(products, q) : products;
    if (f.cat === 'accessories') r = r.filter((p) => p.category !== 'laptops');
    else if (f.cat) r = r.filter((p) => p.category === f.cat);
    if (deals) r = r.filter((p) => p.compareAtPrice > p.price);
    return r;
  }, [products, q, f.cat, deals]);

  const results = useMemo(() => {
    let r = base;
    if (f.brand.length) r = r.filter((p) => f.brand.some((b) => b.toLowerCase() === (p.brand || '').toLowerCase()));
    if (f.cond.length) r = r.filter((p) => f.cond.includes(p.condition));
    if (f.price) {
      const [min, max] = f.price.split('-').map((x) => (x ? Number(x) : null));
      r = r.filter((p) => (min == null || p.price >= min) && (max == null || p.price <= max));
    }
    if (f.ram.length) r = r.filter((p) => f.ram.includes(parseGb(p.specs?.ram)));
    if (f.storage.length) r = r.filter((p) => f.storage.some((s) => Math.abs(parseGb(p.specs?.storage) - s) < s * 0.1));
    if (f.cpu.length) r = r.filter((p) => f.cpu.includes(cpuFamily(p.specs?.processor)));
    if (f.use) r = r.filter((p) => p.category === 'laptops' && fitsUse(p, f.use));
    if (f.instock) r = r.filter((p) => p.stock > 0);
    const sorted = sortProducts(r, sort === 'relevance' && !q ? 'popular' : sort);
    // Keep out-of-stock items at the end.
    return [...sorted.filter((p) => p.stock > 0), ...sorted.filter((p) => !(p.stock > 0))];
  }, [base, sp, sort, brandParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const facets = useMemo(() => {
    const count = (fn) => base.reduce((m, p) => { const k = fn(p); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
    return {
      brand: count((p) => p.brand),
      cond: count((p) => p.condition),
      cpu: count((p) => cpuFamily(p.specs?.processor)),
      ram: count((p) => parseGb(p.specs?.ram) || null),
    };
  }, [base]);

  const activeCount = f.brand.length + f.cond.length + (f.price ? 1 : 0) + f.ram.length + f.storage.length + f.cpu.length + (f.use ? 1 : 0) + (f.instock ? 1 : 0) - (brandParam ? 1 : 0);

  const title = q ? `Results for “${q}”` : deals ? 'Hot deals' : category ? category.name : brandParam ? decodeURIComponent(brandParam) : f.cat === 'accessories' ? 'Accessories' : f.use ? USE_CASES.find((u) => u.key === f.use)?.label + ' laptops' : 'All products';

  const filters = (
    <div>
      {!slug && !q && (
        <Group title="Category">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => set('cat', '')} className={!f.cat ? 'chip-on' : 'chip-off'}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => set('cat', c.slug)} className={f.cat === c.slug ? 'chip-on' : 'chip-off'}>{c.name}</button>)}
          </div>
        </Group>
      )}
      <Group title="Price">
        <div className="space-y-0.5">
          {PRICE_BANDS.map((b) => (
            <label key={b.value} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
              <input type="radio" name="price" checked={f.price === b.value} onChange={() => set('price', b.value)} className="h-[18px] w-[18px] border-slate-300 text-navy-600 focus:ring-navy-500" />
              {b.label}
            </label>
          ))}
          {f.price && <button onClick={() => set('price', '')} className="link text-xs">Any price</button>}
        </div>
      </Group>
      <Group title="Condition">
        {CONDITIONS.map((c) => <Check key={c.value} label={c.label} count={facets.cond[c.value] || 0} checked={f.cond.includes(c.value)} onChange={() => toggleIn('cond', f.cond, c.value)} />)}
      </Group>
      {!brandParam && Object.keys(facets.brand).length > 0 && (
        <Group title="Brand">
          {Object.entries(facets.brand).sort((a, b) => b[1] - a[1]).map(([b, n]) => (
            <Check key={b} label={b} count={n} checked={f.brand.includes(b)} onChange={() => toggleIn('brand', f.brand, b)} />
          ))}
        </Group>
      )}
      {isLaptopContext && (
        <>
          <Group title="Use">
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((u) => <button key={u.key} onClick={() => set('use', f.use === u.key ? '' : u.key)} className={f.use === u.key ? 'chip-on' : 'chip-off'}>{u.emoji} {u.label}</button>)}
            </div>
          </Group>
          <Group title="RAM">
            <div className="flex flex-wrap gap-2">
              {RAM_OPTS.map((r) => <button key={r} onClick={() => toggleIn('ram', f.ram, r)} className={f.ram.includes(r) ? 'chip-on' : 'chip-off'}>{r}GB</button>)}
            </div>
          </Group>
          <Group title="Storage (SSD)">
            <div className="flex flex-wrap gap-2">
              {STORAGE_OPTS.map((r) => <button key={r} onClick={() => toggleIn('storage', f.storage, r)} className={f.storage.includes(r) ? 'chip-on' : 'chip-off'}>{r >= 1024 ? '1TB' : `${r}GB`}</button>)}
            </div>
          </Group>
          {Object.keys(facets.cpu).length > 0 && (
            <Group title="Processor" defaultOpen={false}>
              {Object.entries(facets.cpu).sort().map(([c, n]) => <Check key={c} label={c} count={n} checked={f.cpu.includes(c)} onChange={() => toggleIn('cpu', f.cpu, c)} />)}
            </Group>
          )}
        </>
      )}
      <div className="py-4">
        <Check label="In stock only" checked={f.instock} onChange={() => set('instock', !f.instock)} />
      </div>
    </div>
  );

  const chips = [
    ...f.brand.filter((b) => b !== brandParam).map((b) => ({ k: 'brand', v: b, label: b })),
    ...f.cond.map((c) => ({ k: 'cond', v: c, label: CONDITIONS.find((x) => x.value === c)?.short })),
    ...(f.price ? [{ k: 'price', v: f.price, label: PRICE_BANDS.find((b) => b.value === f.price)?.label || f.price }] : []),
    ...f.ram.map((r) => ({ k: 'ram', v: r, label: `${r}GB RAM` })),
    ...f.storage.map((r) => ({ k: 'storage', v: r, label: `${r >= 1024 ? '1TB' : r + 'GB'} SSD` })),
    ...f.cpu.map((c) => ({ k: 'cpu', v: c, label: c })),
    ...(f.use ? [{ k: 'use', v: f.use, label: USE_CASES.find((u) => u.key === f.use)?.label }] : []),
    ...(f.instock ? [{ k: 'instock', v: true, label: 'In stock' }] : []),
  ];
  const removeChip = (c) => {
    if (['price', 'use', 'instock'].includes(c.k)) set(c.k, '');
    else toggleIn(c.k, f[c.k], c.v);
  };

  return (
    <div className="container-x py-4 sm:py-6">
      <nav className="mb-2 text-xs text-ink-muted"><Link to="/" className="hover:text-ink">Home</Link> / <span className="text-ink">{title}</span></nav>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {category?.description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{category.description}</p>}
        </div>
        <span className="text-sm text-ink-muted">{loading ? 'Loading…' : `${results.length} item${results.length === 1 ? '' : 's'}`}</span>
      </div>

      {/* Mobile toolbar */}
      <div className="sticky top-16 z-30 -mx-4 mt-3 flex gap-2 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur lg:hidden">
        <button onClick={() => setSheet(true)} className="btn-outline flex-1">
          <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-navy-700 px-1.5 text-xs text-white">{activeCount}</span>}
        </button>
        <select value={sort} onChange={(e) => set('sort', e.target.value)} className="input flex-1 !py-2 text-sm font-semibold">
          {SORTS.filter((s) => s.value !== 'relevance' || q).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="mt-4 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
            <div className="flex items-center justify-between pb-1">
              <h2 className="font-bold">Filters</h2>
              {activeCount > 0 && <button onClick={clearAll} className="link text-xs">Clear all</button>}
            </div>
            {filters}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 hidden items-center justify-between gap-4 lg:flex">
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={`${c.k}-${c.v}`} onClick={() => removeChip(c)} className="chip bg-navy-50 text-navy-800 ring-navy-200">{c.label} <X className="h-3.5 w-3.5" /></button>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <span className="text-ink-muted">Sort by</span>
              <select value={sort} onChange={(e) => set('sort', e.target.value)} className="input w-auto !py-2 text-sm font-semibold">
                {SORTS.filter((s) => s.value !== 'relevance' || q).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          {chips.length > 0 && (
            <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
              {chips.map((c) => (
                <button key={`${c.k}-${c.v}`} onClick={() => removeChip(c)} className="chip bg-navy-50 text-navy-800 ring-navy-200">{c.label} <X className="h-3.5 w-3.5" /></button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : results.length === 0 ? (
            <Empty icon={SearchX} title="No products match" text={q ? 'Check the spelling, or try a broader term like “HP” or “16GB”.' : 'Try removing some filters.'}
              action={<button onClick={clearAll} className="btn-primary">Clear filters</button>} />
          ) : (
            <>
              <ProductGrid products={results.slice(0, shown)} className="xl:!grid-cols-4" />
              {shown < results.length && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <p className="text-sm text-ink-muted">Showing {shown} of {results.length}</p>
                  <button onClick={() => setShown((n) => n + PAGE)} className="btn-outline btn-lg">Load more</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="Filters"
        footer={<>
          <button onClick={clearAll} className="btn-ghost">Clear all</button>
          <button onClick={() => setSheet(false)} className="btn-primary flex-1">Show {results.length} results</button>
        </>}>
        {filters}
      </Modal>
    </div>
  );
}
