import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, Boxes } from 'lucide-react';
import { fetchAllProducts, updateProduct, fetchRestockAlerts, deleteRestockAlert, logActivity } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { money, timeAgo } from '../../lib/format';
import { whatsappLink, isValidGhPhone } from '../../lib/ghana';
import { PageHeader, Stat, SearchInput } from '../components/kit';
import { Img, PageLoader, Empty, cx } from '../../components/ui';
import { toast } from '../../store';

export default function Inventory() {
  const { settings, refresh } = useStore();
  const [items, setItems] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(true);
  const th = settings.lowStockThreshold || 3;

  useEffect(() => {
    fetchAllProducts().then(setItems);
    fetchRestockAlerts().then(setAlerts).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const xs = items || [];
    return {
      units: xs.reduce((n, p) => n + (Number(p.stock) || 0), 0),
      value: xs.reduce((n, p) => n + (Number(p.stock) || 0) * (Number(p.costPrice) || Number(p.price) || 0), 0),
      retail: xs.reduce((n, p) => n + (Number(p.stock) || 0) * (Number(p.price) || 0), 0),
      out: xs.filter((p) => p.stock <= 0).length,
      low: xs.filter((p) => p.stock > 0 && p.stock <= th).length,
    };
  }, [items, th]);

  if (!items) return <PageLoader />;
  const list = items
    .filter((p) => (!onlyLow || p.stock <= th) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.stock - b.stock);

  const adjust = async (p, stock) => {
    setItems((xs) => xs.map((x) => (x.id === p.id ? { ...x, stock } : x)));
    try { await updateProduct(p.id, { stock }); await logActivity('Stock adjusted', `${p.name}: ${p.stock} → ${stock}`); refresh(); } catch (e) { toast(e.message, 'error'); }
  };

  const productName = (id) => items.find((p) => p.id === id)?.name || 'Unknown product';

  return (
    <div>
      <PageHeader title="Inventory" sub="Stock levels, stock value and restock requests." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Units in stock" value={stats.units} />
        <Stat label="Stock value (cost)" value={money(stats.value, { compact: true })} sub={`Retail ${money(stats.retail, { compact: true })}`} />
        <Stat label="Low stock" value={stats.low} tone="bg-amber-50 text-amber-700" />
        <Stat label="Out of stock" value={stats.out} tone="bg-rose-50 text-rose-700" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="card">
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} className="flex-1" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="rounded border-slate-300 text-navy-600" /> Low & out only (≤{th})</label>
          </div>
          {list.length === 0 ? <Empty icon={Boxes} title="Nothing to restock" text="All products are above the low-stock level." /> : (
            <ul className="divide-y divide-slate-100">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Img src={p.images?.[0]?.url} w={80} h={80} fit="contain" className="h-10 w-10 rounded-lg ring-1 ring-slate-100" />
                  <Link to={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">{p.name}</Link>
                  <div className="flex items-center rounded-xl ring-1 ring-slate-200">
                    <button onClick={() => adjust(p, Math.max(0, p.stock - 1))} className="h-9 w-9 text-lg">−</button>
                    <span className={cx('w-10 text-center font-bold tabular-nums', p.stock <= 0 ? 'text-rose-600' : p.stock <= th ? 'text-amber-600' : '')}>{p.stock}</span>
                    <button onClick={() => adjust(p, p.stock + 1)} className="h-9 w-9 text-lg">+</button>
                  </div>
                  <button onClick={() => { const v = prompt(`Receive stock for ${p.name}: how many units arrived?`); if (v && Number(v) > 0) adjust(p, p.stock + Number(v)); }} className="btn-outline btn-sm hidden sm:inline-flex">Receive</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="flex items-center gap-2 border-b border-slate-100 p-4 font-bold"><Bell className="h-4 w-4" /> Restock requests ({alerts.length})</h2>
          {alerts.length === 0 ? <p className="p-4 text-sm text-ink-muted">When customers ask to be notified about out-of-stock items, they appear here.</p> : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <li key={a.id} className="p-4 text-sm">
                  <div className="font-semibold">{productName(a.productId)}</div>
                  <div className="text-ink-muted">{a.contact} · {timeAgo(a.createdAt)}</div>
                  <div className="mt-2 flex gap-2">
                    {isValidGhPhone(a.contact) && <a href={whatsappLink(a.contact, `Hello! Good news: ${productName(a.productId)} is back in stock at Gadgets Hub 🎉 ${window.location.origin}/product/${a.productId}`)} target="_blank" rel="noreferrer" className="btn-wa btn-sm">Notify on WhatsApp</a>}
                    <button onClick={async () => { await deleteRestockAlert(a.id); setAlerts((x) => x.filter((y) => y.id !== a.id)); }} className="btn-ghost btn-sm"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
