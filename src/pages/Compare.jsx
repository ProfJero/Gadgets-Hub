import { Link } from 'react-router-dom';
import { GitCompareArrows, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart, useCompare, toast } from '../store';
import { SPEC_FIELDS, conditionOf } from '../lib/constants';
import { money } from '../lib/format';
import { Img, Stars, Empty } from '../components/ui';

export default function Compare() {
  const { ids, toggle, clear } = useCompare();
  const { byId } = useStore();
  const add = useCart((s) => s.add);
  const items = ids.map((id) => byId[id]).filter(Boolean);

  if (!items.length) {
    return <div className="container-x"><Empty icon={GitCompareArrows} title="Compare laptops side by side" text="Tap the compare icon on up to 4 laptops to see their specs next to each other." action={<Link to="/category/laptops" className="btn-primary">Browse laptops</Link>} /></div>;
  }
  const rows = [
    { label: 'Price', render: (p) => <b>{money(p.price)}</b> },
    { label: 'Condition', render: (p) => conditionOf(p.condition).label },
    { label: 'Rating', render: (p) => (p.reviewCount ? <Stars value={p.rating} /> : '—') },
    ...SPEC_FIELDS.map((f) => ({ label: f.label, render: (p) => p.specs?.[f.key] || '—' })),
    { label: 'Warranty', render: (p) => p.warranty || '—' },
    { label: 'Availability', render: (p) => (p.stock > 0 ? <span className="text-emerald-700">In stock</span> : <span className="text-rose-600">Out of stock</span>) },
  ];
  return (
    <div className="container-x py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Compare ({items.length})</h1>
        <button onClick={clear} className="btn-ghost text-rose-600">Clear all</button>
      </div>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              <th className="w-36 p-4" />
              {items.map((p) => (
                <th key={p.id} className="p-4 text-left align-top font-normal">
                  <div className="relative">
                    <button onClick={() => toggle(p.id)} className="absolute -right-2 -top-2 rounded-full bg-slate-100 p-1" aria-label="Remove"><X className="h-4 w-4" /></button>
                    <Link to={`/product/${p.slug}`}><Img src={p.images?.[0]?.url} w={240} h={240} fit="contain" className="mx-auto aspect-square w-32" /></Link>
                    <Link to={`/product/${p.slug}`} className="mt-2 line-clamp-2 font-semibold">{p.name}</Link>
                    {p.stock > 0 && <button onClick={() => { add(p); toast('Added to cart'); }} className="btn-primary btn-sm mt-2 w-full">Add to cart</button>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.label} className="even:bg-slate-50/50">
                <th className="p-4 text-left font-medium text-ink-muted">{r.label}</th>
                {items.map((p) => <td key={p.id} className="p-4 align-top">{r.render(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
