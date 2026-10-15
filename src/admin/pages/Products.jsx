import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Download, Package, Star, Eye, EyeOff, Trash2, Copy } from 'lucide-react';
import { fetchAllProducts, updateProduct, deleteProduct, saveProduct, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { CONDITIONS } from '../../lib/constants';
import { money } from '../../lib/format';
import { PageHeader, SearchInput, downloadCSV } from '../components/kit';
import { Img, Empty, PageLoader, ConditionBadge, cx } from '../../components/ui';
import { toast } from '../../store';

export default function Products() {
  const { categories, refresh, settings } = useStore();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [cond, setCond] = useState('');
  const [state, setState] = useState('');
  const [sel, setSel] = useState([]);

  const load = () => fetchAllProducts().then((x) => setItems(x.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))));
  useEffect(() => { load(); }, []);

  const list = useMemo(() => {
    let r = items || [];
    const t = q.toLowerCase().trim();
    if (t) r = r.filter((p) => `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(t));
    if (cat) r = r.filter((p) => p.category === cat);
    if (cond) r = r.filter((p) => p.condition === cond);
    if (state === 'active') r = r.filter((p) => p.active);
    if (state === 'hidden') r = r.filter((p) => !p.active);
    if (state === 'low') r = r.filter((p) => p.stock <= (settings.lowStockThreshold || 3));
    return r;
  }, [items, q, cat, cond, state, settings.lowStockThreshold]);

  const patch = async (p, data, msg) => {
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, ...data } : x)));
    try { await updateProduct(p.id, data); refresh(); if (msg) toast(msg); } catch (e) { toast(e.message, 'error'); load(); }
  };

  const bulk = async (action) => {
    if (!sel.length) return;
    if (action === 'delete' && !confirm(`Delete ${sel.length} products permanently?`)) return;
    try {
      await Promise.all(sel.map((id) => (action === 'delete' ? deleteProduct(id) : updateProduct(id, { active: action === 'show' }))));
      await logActivity(`Bulk ${action} ${sel.length} products`);
      toast('Done');
      setSel([]);
      load(); refresh();
    } catch (e) { toast(e.message, 'error'); }
  };

  const duplicate = async (p) => {
    const { id, createdAt, updatedAt, rating, reviewCount, soldCount, slug, ...rest } = p; // eslint-disable-line no-unused-vars
    const newId = await saveProduct({ ...rest, name: `${p.name} (copy)`, active: false, sku: '' });
    toast('Duplicated as hidden draft');
    navigate(`/admin/products/${newId}`);
  };

  const exportCsv = () => downloadCSV('products.csv', list.map((p) => ({
    name: p.name, brand: p.brand, category: p.category, condition: p.condition, sku: p.sku, price: p.price, compareAt: p.compareAtPrice, cost: p.costPrice, stock: p.stock, sold: p.soldCount, active: p.active ? 'yes' : 'no',
  })));

  if (!items) return <PageLoader />;
  const allSel = list.length > 0 && list.every((p) => sel.includes(p.id));

  return (
    <div>
      <PageHeader title="Products" sub={`${items.length} products · ${items.filter((p) => p.active).length} live`}
        actions={<><button onClick={exportCsv} className="btn-outline"><Download className="h-4 w-4" /> Export</button><Link to="/admin/products/new" className="btn-primary"><Plus className="h-4 w-4" /> Add product</Link></>} />
      <div className="card">
        <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, brand, SKU…" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="input !py-2"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
          <select value={cond} onChange={(e) => setCond(e.target.value)} className="input !py-2"><option value="">Any condition</option>{CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          <select value={state} onChange={(e) => setState(e.target.value)} className="input !py-2"><option value="">All statuses</option><option value="active">Live</option><option value="hidden">Hidden</option><option value="low">Low stock</option></select>
        </div>
        {sel.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-y border-navy-100 bg-navy-50 px-4 py-2 text-sm">
            <b>{sel.length} selected</b>
            <button onClick={() => bulk('show')} className="btn-outline btn-sm"><Eye className="h-3.5 w-3.5" /> Publish</button>
            <button onClick={() => bulk('hide')} className="btn-outline btn-sm"><EyeOff className="h-3.5 w-3.5" /> Hide</button>
            <button onClick={() => bulk('delete')} className="btn-sm btn bg-rose-600 text-white"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            <button onClick={() => setSel([])} className="ml-auto text-xs font-semibold text-navy-700">Clear</button>
          </div>
        )}
        {list.length === 0 ? <Empty icon={Package} title="No products found" action={<Link to="/admin/products/new" className="btn-primary">Add product</Link>} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : list.map((p) => p.id))} className="rounded border-slate-300 text-navy-600" /></th>
                  <th className="px-2 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Live</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => (
                  <tr key={p.id} className={cx('hover:bg-slate-50', !p.active && 'opacity-60')}>
                    <td className="px-4 py-2"><input type="checkbox" checked={sel.includes(p.id)} onChange={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} className="rounded border-slate-300 text-navy-600" /></td>
                    <td className="px-2 py-2">
                      <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <Img src={p.images?.[0]?.url} w={100} h={100} fit="contain" className="h-12 w-12 shrink-0 rounded-lg bg-white ring-1 ring-slate-100" />
                        <span className="min-w-0">
                          <span className="line-clamp-1 font-semibold hover:underline">{p.name}</span>
                          <span className="flex items-center gap-1.5 text-xs text-ink-muted">{p.brand} · {categories.find((c) => c.slug === p.category)?.name || p.category} <ConditionBadge condition={p.condition} /></span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2"><div className="font-semibold">{money(p.price)}</div>{p.compareAtPrice > p.price && <div className="text-xs text-ink-muted line-through">{money(p.compareAtPrice)}</div>}</td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" defaultValue={p.stock} key={p.stock}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== p.stock) patch(p, { stock: v }, 'Stock updated'); }}
                        className={cx('input w-20 !py-1.5 text-sm', p.stock <= 0 ? 'ring-rose-300' : p.stock <= (settings.lowStockThreshold || 3) ? 'ring-amber-300' : '')} />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => patch(p, { active: !p.active }, p.active ? 'Hidden from store' : 'Now live')} className={cx('relative inline-flex h-6 w-11 rounded-full transition', p.active ? 'bg-emerald-500' : 'bg-slate-300')} aria-label="Toggle live">
                        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', p.active ? 'left-[22px]' : 'left-0.5')} />
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => patch(p, { featured: !p.featured })} aria-label="Toggle featured"><Star className={cx('h-5 w-5', p.featured ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} /></button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => duplicate(p)} className="btn-ghost btn-sm" title="Duplicate"><Copy className="h-4 w-4" /></button>
                      <Link to={`/admin/products/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
