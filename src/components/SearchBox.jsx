import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { searchProducts } from '../lib/search';
import { money } from '../lib/format';
import { usePrefs } from '../store';
import { Img, cx, useDebounced } from './ui';

const POPULAR = ['HP EliteBook', 'MacBook', 'Dell Latitude', 'Lenovo ThinkPad', 'Gaming laptop', 'Laptop bag', 'Charger'];

export default function SearchBox({ autoFocus, onDone, className }) {
  const { products } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const dq = useDebounced(q, 120);
  const recent = usePrefs((s) => s.recentSearches);
  const pushSearch = usePrefs((s) => s.pushSearch);
  const clearSearches = usePrefs((s) => s.clearSearches);
  const wrap = useRef(null);
  const input = useRef(null);

  const results = useMemo(() => (dq.trim() ? searchProducts(products, dq).slice(0, 6) : []), [products, dq]);

  useEffect(() => {
    const h = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  const go = (term) => {
    const t = term.trim();
    if (!t) return;
    pushSearch(t);
    setOpen(false);
    input.current?.blur();
    navigate(`/shop?q=${encodeURIComponent(t)}`);
    onDone?.();
  };

  const goProduct = (p) => {
    pushSearch(q.trim() || p.name);
    setOpen(false);
    navigate(`/product/${p.slug || p.id}`);
    onDone?.();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); active >= 0 && results[active] ? goProduct(results[active]) : go(q); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrap} className={cx('relative w-full', className)}>
      <form onSubmit={(e) => { e.preventDefault(); go(q); }} role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder="Search laptops, brands, accessories…"
            className="h-12 w-full rounded-xl border-0 bg-slate-100 pl-11 pr-24 text-[15px] text-ink placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-navy-500"
            aria-label="Search products"
            autoComplete="off"
            enterKeyHint="search"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label="Clear">
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-brand-500 px-3.5 text-sm font-semibold text-white hover:bg-brand-600">
            Search
          </button>
        </div>
      </form>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-slate-900/5">
          {dq.trim() ? (
            results.length ? (
              <ul className="max-h-[60vh] overflow-y-auto py-2">
                {results.map((p, i) => (
                  <li key={p.id}>
                    <button onClick={() => goProduct(p)} onMouseEnter={() => setActive(i)} className={cx('flex w-full items-center gap-3 px-4 py-2 text-left', active === i && 'bg-slate-50')}>
                      <Img src={p.images?.[0]?.url} w={80} h={80} fit="contain" className="h-12 w-12 shrink-0 rounded-lg bg-white ring-1 ring-slate-100" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-ink-muted">{p.brand}</span>
                      </span>
                      <span className="text-sm font-bold">{money(p.price)}</span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-slate-100 px-4 pt-2">
                  <button onClick={() => go(q)} className="link text-sm">See all results for “{q}”</button>
                </li>
              </ul>
            ) : (
              <div className="p-5 text-sm text-ink-muted">No matches for “{dq}”. Try a brand like <b>HP</b> or a spec like <b>16GB</b>.</div>
            )
          ) : (
            <div className="p-4">
              {recent.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Recent <button onClick={clearSearches} className="normal-case tracking-normal text-navy-600">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} onClick={() => go(r)} className="chip-off"><Clock className="h-3.5 w-3.5" />{r}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Popular</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((r) => (
                  <button key={r} onClick={() => go(r)} className="chip-off"><TrendingUp className="h-3.5 w-3.5" />{r}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
