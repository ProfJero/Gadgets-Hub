import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Check, GitCompareArrows } from 'lucide-react';
import { Img, Price, Stars, ConditionBadge, cx } from './ui';
import { discountPct } from '../lib/format';
import { useCart, useCompare, useUI, toast } from '../store';
import { useAuth, useWishlistIds } from '../context/AuthContext';

export default function ProductCard({ p, compact }) {
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.items.some((i) => i.id === p.id));
  const openCart = useUI((s) => s.openCart);
  const { toggleWishlist } = useAuth();
  const wished = useWishlistIds().includes(p.id);
  const comparing = useCompare((s) => s.ids.includes(p.id));
  const toggleCompare = useCompare((s) => s.toggle);
  const off = discountPct(p.price, p.compareAtPrice);
  const out = !(p.stock > 0);
  const specLine = [p.specs?.processor, p.specs?.ram, p.specs?.storage].filter(Boolean).join(' · ');

  const onAdd = (e) => {
    e.preventDefault();
    add(p);
    toast(`Added to cart`, 'success', { label: 'View cart', onClick: openCart });
  };

  return (
    <Link to={`/product/${p.slug || p.id}`} className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Img src={p.images?.[0]?.url} alt={p.name} w={400} h={400} fit="contain" className="h-full w-full p-3 transition duration-500 group-hover:scale-105" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {off > 0 && <span className="rounded-md bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white">-{off}%</span>}
          {p.condition && p.condition !== 'new' && <ConditionBadge condition={p.condition} />}
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            onClick={(e) => { e.preventDefault(); toggleWishlist(p.id); }}
            className={cx('flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-900/5 backdrop-blur transition hover:scale-110', wished ? 'text-rose-500' : 'text-slate-500')}
            aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={cx('h-4 w-4', wished && 'fill-current')} />
          </button>
          {!compact && p.category === 'laptops' && (
            <button
              onClick={(e) => { e.preventDefault(); toggleCompare(p.id); toast(comparing ? 'Removed from compare' : 'Added to compare', 'info'); }}
              className={cx('hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-900/5 transition hover:scale-110 sm:flex', comparing ? 'text-navy-600' : 'text-slate-500')}
              aria-label="Compare"
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
          )}
        </div>
        {out && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/75 py-1.5 text-center text-xs font-semibold text-white">Out of stock</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 pt-2">
        {p.brand && <div className="text-[11px] font-bold uppercase tracking-wider text-navy-600">{p.brand}</div>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">{p.name}</h3>
        {specLine && !compact && <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{specLine}</p>}
        {p.reviewCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <Stars value={p.rating} size="h-3 w-3" />
            <span className="text-xs text-ink-muted">({p.reviewCount})</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="min-w-0 flex-col !gap-0" />
          {!out && (
            <button
              onClick={onAdd}
              className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition',
                inCart ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-brand-500 text-white hover:bg-brand-600')}
              aria-label="Add to cart"
            >
              {inCart ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
            </button>
          )}
        </div>
        {p.stock > 0 && p.stock <= 3 && <p className="mt-1.5 text-xs font-semibold text-rose-600">Only {p.stock} left</p>}
      </div>
    </Link>
  );
}

export function ProductGrid({ products, className }) {
  return (
    <div className={cx('grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}

export function ProductRail({ products }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
          <ProductCard p={p} compact />
        </div>
      ))}
    </div>
  );
}
