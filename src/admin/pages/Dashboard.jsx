import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Wallet, ShoppingBag, Clock, AlertTriangle, TrendingUp, Package, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { subscribeRecentOrders, fetchAllProducts, logActivity } from '../../lib/api';
import { seedCatalogue } from '../../lib/seed';
import { money, timeAgo, toDate } from '../../lib/format';
import { statusOf, PAYMENT_STATUSES } from '../../lib/constants';
import { PageHeader, Stat } from '../components/kit';
import { Badge, Img, Spinner, cx } from '../../components/ui';
import { toast } from '../../store';

const counts = (o) => o.status !== 'cancelled';
const isPaid = (o) => o.payment?.status === 'paid';

export default function Dashboard() {
  const { can, profile } = useAuth();
  const { settings, refresh } = useStore();
  const [orders, setOrders] = useState(null);
  const [products, setProducts] = useState(null);
  const [range, setRange] = useState(30);
  const [seeding, setSeeding] = useState(false);
  const seeOrders = can('orders') || can('reports');

  useEffect(() => (seeOrders ? subscribeRecentOrders(setOrders, 1000) : undefined), [seeOrders]);
  useEffect(() => { if (can('products')) fetchAllProducts().then(setProducts).catch(() => setProducts([])); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMemo(() => {
    if (!orders) return null;
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const valid = orders.filter(counts);
    const sum = (list) => list.reduce((n, o) => n + (o.total || 0), 0);
    const since = (d) => valid.filter((o) => (toDate(o.createdAt) || now) >= d);
    const paidAll = valid.filter(isPaid);

    const days = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(startToday); d.setDate(d.getDate() - i);
      days.push({ key: d.toDateString(), label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), sales: 0, orders: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    valid.forEach((o) => {
      const d = toDate(o.createdAt);
      if (!d) return;
      const i = idx[new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()];
      if (i != null) { days[i].sales += o.total || 0; days[i].orders += 1; }
    });

    const top = {};
    valid.forEach((o) => o.items?.forEach((i) => {
      top[i.productId] = top[i.productId] || { name: i.name, image: i.image, qty: 0, revenue: 0 };
      top[i.productId].qty += i.qty;
      top[i.productId].revenue += i.qty * i.price;
    }));

    const byPay = {};
    valid.forEach((o) => { const k = o.payment?.method || 'other'; byPay[k] = (byPay[k] || 0) + 1; });
    const byRegion = {};
    valid.forEach((o) => { const k = o.delivery?.method === 'pickup' ? 'Store pickup' : o.delivery?.region || 'Unknown'; byRegion[k] = (byRegion[k] || 0) + (o.total || 0); });

    return {
      today: sum(since(startToday)),
      todayCount: since(startToday).length,
      month: sum(since(startMonth)),
      monthCount: since(startMonth).length,
      collected: sum(paidAll.filter((o) => (toDate(o.createdAt) || now) >= startMonth)),
      pending: orders.filter((o) => o.status === 'pending').length,
      toShip: orders.filter((o) => ['confirmed', 'processing'].includes(o.status)).length,
      aov: valid.length ? sum(valid) / valid.length : 0,
      days,
      top: Object.values(top).sort((a, b) => b.qty - a.qty).slice(0, 5),
      byPay,
      byRegion: Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 6),
      recent: orders.slice(0, 8),
    };
  }, [orders, range]);

  const lowStock = (products || []).filter((p) => p.active && p.stock <= (settings.lowStockThreshold || 3));

  const seed = async () => {
    if (!confirm('Load a demo catalogue (8 categories, 18 products)? You can edit or delete them later.')) return;
    setSeeding(true);
    try {
      await seedCatalogue();
      await logActivity('Loaded demo catalogue');
      setProducts(await fetchAllProducts());
      refresh();
      toast('Demo catalogue loaded');
    } catch (e) { toast(e.message, 'error'); } finally { setSeeding(false); }
  };

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <PageHeader title={`${greet}, ${(profile?.name || '').split(' ')[0]} 👋`} sub="Here's what's happening in your store." actions={can('products') && <Link to="/admin/products/new" className="btn-primary">+ Add product</Link>} />

      {can('products') && products && products.length === 0 && (
        <div className="card mb-6 flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-navy-700 to-navy-900 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-brand-300" /> Your store is empty</h2>
            <p className="mt-1 text-sm text-slate-300">Add your first product, or load a demo catalogue to see how everything works.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={seed} disabled={seeding} className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">{seeding ? <Spinner /> : 'Load demo catalogue'}</button>
            <Link to="/admin/products/new" className="btn-primary">Add product</Link>
          </div>
        </div>
      )}

      {seeOrders && !m && <div className="py-10 text-center text-ink-muted"><Spinner className="mx-auto h-6 w-6" /></div>}

      {m && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Stat label="Today" value={money(m.today, { compact: true })} sub={`${m.todayCount} orders`} icon={TrendingUp} tone="bg-emerald-50 text-emerald-700" />
            <Stat label="This month" value={money(m.month, { compact: true })} sub={`${m.monthCount} orders · ${money(m.collected, { compact: true })} collected`} icon={Wallet} tone="bg-brand-50 text-brand-700" />
            <Link to="/admin/orders?status=pending"><Stat label="Needs action" value={m.pending} sub={`${m.toShip} ready to ship`} icon={Clock} tone="bg-amber-50 text-amber-700" /></Link>
            <Stat label="Avg. order" value={money(m.aov, { compact: true })} sub="Excluding cancelled" icon={ShoppingBag} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="card p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">Sales</h2>
                <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  {[7, 30, 90].map((d) => <button key={d} onClick={() => setRange(d)} className={cx('rounded-md px-2.5 py-1', range === d ? 'bg-white shadow-sm' : 'text-ink-muted')}>{d}d</button>)}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={m.days} margin={{ left: 0, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F28A1E" stopOpacity={0.35} /><stop offset="100%" stopColor="#F28A1E" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef2f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7A8087' }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#7A8087' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip formatter={(v, n) => (n === 'sales' ? money(v) : v)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="sales" stroke="#D96F0E" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-bold">Top sellers</h2>
              {m.top.length === 0 ? <p className="text-sm text-ink-muted">No sales yet.</p> : (
                <ul className="space-y-3">
                  {m.top.map((t, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Img src={t.image} w={80} h={80} fit="contain" className="h-10 w-10 rounded-lg ring-1 ring-slate-100" />
                      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{t.name}</div><div className="text-xs text-ink-muted">{t.qty} sold</div></div>
                      <div className="text-sm font-bold">{money(t.revenue, { compact: true })}</div>
                    </li>
                  ))}
                </ul>
              )}
              <h2 className="mb-2 mt-6 font-bold">Sales by region</h2>
              <ul className="space-y-2 text-sm">
                {m.byRegion.map(([r, v]) => {
                  const max = m.byRegion[0][1] || 1;
                  return (
                    <li key={r}>
                      <div className="flex justify-between"><span>{r}</span><span className="font-semibold">{money(v, { compact: true })}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-navy-500" style={{ width: `${(v / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="font-bold">Recent orders</h2><Link to="/admin/orders" className="link flex items-center gap-1 text-sm">All orders <ArrowRight className="h-4 w-4" /></Link></div>
              {m.recent.length === 0 ? <p className="p-5 text-sm text-ink-muted">No orders yet. Share your store link on WhatsApp & Instagram to get the first one!</p> : (
                <ul className="divide-y divide-slate-100">
                  {m.recent.map((o) => {
                    const st = statusOf(o.status);
                    const ps = PAYMENT_STATUSES[o.payment?.status] || PAYMENT_STATUSES.pending;
                    return (
                      <li key={o.id}>
                        <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{o.customer?.name} <span className="font-mono text-xs font-normal text-ink-muted">{o.id}</span></div>
                            <div className="text-xs text-ink-muted">{timeAgo(o.createdAt)} · {o.delivery?.method === 'pickup' ? 'Pickup' : o.delivery?.region}</div>
                          </div>
                          <div className="hidden gap-1 sm:flex"><Badge tone={ps.tone}>{ps.label}</Badge><Badge tone={st.tone}>{st.label}</Badge></div>
                          <div className="text-sm font-bold">{money(o.total)}</div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {can('products') && (
              <div className="card">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</h2>
                  <Link to="/admin/inventory" className="link text-sm">Manage</Link>
                </div>
                {lowStock.length === 0 ? <p className="p-5 text-sm text-ink-muted">All products are well stocked 👍</p> : (
                  <ul className="divide-y divide-slate-100">
                    {lowStock.slice(0, 8).map((p) => (
                      <li key={p.id}>
                        <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                          <Package className="h-4 w-4 text-ink-muted" />
                          <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                          <span className={cx('rounded-md px-2 py-0.5 text-xs font-bold', p.stock <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{p.stock <= 0 ? 'Out' : `${p.stock} left`}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!seeOrders && (
        <div className="card p-6 text-sm text-ink-muted">Welcome! Use the menu to get to the sections you have access to.</div>
      )}
    </div>
  );
}
