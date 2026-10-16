import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Package, MapPin, User, Heart, LogOut, LayoutDashboard, ChevronRight, Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchMyOrders, updateMe } from '../../lib/api';
import { money, dateShort } from '../../lib/format';
import { statusOf } from '../../lib/constants';
import { REGIONS, isValidGhPhone, normalizePhone } from '../../lib/ghana';
import { Img, Badge, Empty, Field, Modal, PageLoader, cx } from '../../components/ui';
import { toast } from '../../store';

function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  useEffect(() => { fetchMyOrders(user.uid).then(setOrders).catch(() => setOrders([])); }, [user.uid]);
  return orders;
}

function OrderRow({ o }) {
  const st = statusOf(o.status);
  return (
    <Link to={`/order/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
      <div className="flex -space-x-3">
        {o.items.slice(0, 3).map((i) => <Img key={i.productId} src={i.image} w={80} h={80} fit="contain" className="h-12 w-12 rounded-lg bg-white ring-2 ring-white" />)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-sm font-bold">{o.orderNumber || o.id}</div>
        <div className="text-xs text-ink-muted">{dateShort(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} items</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold">{money(o.total)}</div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}

function Overview() {
  const { profile } = useAuth();
  const orders = useOrders();
  const active = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)) || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><div className="text-2xl font-extrabold">{orders?.length ?? '–'}</div><div className="text-xs text-ink-muted">Orders</div></div>
        <div className="card p-4"><div className="text-2xl font-extrabold">{active.length}</div><div className="text-xs text-ink-muted">In progress</div></div>
        <div className="card p-4"><div className="text-2xl font-extrabold">{profile?.wishlist?.length || 0}</div><div className="text-xs text-ink-muted">Saved</div></div>
      </div>
      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 p-4"><h2 className="font-bold">Recent orders</h2><Link to="/account/orders" className="link text-sm">View all</Link></div>
        {orders === null ? <PageLoader /> : orders.length === 0 ? (
          <Empty icon={Package} title="No orders yet" text="When you place an order it will show up here." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />
        ) : <div className="divide-y divide-slate-100">{orders.slice(0, 3).map((o) => <OrderRow key={o.id} o={o} />)}</div>}
      </div>
    </div>
  );
}

function Orders() {
  const orders = useOrders();
  return (
    <div className="card">
      <h2 className="border-b border-slate-100 p-4 font-bold">My orders</h2>
      {orders === null ? <PageLoader /> : orders.length === 0 ? (
        <Empty icon={Package} title="No orders yet" action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />
      ) : <div className="divide-y divide-slate-100">{orders.map((o) => <OrderRow key={o.id} o={o} />)}</div>}
    </div>
  );
}

function Addresses() {
  const { user, profile } = useAuth();
  const list = profile?.addresses || [];
  const [edit, setEdit] = useState(null);
  const save = async (next) => {
    try { await updateMe(user.uid, { addresses: next }); toast('Addresses updated'); } catch (e) { toast(e.message, 'error'); }
  };
  const submit = (e) => {
    e.preventDefault();
    const a = { ...edit.data };
    let next = edit.index == null ? [...list, a] : list.map((x, i) => (i === edit.index ? a : x));
    if (a.default || next.length === 1) next = next.map((x) => ({ ...x, default: x === a || next.length === 1 }));
    save(next);
    setEdit(null);
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <h2 className="font-bold">Delivery addresses</h2>
        <button onClick={() => setEdit({ index: null, data: { label: 'Home', region: 'Greater Accra', city: '', address: '', gps: '', default: !list.length } })} className="btn-outline btn-sm"><Plus className="h-4 w-4" /> Add</button>
      </div>
      {list.length === 0 ? <Empty icon={MapPin} title="No saved addresses" text="Save an address for faster checkout." /> : (
        <ul className="divide-y divide-slate-100">
          {list.map((a, i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <MapPin className="mt-0.5 h-5 w-5 text-navy-600" />
              <div className="flex-1 text-sm">
                <div className="font-semibold">{a.label} {a.default && <Badge tone="bg-navy-50 text-navy-700 ring-navy-200" className="ml-1">Default</Badge>}</div>
                <p className="text-ink-soft">{a.address}, {a.city}, {a.region}{a.gps && ` · ${a.gps}`}</p>
              </div>
              <button onClick={() => setEdit({ index: i, data: a })} className="btn-ghost btn-sm">Edit</button>
              <button onClick={() => save(list.filter((_, j) => j !== i))} className="btn-ghost btn-sm text-rose-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.index == null ? 'Add address' : 'Edit address'} footer={<button form="addr" className="btn-primary">Save address</button>}>
        {edit && (
          <form id="addr" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Label"><input className="input" value={edit.data.label} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, label: e.target.value } })} placeholder="Home, Office…" /></Field>
            <Field label="Region"><select className="input" value={edit.data.region} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, region: e.target.value } })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <Field label="Town / City"><input className="input" required value={edit.data.city} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, city: e.target.value } })} /></Field>
            <Field label="GhanaPost GPS"><input className="input uppercase" value={edit.data.gps} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, gps: e.target.value.toUpperCase() } })} placeholder="GA-123-4567" /></Field>
            <Field label="Address & landmark" className="sm:col-span-2"><textarea className="input" required value={edit.data.address} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, address: e.target.value } })} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!edit.data.default} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, default: e.target.checked } })} className="rounded border-slate-300 text-navy-600" /> Use as default</label>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Profile() {
  const { user, profile, resetPassword } = useAuth();
  const [f, setF] = useState({ name: profile?.name || '', phone: profile?.phone || '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.phone && !isValidGhPhone(f.phone)) return toast('Enter a valid Ghana phone number', 'error');
    setBusy(true);
    try { await updateMe(user.uid, { name: f.name.trim(), phone: normalizePhone(f.phone) }); toast('Profile saved'); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card p-5">
      <h2 className="font-bold">Profile</h2>
      <form onSubmit={submit} className="mt-4 grid max-w-lg gap-4">
        <Field label="Full name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><input className="input" value={user.email || ''} disabled /></Field>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className="btn-primary">Save changes</button>
          <button type="button" onClick={async () => { await resetPassword(user.email); toast('Password reset link sent to your email'); }} className="btn-outline">Change password</button>
        </div>
      </form>
    </div>
  );
}

export default function Account() {
  const { profile, user, logout, isStaff } = useAuth();
  const link = ({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-navy-50 text-navy-800' : 'text-ink-soft hover:bg-slate-50');
  return (
    <div className="container-x py-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 text-xl font-bold text-white">{(profile?.name || user.email || '?')[0].toUpperCase()}</div>
        <div>
          <h1 className="text-2xl font-extrabold">Hi, {(profile?.name || 'there').split(' ')[0]} 👋</h1>
          <p className="text-sm text-ink-muted">{user.email}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-1 lg:px-0">
          <NavLink to="/account" end className={link}><User className="h-4 w-4" />Overview</NavLink>
          <NavLink to="/account/orders" className={link}><Package className="h-4 w-4" />Orders</NavLink>
          <NavLink to="/account/addresses" className={link}><MapPin className="h-4 w-4" />Addresses</NavLink>
          <NavLink to="/account/profile" className={link}><Star className="h-4 w-4" />Profile</NavLink>
          <NavLink to="/wishlist" className={link}><Heart className="h-4 w-4" />Saved items</NavLink>
          {isStaff && <NavLink to="/admin" className={link}><LayoutDashboard className="h-4 w-4" />Admin</NavLink>}
          <button onClick={logout} className="flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Sign out</button>
        </nav>
        <div>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
