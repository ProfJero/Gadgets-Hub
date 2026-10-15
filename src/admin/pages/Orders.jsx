import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ShoppingBag } from 'lucide-react';
import { subscribeRecentOrders } from '../../lib/api';
import { ORDER_STATUSES, statusOf, PAYMENT_STATUSES, PAYMENT_METHODS } from '../../lib/constants';
import { money, dateTime, timeAgo } from '../../lib/format';
import { formatPhone } from '../../lib/ghana';
import { PageHeader, SearchInput, downloadCSV } from '../components/kit';
import { Badge, Tabs, Empty, PageLoader } from '../../components/ui';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('');
  const status = sp.get('status') || 'all';
  const navigate = useNavigate();

  useEffect(() => subscribeRecentOrders(setOrders, 1000), []);

  const counts = useMemo(() => {
    const c = { all: orders?.length || 0 };
    orders?.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const list = useMemo(() => {
    let r = orders || [];
    if (status !== 'all') r = r.filter((o) => o.status === status);
    if (pay) r = r.filter((o) => o.payment?.status === pay);
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((o) => [o.id, o.customer?.name, o.customer?.phone, o.customer?.email, o.delivery?.city].join(' ').toLowerCase().includes(t));
    return r;
  }, [orders, status, pay, q]);

  const exportCsv = () => downloadCSV(`orders-${new Date().toISOString().slice(0, 10)}.csv`, list.map((o) => ({
    order: o.id, date: dateTime(o.createdAt), customer: o.customer?.name, phone: o.customer?.phone, email: o.customer?.email,
    region: o.delivery?.region || 'Pickup', city: o.delivery?.city || '', items: o.items?.map((i) => `${i.qty}x ${i.name}`).join('; '),
    subtotal: o.subtotal, discount: o.discount, delivery: o.deliveryFee, total: o.total,
    payment: PAYMENT_METHODS[o.payment?.method]?.label, paymentStatus: o.payment?.status, reference: o.payment?.reference || o.payment?.customerReference || '', status: o.status,
  })));

  if (!orders) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Orders" sub={`${orders.length} orders`} actions={<button onClick={exportCsv} className="btn-outline"><Download className="h-4 w-4" /> Export CSV</button>} />
      <div className="card">
        <Tabs className="px-2" value={status} onChange={(v) => setSp(v === 'all' ? {} : { status: v })}
          tabs={[{ value: 'all', label: 'All', count: counts.all }, ...ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] || 0 }))]} />
        <div className="flex flex-col gap-2 p-3 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search order #, name, phone…" className="flex-1" />
          <select value={pay} onChange={(e) => setPay(e.target.value)} className="input !py-2 sm:w-48">
            <option value="">Any payment</option>
            {Object.entries(PAYMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {list.length === 0 ? <Empty icon={ShoppingBag} title="No orders here" /> : (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead className="border-y border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((o) => {
                  const st = statusOf(o.status);
                  const ps = PAYMENT_STATUSES[o.payment?.status] || PAYMENT_STATUSES.pending;
                  return (
                    <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                      <td className="px-4 py-3"><Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-navy-700" onClick={(e) => e.stopPropagation()}>{o.id}</Link><div className="text-xs text-ink-muted">{timeAgo(o.createdAt)}</div></td>
                      <td className="px-4 py-3"><div className="font-semibold">{o.customer?.name}</div><div className="text-xs text-ink-muted">{formatPhone(o.customer?.phone)}</div></td>
                      <td className="px-4 py-3 text-ink-soft">{o.delivery?.method === 'pickup' ? 'Store pickup' : `${o.delivery?.city}, ${o.delivery?.region}`}</td>
                      <td className="px-4 py-3"><div className="text-xs text-ink-muted">{PAYMENT_METHODS[o.payment?.method]?.label}</div><Badge tone={ps.tone}>{ps.label}</Badge>{o.payment?.customerReference && o.payment.status === 'pending' && <Badge tone="bg-sky-50 text-sky-700 ring-sky-200" className="ml-1">Ref sent</Badge>}</td>
                      <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="px-4 py-3 text-right font-bold">{money(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="divide-y divide-slate-100 md:hidden">
              {list.map((o) => {
                const st = statusOf(o.status);
                const ps = PAYMENT_STATUSES[o.payment?.status] || PAYMENT_STATUSES.pending;
                return (
                  <li key={o.id}>
                    <Link to={`/admin/orders/${o.id}`} className="block p-4">
                      <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold">{o.id}</span><span className="font-bold">{money(o.total)}</span></div>
                      <div className="mt-1 text-sm">{o.customer?.name} · <span className="text-ink-muted">{o.delivery?.method === 'pickup' ? 'Pickup' : o.delivery?.region}</span></div>
                      <div className="mt-2 flex items-center gap-1.5"><Badge tone={st.tone}>{st.label}</Badge><Badge tone={ps.tone}>{ps.label}</Badge><span className="ml-auto text-xs text-ink-muted">{timeAgo(o.createdAt)}</span></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
