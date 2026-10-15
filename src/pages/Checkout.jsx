import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Store, Smartphone, Banknote, CreditCard, Tag, X, ChevronDown, ShieldCheck, MapPin, User, AlertTriangle } from 'lucide-react';
import { useCart, usePrefs, toast } from '../store';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { createOrder, getCoupon, evaluateCoupon, attachPayment, updateMe, fetchActiveProducts } from '../lib/api';
import { REGIONS, isValidGhPhone, detectNetwork, normalizePhone, isValidGhanaPostGPS } from '../lib/ghana';
import { money } from '../lib/format';
import { payWithPaystack } from '../lib/paystack';
import { Img, Field, Empty, Spinner, cx } from '../components/ui';
import { ShoppingBag } from 'lucide-react';

function Step({ n, title, icon: Icon, children, aside }) {
  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-700 text-sm text-white">{n}</span>
          {title}
          {Icon && <Icon className="h-5 w-5 text-ink-muted" />}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Choice({ checked, onClick, icon: Icon, title, desc, right, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cx('flex w-full items-start gap-3 rounded-2xl p-4 text-left ring-2 transition disabled:opacity-50',
        checked ? 'bg-navy-50/60 ring-navy-600' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2', checked ? 'ring-navy-600' : 'ring-slate-300')}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-navy-600" />}
      </span>
      {Icon && <Icon className={cx('mt-0.5 h-5 w-5 shrink-0', checked ? 'text-navy-700' : 'text-ink-muted')} />}
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {desc && <span className="mt-0.5 block text-xs text-ink-muted">{desc}</span>}
      </span>
      {right && <span className="shrink-0 text-sm font-bold">{right}</span>}
    </button>
  );
}

const NET_COLORS = { MTN: 'bg-yellow-400 text-black', Telecel: 'bg-red-600 text-white', AirtelTigo: 'bg-blue-600 text-white' };

export default function Checkout() {
  const { items, clear, sync } = useCart();
  const { user, profile } = useAuth();
  const { settings } = useStore();
  const navigate = useNavigate();
  const saved = usePrefs((s) => s.checkout);
  const saveCheckout = usePrefs((s) => s.saveCheckout);
  const pay = settings.payments;

  const [f, setF] = useState(() => ({
    name: saved.name || '', phone: saved.phone || '', email: saved.email || '',
    method: saved.method || 'delivery', region: saved.region || 'Greater Accra',
    city: saved.city || '', address: saved.address || '', gps: saved.gps || '', notes: '',
    payment: '', altPhone: '',
  }));
  const [errors, setErrors] = useState({});
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponErr, setCouponErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [saveAddr, setSaveAddr] = useState(true);

  // Prefill from account
  useEffect(() => {
    if (!profile) return;
    const addr = profile.addresses?.find((a) => a.default) || profile.addresses?.[0];
    setF((x) => ({
      ...x,
      name: x.name || profile.name || '',
      phone: x.phone || profile.phone || '',
      email: x.email || profile.email || '',
      ...(addr && !x.address ? { region: addr.region, city: addr.city, address: addr.address, gps: addr.gps || '' } : {}),
    }));
  }, [profile]);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target ? e.target.value : e }); setErrors({ ...errors, [k]: undefined }); };

  const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    try { return evaluateCoupon(coupon, subtotal); } catch { return 0; }
  }, [coupon, subtotal]);
  const zone = settings.deliveryZones?.find((z) => z.region === f.region);
  const freeDelivery = settings.freeDeliveryThreshold > 0 && subtotal - discount >= settings.freeDeliveryThreshold && (f.region === 'Greater Accra' || settings.freeDeliveryAllRegions);
  const deliveryFee = f.method === 'pickup' ? 0 : freeDelivery ? 0 : Number(zone?.fee || 0);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const methods = [
    pay.paystack && pay.paystackPublicKey && { key: 'paystack', icon: Smartphone, title: 'Mobile Money or Card', desc: 'MTN MoMo, Telecel Cash, AT Money, Visa, Mastercard. Instant & secure via Paystack.' },
    pay.momo_manual && pay.momoNumber && { key: 'momo_manual', icon: Smartphone, title: 'Send MoMo manually', desc: `Transfer to ${pay.momoNetwork} ${pay.momoNumber} (${pay.momoName}). We confirm before dispatch.` },
    pay.cod && (!pay.codMaxAmount || total <= pay.codMaxAmount) && { key: 'cod', icon: Banknote, title: f.method === 'pickup' ? 'Pay at the shop' : 'Pay on delivery', desc: f.method === 'pickup' ? 'Pay with cash, MoMo or card when you pick up.' : 'Pay with cash or MoMo when your order arrives. Inspect before you pay.' },
  ].filter(Boolean);

  useEffect(() => {
    if (!methods.some((m) => m.key === f.payment)) setF((x) => ({ ...x, payment: methods[0]?.key || '' }));
  }, [methods.map((m) => m.key).join(), f.payment]); // eslint-disable-line react-hooks/exhaustive-deps

  const network = detectNetwork(f.phone);

  const applyCoupon = async () => {
    setCouponErr('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const c = await getCoupon(code);
      evaluateCoupon(c, subtotal);
      setCoupon(c);
      toast(`Code ${code} applied`);
    } catch (e) {
      setCoupon(null);
      setCouponErr(e.message || 'Invalid code');
    }
  };

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name';
    if (!isValidGhPhone(f.phone)) e.phone = 'Enter a valid Ghana number, e.g. 024 123 4567';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email or leave blank';
    if (f.method === 'delivery') {
      if (!f.region) e.region = 'Choose your region';
      if (f.city.trim().length < 2) e.city = 'Enter your town or city';
      if (f.address.trim().length < 4) e.address = 'Tell us where to deliver: area, street or landmark';
      if (f.gps && !isValidGhanaPostGPS(f.gps)) e.gps = 'Format: GA-123-4567';
    }
    if (!f.payment) e.payment = 'Choose a payment method';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector(`[data-field="${Object.keys(e)[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !Object.keys(e).length;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      // Re-check live prices and stock before charging.
      const live = await fetchActiveProducts();
      const changes = sync(live);
      if (changes.length) {
        toast(changes[0] + (changes.length > 1 ? ` (+${changes.length - 1} more)` : '') + '. Please review your order.', 'error');
        setBusy(false);
        return;
      }
      const lines = useCart.getState().items;
      const sub = lines.reduce((n, i) => n + i.qty * i.price, 0);
      const order = {
        items: lines.map((i) => ({ productId: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty, condition: i.condition || '' })),
        customer: { name: f.name.trim(), phone: normalizePhone(f.phone), email: f.email.trim(), altPhone: normalizePhone(f.altPhone) },
        delivery: f.method === 'pickup'
          ? { method: 'pickup', address: settings.pickupAddress, fee: 0 }
          : { method: 'delivery', region: f.region, city: f.city.trim(), address: f.address.trim(), gps: f.gps.trim().toUpperCase(), fee: deliveryFee, eta: zone?.eta || '' },
        notes: f.notes.trim(),
        subtotal: sub,
        discount,
        couponCode: coupon && discount > 0 ? coupon.code : null,
        deliveryFee,
        total: Math.max(0, sub - discount + deliveryFee),
        payment: { method: f.payment, status: 'pending' },
        channel: 'web',
      };
      const id = await createOrder(order);
      saveCheckout({ name: f.name, phone: f.phone, email: f.email, method: f.method, region: f.region, city: f.city, address: f.address, gps: f.gps });
      if (user && saveAddr && f.method === 'delivery' && !(profile?.addresses || []).some((a) => a.address === f.address.trim())) {
        const addresses = [...(profile?.addresses || []), { label: 'Home', region: f.region, city: f.city.trim(), address: f.address.trim(), gps: f.gps.trim(), default: !(profile?.addresses || []).length }];
        updateMe(user.uid, { addresses, ...(profile?.phone ? {} : { phone: normalizePhone(f.phone) }) }).catch(() => {});
      }
      clear();

      if (f.payment === 'paystack') {
        try {
          const res = await payWithPaystack({
            key: pay.paystackPublicKey,
            email: f.email.trim() || `${normalizePhone(f.phone)}@customers.gadgetshub.gh`,
            amount: order.total,
            reference: `${id}-${Date.now().toString(36)}`,
            phone: normalizePhone(f.phone),
            metadata: { orderId: id, name: order.customer.name },
          });
          await attachPayment(id, res.reference);
        } catch (e) {
          if (e.message !== 'closed') toast(e.message, 'error');
        }
      }
      navigate(`/order/${id}?placed=1`, { replace: true });
    } catch (e) {
      console.error(e);
      toast(e.message || 'Could not place order. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!items.length && !busy) {
    return <div className="container-x"><Empty icon={ShoppingBag} title="Nothing to check out" text="Your cart is empty." action={<Link to="/shop" className="btn-primary">Continue shopping</Link>} /></div>;
  }

  const count = items.reduce((n, i) => n + i.qty, 0);
  const summary = (
    <div className="card p-5">
      <button onClick={() => setShowItems(!showItems)} className="flex w-full items-center justify-between font-bold lg:pointer-events-none">
        Order summary ({count})
        <ChevronDown className={cx('h-5 w-5 transition lg:hidden', showItems && 'rotate-180')} />
      </button>
      <ul className={cx('mt-4 space-y-3', !showItems && 'hidden lg:block')}>
        {items.map((i) => (
          <li key={i.id} className="flex gap-3">
            <div className="relative shrink-0">
              <Img src={i.image} w={120} h={120} fit="contain" className="h-14 w-14 rounded-lg bg-white ring-1 ring-slate-100" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[11px] font-bold text-white">{i.qty}</span>
            </div>
            <span className="line-clamp-2 flex-1 text-sm">{i.name}</span>
            <span className="text-sm font-semibold">{money(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-slate-100 pt-4">
        {coupon ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="flex items-center gap-2"><Tag className="h-4 w-4" /><b>{coupon.code}</b> applied</span>
            <button onClick={() => { setCoupon(null); setCouponInput(''); }} aria-label="Remove code"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Promo code" className="input !py-2 uppercase" />
              <button onClick={applyCoupon} className="btn-outline">Apply</button>
            </div>
            {couponErr && <p className="mt-1 text-xs font-medium text-rose-600">{couponErr}</p>}
          </div>
        )}
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd className="font-semibold">−{money(discount)}</dd></div>}
        <div className="flex justify-between">
          <dt className="text-ink-muted">{f.method === 'pickup' ? 'Store pickup' : `Delivery · ${f.region}`}</dt>
          <dd className="font-semibold">{deliveryFee === 0 ? <span className="text-emerald-700">FREE</span> : money(deliveryFee)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
          <dt className="font-bold">Total</dt><dd className="text-2xl font-extrabold">{money(total)}</dd>
        </div>
      </dl>
      <button onClick={placeOrder} disabled={busy} className="btn-primary btn-lg mt-5 hidden w-full lg:flex">
        {busy ? <><Spinner /> Placing order…</> : <><Lock className="h-4 w-4" /> {f.payment === 'paystack' ? `Pay ${money(total)}` : 'Place order'}</>}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-muted"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Your details are safe and never shared</p>
    </div>
  );

  return (
    <div className="container-x py-4 pb-32 sm:py-6 lg:pb-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Lock className="h-4 w-4" /> Secure</span>
      </div>
      {!user && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-navy-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-navy-900"><User className="h-4 w-4" /> Have an account? Sign in for faster checkout.</span>
          <Link to="/login?next=/checkout" className="link shrink-0">Sign in</Link>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="lg:hidden">{summary}</div>

          <Step n={1} title="Your details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name} className="sm:col-span-2">
                <input data-field="name" className="input" value={f.name} onChange={set('name')} autoComplete="name" placeholder="Kwame Mensah" />
              </Field>
              <Field label="Phone number" error={errors.phone} hint="We'll call or WhatsApp this number about delivery">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">🇬🇭</span>
                  <input data-field="phone" className="input pl-10 pr-24" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="024 123 4567" />
                  {network && <span className={cx('absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs font-bold', NET_COLORS[network])}>{network}</span>}
                </div>
              </Field>
              <Field label="Email (optional)" error={errors.email} hint="For your receipt">
                <input data-field="email" className="input" type="email" inputMode="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
              </Field>
            </div>
          </Step>

          <Step n={2} title="Delivery">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice checked={f.method === 'delivery'} onClick={() => setF({ ...f, method: 'delivery' })} icon={Truck} title="Deliver to me" desc={zone ? `${zone.eta}` : 'Nationwide'} right={freeDelivery ? 'FREE' : zone ? money(zone.fee) : ''} />
              {settings.pickupEnabled && <Choice checked={f.method === 'pickup'} onClick={() => setF({ ...f, method: 'pickup' })} icon={Store} title="Pick up in store" desc={settings.pickupAddress} right="FREE" />}
            </div>
            {f.method === 'delivery' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {profile?.addresses?.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="label">Saved addresses</span>
                    <div className="no-scrollbar flex gap-2 overflow-x-auto">
                      {profile.addresses.map((a, idx) => (
                        <button key={idx} type="button" onClick={() => setF({ ...f, region: a.region, city: a.city, address: a.address, gps: a.gps || '' })}
                          className={cx('shrink-0 rounded-xl px-3 py-2 text-left text-xs ring-1', f.address === a.address ? 'bg-navy-50 ring-navy-500' : 'ring-slate-200')}>
                          <b className="block">{a.label || 'Address'}</b>{a.city}, {a.region}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Field label="Region" error={errors.region}>
                  <select data-field="region" className="input" value={f.region} onChange={set('region')}>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Town / City" error={errors.city}>
                  <input data-field="city" className="input" value={f.city} onChange={set('city')} placeholder="e.g. East Legon, Kumasi" autoComplete="address-level2" />
                </Field>
                <Field label="Address & landmark" error={errors.address} className="sm:col-span-2" hint="Street, house number or a nearby landmark the rider can find">
                  <textarea data-field="address" className="input min-h-[80px]" value={f.address} onChange={set('address')} placeholder="e.g. Behind Shell filling station, opposite the blue gate" autoComplete="street-address" />
                </Field>
                <Field label="GhanaPost GPS (optional)" error={errors.gps} hint="e.g. GA-183-8164">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input data-field="gps" className="input pl-10 uppercase" value={f.gps} onChange={set('gps')} placeholder="GA-123-4567" />
                  </div>
                </Field>
                <Field label="Alternative phone (optional)">
                  <input className="input" type="tel" inputMode="tel" value={f.altPhone} onChange={set('altPhone')} placeholder="Someone we can reach" />
                </Field>
                {user && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="rounded border-slate-300 text-navy-600" /> Save this address to my account
                  </label>
                )}
              </div>
            )}
            <Field label="Order note (optional)" className="mt-4">
              <input className="input" value={f.notes} onChange={set('notes')} placeholder="Anything we should know?" />
            </Field>
          </Step>

          <Step n={3} title="Payment">
            <div data-field="payment" className="space-y-3">
              {methods.length === 0 && <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> No payment method is available right now. Please contact us on WhatsApp.</p>}
              {methods.map((m) => (
                <Choice key={m.key} checked={f.payment === m.key} onClick={() => setF({ ...f, payment: m.key })} icon={m.icon} title={m.title} desc={m.desc} />
              ))}
              {errors.payment && <p className="text-xs font-medium text-rose-600">{errors.payment}</p>}
              {f.payment === 'paystack' && (
                <div className="flex flex-wrap items-center gap-2 pl-1 pt-1">
                  {['MTN MoMo', 'Telecel Cash', 'AT Money'].map((n) => <span key={n} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{n}</span>)}
                  <CreditCard className="h-4 w-4 text-ink-muted" /><span className="text-xs text-ink-muted">Visa / Mastercard</span>
                </div>
              )}
              {pay.cod && pay.codMaxAmount > 0 && total > pay.codMaxAmount && (
                <p className="text-xs text-ink-muted">Pay on delivery is available for orders up to {money(pay.codMaxAmount)}.</p>
              )}
            </div>
          </Step>

          <p className="px-1 text-xs text-ink-muted">
            By placing your order you agree to our <Link to="/help#warranty" className="link">warranty & returns policy</Link>.
          </p>
        </div>

        <aside className="hidden lg:sticky lg:top-36 lg:block lg:self-start">{summary}</aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 pb-safe shadow-lift lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-xs text-ink-muted">Total</div>
            <div className="text-lg font-extrabold">{money(total)}</div>
          </div>
          <button onClick={placeOrder} disabled={busy} className="btn-primary btn-lg flex-1">
            {busy ? <><Spinner /> Placing…</> : f.payment === 'paystack' ? `Pay ${money(total, { compact: true })}` : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}
