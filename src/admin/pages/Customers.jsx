import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Download, Phone, Ban } from 'lucide-react';
import { fetchUsers, fetchOrders, updateUser, logActivity } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { money, dateShort, timeAgo } from '../../lib/format';
import { formatPhone, normalizePhone, whatsappLink } from '../../lib/ghana';
import { statusOf } from '../../lib/constants';
import { PageHeader, SearchInput, Stat, downloadCSV } from '../components/kit';
import { WhatsAppIcon } from '../../components/WhatsAppFab';
import { Badge, Modal, PageLoader, Empty, Tabs } from '../../components/ui';
import { toast } from '../../store';

export default function Customers() {
  const { can } = useAuth();
  const [users, setUsers] = useState(null);
  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [view, setView] = useState(null);

  useEffect(() => {
    fetchUsers().then(setUsers).catch((e) => { toast(e.message, 'error'); setUsers([]); });
    if (can('orders') || can('reports')) fetchOrders().then(setOrders).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge registered accounts with guest buyers (grouped by phone number).
  const people = useMemo(() => {
    if (!users) return [];
    const map = new Map();
    users.filter((u) => u.role === 'customer').forEach((u) => {
      map.set(u.id, { key: u.id, uid: u.id, name: u.name, email: u.email, phone: normalizePhone(u.phone || ''), joined: u.createdAt, disabled: u.disabled, registered: true, orders: [] });
    });
    const byPhone = new Map([...map.values()].filter((p) => p.phone).map((p) => [p.phone, p]));
    orders.forEach((o) => {
      const phone = normalizePhone(o.customer?.phone || '');
      let p = (o.userId && map.get(o.userId)) || byPhone.get(phone);
      if (!p) {
        p = { key: `guest-${phone}`, name: o.customer?.name, email: o.customer?.email, phone, joined: o.createdAt, registered: false, orders: [] };
        map.set(p.key, p);
        byPhone.set(phone, p);
      }
      p.orders.push(o);
    });
    return [...map.values()].map((p) => {
      const valid = p.orders.filter((o) => o.status !== 'cancelled');
      return { ...p, spent: valid.reduce((n, o) => n + (o.total || 0), 0), count: valid.length, last: p.orders[0]?.createdAt };
    }).sort((a, b) => b.spent - a.spent || (b.joined?.seconds || 0) - (a.joined?.seconds || 0));
  }, [users, orders]);

  const list = people.filter((p) => {
    if (tab === 'registered' && !p.registered) return false;
    if (tab === 'guests' && p.registered) return false;
    if (tab === 'repeat' && p.count < 2) return false;
    const t = q.toLowerCase().trim();
    return !t || `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(t);
  });

  if (!users) return <PageLoader />;

  const toggleBlock = async (p) => {
    try {
      await updateUser(p.uid, { disabled: !p.disabled });
      await logActivity(`${p.disabled ? 'Unblocked' : 'Blocked'} customer`, p.email);
      setUsers((xs) => xs.map((u) => (u.id === p.uid ? { ...u, disabled: !p.disabled } : u)));
      setView(null);
      toast('Updated');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader title="Customers" sub="Registered accounts and guest buyers, ranked by lifetime spend."
        actions={<button onClick={() => downloadCSV('customers.csv', list.map((p) => ({ name: p.name, phone: p.phone, email: p.email, registered: p.registered ? 'yes' : 'no', orders: p.count, spent: p.spent, lastOrder: dateShort(p.last) })))} className="btn-outline"><Download className="h-4 w-4" /> Export</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={people.length} />
        <Stat label="Registered" value={people.filter((p) => p.registered).length} />
        <Stat label="Repeat buyers" value={people.filter((p) => p.count >= 2).length} />
        <Stat label="Avg. lifetime value" value={money(people.length ? people.reduce((n, p) => n + p.spent, 0) / Math.max(1, people.filter((p) => p.count).length) : 0, { compact: true })} />
      </div>
      <div className="card">
        <Tabs className="px-2" value={tab} onChange={setTab} tabs={[{ value: 'all', label: 'All' }, { value: 'registered', label: 'Registered' }, { value: 'guests', label: 'Guests' }, { value: 'repeat', label: 'Repeat buyers' }]} />
        <div className="p-3"><SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email…" /></div>
        {list.length === 0 ? <Empty icon={Users} title="No customers yet" /> : (
          <ul className="divide-y divide-slate-100">
            {list.map((p) => (
              <li key={p.key}>
                <button onClick={() => setView(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 font-bold text-navy-700">{(p.name || '?')[0]?.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold">{p.name || '—'} {!p.registered && <Badge>Guest</Badge>} {p.disabled && <Badge tone="bg-rose-50 text-rose-700 ring-rose-200">Blocked</Badge>}</div>
                    <div className="truncate text-xs text-ink-muted">{formatPhone(p.phone)} {p.email && `· ${p.email}`}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-bold">{money(p.spent, { compact: true })}</div>
                    <div className="text-xs text-ink-muted">{p.count} orders</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.name || 'Customer'} size="lg">
        {view && (
          <div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-ink-muted">Lifetime spend</div><div className="text-lg font-extrabold">{money(view.spent)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-ink-muted">Orders</div><div className="text-lg font-extrabold">{view.count}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-ink-muted">{view.registered ? 'Joined' : 'First order'}</div><div className="text-lg font-extrabold">{dateShort(view.joined)}</div></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {view.phone && <a href={`tel:${view.phone}`} className="btn-outline btn-sm"><Phone className="h-4 w-4" /> {formatPhone(view.phone)}</a>}
              {view.phone && <a href={whatsappLink(view.phone, `Hello ${view.name?.split(' ')[0] || ''}, `)} target="_blank" rel="noreferrer" className="btn-wa btn-sm"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
              {view.registered && <button onClick={() => toggleBlock(view)} className="btn-ghost btn-sm text-rose-600"><Ban className="h-4 w-4" /> {view.disabled ? 'Unblock' : 'Block'}</button>}
            </div>
            <h3 className="mb-2 mt-5 font-bold">Orders</h3>
            {view.orders.length === 0 ? <p className="text-sm text-ink-muted">No orders yet.</p> : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-100">
                {view.orders.map((o) => (
                  <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                    <span className="font-mono font-semibold">{o.id}</span><span className="text-ink-muted">{timeAgo(o.createdAt)}</span>
                    <Badge tone={statusOf(o.status).tone} className="ml-auto">{statusOf(o.status).label}</Badge><span className="font-bold">{money(o.total)}</span>
                  </Link></li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
