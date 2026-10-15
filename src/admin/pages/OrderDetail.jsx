import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Printer, MapPin, Store, CheckCircle2, StickyNote, CreditCard } from 'lucide-react';
import { subscribeOrder, setOrderStatus, updateOrder, logActivity, Timestamp } from '../../lib/api';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';
import { ORDER_STATUSES, statusOf, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../lib/constants';
import { money, dateTime } from '../../lib/format';
import { formatPhone, whatsappLink, detectNetwork } from '../../lib/ghana';
import { useStore } from '../../context/StoreContext';
import { OrderTracker } from '../../pages/OrderView';
import { WhatsAppIcon } from '../../components/WhatsAppFab';
import { Badge, Img, PageLoader, Spinner, Modal, Field, cx } from '../../components/ui';
import { toast } from '../../store';

const NEXT = { pending: 'confirmed', confirmed: 'processing', processing: 'shipped', shipped: 'delivered' };
const NEXT_LABEL = { pending: 'Confirm order', confirmed: 'Start packing', processing: 'Mark out for delivery', shipped: 'Mark delivered' };

const waMessage = (o, store) => {
  const first = o.customer?.name?.split(' ')[0] || '';
  const map = {
    pending: `Hello ${first}, thank you for your order ${o.id} at ${store} (${money(o.total)}). We'll confirm shortly.`,
    confirmed: `Hello ${first}, your order ${o.id} has been confirmed ✅. We're preparing it now.`,
    processing: `Hello ${first}, your order ${o.id} is being packed 📦 and will be dispatched soon.`,
    shipped: `Hello ${first}, your order ${o.id} is on the way 🚚. Our rider will call you on arrival.`,
    delivered: `Hello ${first}, your order ${o.id} has been delivered. Thank you for shopping with ${store}! We'd love a review 🙏`,
    cancelled: `Hello ${first}, your order ${o.id} has been cancelled. Please reach out if you have any questions.`,
  };
  return `${map[o.status] || ''}\nTrack: ${window.location.origin}/order/${o.id}`;
};

export default function OrderDetail() {
  const { id } = useParams();
  const { settings } = useStore();
  const [o, setO] = useState(undefined);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => subscribeOrder(id, setO, () => setO(null)), [id]);
  if (o === undefined) return <PageLoader />;
  if (!o) return <p className="p-8 text-center">Order not found. <Link to="/admin/orders" className="link">Back</Link></p>;

  const st = statusOf(o.status);
  const ps = PAYMENT_STATUSES[o.payment?.status] || PAYMENT_STATUSES.pending;

  const move = async (status, n = '') => {
    setBusy(status);
    try {
      await setOrderStatus(o.id, status, n);
      await logActivity(`Order ${o.id} → ${status}`, n);
      toast(`Order marked ${statusOf(status).label.toLowerCase()}`);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const setPayment = async (status) => {
    setBusy(`pay-${status}`);
    try {
      await updateOrder(o.id, {
        'payment.status': status,
        'payment.verified': status === 'paid',
        ...(status === 'paid' ? { 'payment.paidAt': serverTimestamp() } : {}),
        timeline: arrayUnion({ status: o.status, at: Timestamp.now(), note: `Payment marked ${status}` }),
      });
      await logActivity(`Order ${o.id} payment → ${status}`);
      toast('Payment updated');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await updateOrder(o.id, { internalNotes: arrayUnion({ text: note.trim(), at: Timestamp.now() }) });
      setNote('');
    } catch (err) { toast(err.message, 'error'); }
  };

  const next = NEXT[o.status];
  const skipShip = o.delivery?.method === 'pickup' && next === 'shipped';

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link to="/admin/orders" className="btn-ghost -ml-3"><ArrowLeft className="h-4 w-4" /> Orders</Link>
        <button onClick={() => window.print()} className="btn-outline"><Printer className="h-4 w-4" /> Print invoice</button>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-extrabold">{o.id}</h1>
          <p className="text-sm text-ink-muted">Placed {dateTime(o.createdAt)} · via {o.channel || 'web'}</p>
        </div>
        <div className="flex gap-2"><Badge tone={st.tone}>{st.label}</Badge><Badge tone={ps.tone}>{ps.label}</Badge></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="card p-5">
            <OrderTracker order={o} />
            {o.status !== 'cancelled' && o.status !== 'delivered' && (
              <div className="no-print mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {next && (
                  <button onClick={() => move(skipShip ? 'delivered' : next)} disabled={!!busy} className="btn-primary">
                    {busy && busy !== 'cancelled' ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />} {skipShip ? 'Mark picked up' : NEXT_LABEL[o.status]}
                  </button>
                )}
                <select value="" onChange={(e) => e.target.value && move(e.target.value)} className="input w-auto !py-2 text-sm">
                  <option value="">Set status…</option>
                  {ORDER_STATUSES.filter((s) => s.value !== o.status && s.value !== 'cancelled').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button onClick={() => setCancelOpen(true)} className="btn-ghost text-rose-600">Cancel order</button>
              </div>
            )}
            {o.status === 'pending' && <p className="no-print mt-3 text-xs text-ink-muted">Confirming deducts stock automatically. Cancelling a confirmed order puts the stock back.</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold">Items</h2>
            <ul className="divide-y divide-slate-100">
              {o.items?.map((i) => (
                <li key={i.productId} className="flex items-center gap-3 py-3">
                  <Img src={i.image} w={100} h={100} fit="contain" className="h-14 w-14 rounded-lg ring-1 ring-slate-100" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/products/${i.productId}`} className="text-sm font-semibold hover:underline">{i.name}</Link>
                    <div className="text-xs text-ink-muted">{i.qty} × {money(i.price)}</div>
                  </div>
                  <div className="font-bold">{money(i.qty * i.price)}</div>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount ({o.couponCode})</dt><dd>−{money(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-muted">Delivery</dt><dd>{money(o.deliveryFee)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{money(o.total)}</dd></div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-bold">Timeline</h2>
            <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
              {[...(o.timeline || [])].reverse().map((t, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-navy-500 ring-4 ring-white" />
                  <b>{statusOf(t.status).label}</b>{t.note && <span className="text-ink-soft">: {t.note}</span>}
                  <div className="text-xs text-ink-muted">{dateTime(t.at)}{t.by && ` · ${t.by}`}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <h2 className="mb-2 font-bold">Customer</h2>
            <p className="font-semibold">{o.customer?.name}</p>
            <p className="text-ink-soft">{formatPhone(o.customer?.phone)} {detectNetwork(o.customer?.phone) && <span className="text-xs text-ink-muted">({detectNetwork(o.customer?.phone)})</span>}</p>
            {o.customer?.altPhone && <p className="text-ink-soft">Alt: {formatPhone(o.customer.altPhone)}</p>}
            {o.customer?.email && <p className="text-ink-soft">{o.customer.email}</p>}
            <p className="mt-1 text-xs text-ink-muted">{o.userId ? 'Registered customer' : 'Guest checkout'}</p>
            <div className="no-print mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${o.customer?.phone}`} className="btn-outline btn-sm"><Phone className="h-4 w-4" /> Call</a>
              <a href={whatsappLink(o.customer?.phone, waMessage(o, settings.storeName))} target="_blank" rel="noreferrer" className="btn-wa btn-sm"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
            </div>
          </div>

          <div className="card p-5 text-sm">
            <h2 className="mb-2 flex items-center gap-2 font-bold">{o.delivery?.method === 'pickup' ? <><Store className="h-4 w-4" /> Store pickup</> : <><MapPin className="h-4 w-4" /> Delivery</>}</h2>
            {o.delivery?.method === 'pickup' ? <p className="text-ink-soft">{o.delivery.address}</p> : (
              <>
                <p className="text-ink-soft">{o.delivery?.address}</p>
                <p className="text-ink-soft">{o.delivery?.city}, {o.delivery?.region}</p>
                {o.delivery?.gps && <p className="mt-1 font-mono text-xs">GPS: {o.delivery.gps}</p>}
                <a className="link no-print mt-2 inline-block text-xs" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.delivery?.address}, ${o.delivery?.city}, Ghana`)}`}>Open in Google Maps</a>
              </>
            )}
            {o.notes && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-amber-900"><b>Note:</b> {o.notes}</p>}
          </div>

          <div className="card p-5 text-sm">
            <h2 className="mb-2 flex items-center gap-2 font-bold"><CreditCard className="h-4 w-4" /> Payment</h2>
            <p>{PAYMENT_METHODS[o.payment?.method]?.label}</p>
            <Badge tone={ps.tone} className="mt-1">{ps.label}</Badge>
            {o.payment?.reference && <p className="mt-2 break-all font-mono text-xs">Paystack ref: {o.payment.reference}</p>}
            {o.payment?.customerReference && <p className="mt-2 break-all rounded-lg bg-sky-50 p-2 font-mono text-xs text-sky-900">MoMo transaction ID: {o.payment.customerReference}</p>}
            {o.payment?.method === 'paystack' && o.payment?.status === 'paid' && !o.payment?.verified && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Verify this reference in your Paystack dashboard before dispatch, then tap “Mark verified”.</p>
            )}
            <div className="no-print mt-3 flex flex-wrap gap-2">
              {o.payment?.status !== 'paid' && <button onClick={() => setPayment('paid')} disabled={!!busy} className="btn-navy btn-sm">Mark paid</button>}
              {o.payment?.status === 'paid' && !o.payment?.verified && <button onClick={() => setPayment('paid')} disabled={!!busy} className="btn-navy btn-sm">Mark verified</button>}
              {o.payment?.status === 'paid' && <button onClick={() => setPayment('refunded')} disabled={!!busy} className="btn-outline btn-sm">Mark refunded</button>}
              {o.payment?.status === 'pending' && <button onClick={() => setPayment('failed')} disabled={!!busy} className="btn-ghost btn-sm text-rose-600">Mark failed</button>}
            </div>
          </div>

          <div className="no-print card p-5 text-sm">
            <h2 className="mb-2 flex items-center gap-2 font-bold"><StickyNote className="h-4 w-4" /> Internal notes</h2>
            <ul className="mb-3 space-y-2">
              {(o.internalNotes || []).map((n, i) => <li key={i} className="rounded-lg bg-slate-50 p-2">{n.text}<div className="text-xs text-ink-muted">{dateTime(n.at)}</div></li>)}
            </ul>
            <form onSubmit={addNote} className="flex gap-2">
              <input className="input !py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rider: Kofi, 055…" />
              <button className="btn-outline btn-sm">Add</button>
            </form>
          </div>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel order" size="sm"
        footer={<><button onClick={() => setCancelOpen(false)} className="btn-ghost">Keep order</button><button onClick={async () => { await move('cancelled', reason); setCancelOpen(false); }} className="btn-danger">Cancel order</button></>}>
        <Field label="Reason (shown in timeline)"><input className={cx('input')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer unreachable" /></Field>
        {o.stockDeducted && <p className="mt-3 text-sm text-ink-muted">Stock for these items will be returned to inventory.</p>}
      </Modal>
    </div>
  );
}
