import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Truck, ShieldCheck, Smartphone, HelpCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { money } from '../lib/format';
import { cx } from '../components/ui';

function Item({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-4 text-left font-semibold">
        {q}<ChevronDown className={cx('h-5 w-5 shrink-0 transition', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-4 text-sm leading-relaxed text-ink-soft">{children}</div>}
    </div>
  );
}

export default function Help() {
  const { settings } = useStore();
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }); }, [hash]);
  return (
    <div className="container-x max-w-3xl py-8">
      <h1 className="font-display text-4xl font-bold">Help centre</h1>
      <p className="mt-1 text-ink-muted">Quick answers to common questions. Can't find yours? <Link to="/contact" className="link">Contact us</Link>.</p>

      <section id="delivery" className="card mt-6 scroll-mt-40 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Truck className="h-5 w-5 text-navy-600" /> Delivery & pickup</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-muted"><th className="py-2">Region</th><th>Fee</th><th>Time</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {settings.deliveryZones?.map((z) => <tr key={z.region}><td className="py-2 font-medium">{z.region}</td><td>{money(z.fee)}</td><td className="text-ink-muted">{z.eta}</td></tr>)}
            </tbody>
          </table>
        </div>
        {settings.freeDeliveryThreshold > 0 && <p className="mt-3 text-sm text-emerald-700">Free delivery in Greater Accra on orders above {money(settings.freeDeliveryThreshold)}.</p>}
        {settings.pickupEnabled && <p className="mt-2 text-sm text-ink-soft">Prefer to collect? Choose <b>Pick up in store</b> at checkout: {settings.pickupAddress}.</p>}
      </section>

      <section id="payment" className="card mt-4 scroll-mt-40 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Smartphone className="h-5 w-5 text-brand-500" /> Payments</h2>
        <Item q="How do I pay with Mobile Money?">Choose <b>Mobile Money or Card</b> at checkout. A secure Paystack window opens. Select your network (MTN, Telecel or AirtelTigo), enter your number, and approve the prompt on your phone with your MoMo PIN.</Item>
        <Item q="Can I pay on delivery?">Yes{settings.payments.codMaxAmount ? `, for orders up to ${money(settings.payments.codMaxAmount)}` : ''}. Pay the rider with cash or MoMo after you've inspected your item.</Item>
        <Item q="Can I send MoMo directly?">Yes. Choose <b>Send MoMo manually</b>, send to {settings.payments.momoNetwork} {settings.payments.momoNumber} ({settings.payments.momoName}) using your order number as reference, then enter your transaction ID on the order page.</Item>
        <Item q="Is it safe to pay online?">Card and MoMo payments are processed by Paystack, a licensed payment provider. We never see or store your PIN or card details.</Item>
      </section>

      <section id="warranty" className="card mt-4 scroll-mt-40 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Warranty & returns</h2>
        <p className="mt-2 text-sm text-ink-soft">{settings.warrantyText}</p>
        <p className="mt-2 text-sm text-ink-soft">{settings.returnPolicy}</p>
        <Item q="What's the difference between New, UK-Used and Refurbished?"><b>Brand New</b>: sealed box, manufacturer warranty. <b>UK/US Used</b>: imported, Grade-A, carefully tested. <b>Refurbished</b>: professionally restored with replaced parts where needed. All are tested before dispatch.</Item>
        <Item q="How do I make a warranty claim?">Bring the laptop and your order number to our shop, or message us on WhatsApp. We'll diagnose and repair or replace within the warranty terms.</Item>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><HelpCircle className="h-5 w-5 text-navy-600" /> Orders</h2>
        <Item q="How do I track my order?">Use <Link to="/track" className="link">Track order</Link> with your order number and phone number, or see it under <Link to="/account/orders" className="link">My orders</Link> if you have an account.</Item>
        <Item q="Can I cancel my order?">Yes, while it's still pending you can cancel from the order page (signed-in customers), or message us on WhatsApp.</Item>
        <Item q="Do I need an account to order?">No. You can check out as a guest. An account lets you save addresses and see all your orders.</Item>
      </section>
    </div>
  );
}
