import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Flame } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import CategoryIcon from '../components/CategoryIcon';
import { Img } from '../components/ui';

export default function Categories() {
  const { categories, products, brands } = useStore();
  const count = (slug) => products.filter((p) => p.category === slug).length;
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-3xl font-bold">Categories</h1>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/deals" className="flex items-center gap-3 rounded-2xl bg-brand-500 p-4 font-bold text-white"><Flame className="h-6 w-6" /> Hot deals</Link>
        <Link to="/finder" className="flex items-center gap-3 rounded-2xl bg-navy-700 p-4 font-bold text-white"><Sparkles className="h-6 w-6" /> Laptop finder</Link>
      </div>
      <ul className="card mt-4 divide-y divide-slate-100">
        {categories.filter((c) => !c.hidden).map((c) => (
          <li key={c.id}>
            <Link to={`/category/${c.slug}`} className="flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-navy-50 text-navy-700">
                {c.image ? <Img src={c.image} w={100} h={100} className="h-full w-full" /> : <CategoryIcon slug={c.slug} />}
              </span>
              <span className="flex-1"><span className="block font-semibold">{c.name}</span><span className="text-xs text-ink-muted">{count(c.slug)} items</span></span>
              <ChevronRight className="h-5 w-5 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
      {brands.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold">Brands</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {brands.map((b) => <Link key={b} to={`/brand/${encodeURIComponent(b)}`} className="chip-off">{b}</Link>)}
          </div>
        </>
      )}
    </div>
  );
}
