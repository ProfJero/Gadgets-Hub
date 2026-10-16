import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, Truck, Home, ClipboardCheck, Cog, XCircle, Printer, Copy, Smartphone, MapPin, Store, PackageX } from 'lucide-react';
import { subscribeOrder, attachPayment, attachMomoReference, cancelMyOrder } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { money, dateTime } from '../lib/format';
import { statusOf, TRACK_STEPS, PAYMENT_METHODS, PAYMENT_STATUSES } from '../lib/constants';
import { formatPhone, whatsappLink, normalizePhone } from '../lib/ghana';
import { payWithPaystack } from '../lib/paystack';
import { WhatsAppIcon } from '../components/WhatsAppFab';
import { Img, PageLoader, Empty, Badge, Spinner, cx } from '../components/ui';
import { toast } from '../store';

const STEP_ICONS = { pending: ClipboardCheck, confirmed: CheckCircle2, processing: Cog, shipped: Truck, delivered: Home };
const STEP_LABELS = { pending: 'Order placed', confirmed: 'Confirmed', processing: 'Packing', shipped: 'On the way', delivered: 'Delivered' };

export function OrderTracker({ order }) {
  if (order.status === 'cancelled') {
    return <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800"><XCircle className="h-6 w-6" /><div><b>This order was cancelled.</b><p className="text-sm">Contact us if you have questions.</p></div></div>;
  }
  const steps = order.delivery?.method === 'pickup' ? TRACK_STEPS.filter((s) => s !== 'shipped') : TRACK_STEPS;
  const idx = steps.indexOf(order.status);
  const when = (s) => order.timeline?.slice().reverse().find((t) => t.status === s)?.at;
  return (
    <ol className="relative grid gap-0 sm:grid-cols-5">
      {steps.map((s, i) => {
        const Icon = STEP_ICONS[s];
        const done = i <= idx;
        return (
          <li key={s} className="relative flex gap-3 pb-6 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < steps.length - 1 && (
              <span className={cx('absolute left-5 top-10 h-[calc(100%-2.5rem)] w-0.5 sm:left-[calc(50%+1.25rem)] sm:top-5 sm:h-0.5 sm:w-[calc(100%-2.5rem)]', i < idx ? 'bg-emerald-500' : 'bg-slate-200')} />
            )}
            <span className={cx('relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 ring-white', done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400')}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="sm:mt-2">
              <div className={cx('text-sm font-semibold', !done && 'text-ink-muted')}>{s === 'delivered' && order.delivery?.method === 'pickup' ? 'Picked up' : STEP_LABELS[s]}</div>
              {when(s) && <div className="text-xs text-ink-muted">{dateTime(when(s))}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function OrderView() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const placed = sp.get('placed') === '1';
  const { settings } = useStore();
  const { user } = useAuth();
  const [order, setOrder] = useState(undefined);
  const [paying, setPaying] = useState(false);
  const [momoRef, setMomoRef] = useState('');

  useEffect(() => subscribeOrder(id, setOrder, () => setOrder(null)), [id]);

  if (order === undefined) return <PageLoader />;
  if (!order) return <div className="container-x"><Empty icon={PackageX} title="Order not found" text="Check the order number and try again." action={<Link to="/track" className="btn-primary">Track an order</Link>} /></div>;

  const st = statusOf(order.status);
  const pm = order.payment?.method;
  const basePs = PAYMENT_STATUSES[order.payment?.status] || PAYMENT_STATUSES.pending;
  const ps = pm === 'cod' && order.payment?.status === 'pending' ? { ...basePs, label: order.delivery?.method === 'pickup' ? 'Pay at pickup' : 'Pay on delivery' } : basePs;
  const unpaid = order.payment?.status === 'pending' && order.status !== 'cancelled';
  const canCancel = user && order.userId === user.uid && order.status === 'pending';

  const payNow = async () => {
    setPaying(true);
    try {
      const res = await payWithPaystack({
        key: settings.payments.paystackPublicKey,
        email: order.customer.email || `${normalizePhone(order.customer.phone)}@customers.gadgetshub.gh`,
        amount: order.total,
        reference: `${order.id}-${Date.now().toString(36)}`,
        phone: order.customer.phone,
        metadata: { orderId: order.id },
      });
      await attachPayment(order.id, res.reference);
      toast('Payment received. Thank you!');
    } catch (e) {
      if (e.message !== 'closed') toast(e.message, 'error');
    } finally { setPaying(false); }
  };

  const submitMomoRef = async (e) => {
    e.preventDefault();
    if (!momoRef.trim()) return;
    try { await attachMomoReference(order.id, momoRef.trim()); toast("Thanks! We'll confirm your payment shortly."); setMomoRef(''); } catch (err) { toast(err.message, 'error'); }
  };

  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast('Copied'));
  const waText = `Hello Gadgets Hub, I'm enquiring about my order *${order.orderNumber || order.id}*.`;

  return (
    <div className="container-x max-w-4xl py-6">
      {placed && (
        <div className="no-print mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white sm:p-8">
          <CheckCircle2 className="h-12 w-12" />
          <h1 className="mt-3 font-display text-3xl font-bold">Thank you, {order.customer?.name?.split(' ')[0]}! 🎉</h1>
          <p className="mt-1 text-emerald-50">Your order has been received. We'll call or WhatsApp <b>{formatPhone(order.customer?.phone)}</b> to confirm{order.delivery?.method === 'delivery' ? ' delivery' : ' pickup'}.</p>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-muted">Order number</p>
            <button onClick={() => copy(order.orderNumber || order.id)} className="flex items-center gap-2 font-mono text-2xl font-bold tracking-wide">
              {order.orderNumber || order.id} <Copy className="no-print h-4 w-4 text-ink-muted" />
            </button>
            <p className="mt-1 text-sm text-ink-muted">Placed {dateTime(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={ps.tone}>{ps.label}</Badge>
          </div>
        </div>
        <div className="mt-6"><OrderTracker order={order} /></div>
      </div>

      {unpaid && pm === 'paystack' && (
        <div className="no-print mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:flex-row sm:items-center">
          <div><b className="text-amber-900">Payment not completed</b><p className="text-sm text-amber-800">Complete payment with Mobile Money or card so we can process your order.</p></div>
          <button onClick={payNow} disabled={paying} className="btn-primary shrink-0">{paying ? <Spinner /> : <Smartphone className="h-4 w-4" />} Pay {money(order.total)} now</button>
        </div>
      )}
      {unpaid && pm === 'momo_manual' && (
        <div className="no-print mt-4 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <b className="text-amber-900">How to pay with Mobile Money</b>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-amber-900">
            <li>Send <b>{money(order.total)}</b> to <b>{settings.payments.momoNetwork} {settings.payments.momoNumber}</b> <button onClick={() => copy(settings.payments.momoNumber)} className="font-semibold underline">copy</button></li>
            <li>Name on account: <b>{settings.payments.momoName}</b></li>
            <li>Use <b>{order.orderNumber || order.id}</b> as the reference.</li>
            <li>Enter the transaction ID below. We confirm and dispatch.</li>
          </ol>
          {order.payment?.customerReference ? (
            <p className="mt-3 text-sm font-semibold text-emerald-700">✓ Transaction ID received: {order.payment.customerReference}. We're verifying it.</p>
          ) : (
            <form onSubmit={submitMomoRef} className="mt-3 flex gap-2">
              <input className="input" value={momoRef} onChange={(e) => setMomoRef(e.target.value)} placeholder="MoMo transaction ID" />
              <button className="btn-navy shrink-0">Submit</button>
            </form>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Items</h2>
          <ul className="divide-y divide-slate-100">
            {order.items?.map((i) => (
              <li key={i.productId} className="flex gap-3 py-3">
                <Img src={i.image} w={120} h={120} fit="contain" className="h-14 w-14 rounded-lg bg-white ring-1 ring-slate-100" />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${i.productId}`} className="line-clamp-2 text-sm font-semibold">{i.name}</Link>
                  <p className="text-xs text-ink-muted">{i.qty} × {money(i.price)}</p>
                </div>
                <span className="text-sm font-bold">{money(i.qty * i.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{money(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-muted">Delivery</dt><dd>{order.deliveryFee ? money(order.deliveryFee) : 'FREE'}</dd></div>
            <div className="flex justify-between pt-1 text-base font-extrabold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <h3 className="mb-2 flex items-center gap-2 font-bold">{order.delivery?.method === 'pickup' ? <><Store className="h-4 w-4" /> Store pickup</> : <><MapPin className="h-4 w-4" /> Delivery address</>}</h3>
            <p className="font-semibold">{order.customer?.name}</p>
            <p className="text-ink-soft">{formatPhone(order.customer?.phone)}</p>
            {order.delivery?.method === 'pickup' ? <p className="mt-1 text-ink-soft">{order.delivery.address}</p> : (
              <p className="mt-1 text-ink-soft">{order.delivery?.address}<br />{order.delivery?.city}, {order.delivery?.region}{order.delivery?.gps && <><br />GPS: {order.delivery.gps}</>}</p>
            )}
            {order.delivery?.eta && <p className="mt-2 text-xs font-semibold text-navy-700">Estimated: {order.delivery.eta}</p>}
          </div>
          <div className="card p-5 text-sm">
            <h3 className="mb-1 font-bold">Payment</h3>
            <p>{PAYMENT_METHODS[pm]?.label || pm}</p>
            <Badge tone={ps.tone} className="mt-2">{ps.label}</Badge>
          </div>
          <div className="no-print space-y-2">
            <a href={whatsappLink(settings.whatsapp, waText)} target="_blank" rel="noreferrer" className="btn-wa w-full"><WhatsAppIcon className="h-5 w-5" /> Ask about this order</a>
            <button onClick={() => window.print()} className="btn-outline w-full"><Printer className="h-4 w-4" /> Print receipt</button>
            {canCancel && (
              <button onClick={async () => { if (confirm('Cancel this order?')) { try { await cancelMyOrder(order.id); toast('Order cancelled', 'info'); } catch (e) { toast(e.message, 'error'); } } }} className="btn-ghost w-full text-rose-600">Cancel order</button>
            )}
          </div>
        </div>
      </div>
      <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className="btn-outline"><Package className="h-4 w-4" /> Continue shopping</Link>
        {user && <Link to="/account/orders" className="btn-ghost">View all my orders</Link>}
      </div>
    </div>
  );
}
