import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Heart, ShieldCheck, Truck, Smartphone } from 'lucide-react';
import { useCart } from '../store';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { money } from '../lib/format';
import { Img, QtyStepper, Empty, ConditionBadge } from '../components/ui';
import { ProductRail } from '../components/ProductCard';

export default function Cart() {
  const { items, setQty, remove } = useCart();
  const { toggleWishlist } = useAuth();
  const { products } = useStore();
  const navigate = useNavigate();
  const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const suggestions = products.filter((p) => p.category !== 'laptops' && p.stock > 0 && !items.some((i) => i.id === p.id)).slice(0, 10);

  if (!items.length) {
    return (
      <div className="container-x">
        <Empty icon={ShoppingBag} title="Your cart is empty" text="Looks like you haven't added anything yet." action={<Link to="/shop" className="btn-primary btn-lg">Start shopping</Link>} />
      </div>
    );
  }

  return (
    <div className="container-x py-6 pb-28 lg:pb-6">
      <h1 className="font-display text-3xl font-bold">Cart <span className="text-ink-muted">({count})</span></h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="card divide-y divide-slate-100">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 p-4">
              <Link to={`/product/${i.slug || i.id}`}><Img src={i.image} w={200} h={200} fit="contain" className="h-24 w-24 rounded-xl bg-white ring-1 ring-slate-100 sm:h-28 sm:w-28" /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/product/${i.slug || i.id}`} className="line-clamp-2 font-semibold">{i.name}</Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">{i.brand} {i.condition && <ConditionBadge condition={i.condition} />}</div>
                  </div>
                  <div className="text-right font-extrabold">{money(i.price * i.qty)}</div>
                </div>
                {i.qty > 1 && <div className="text-xs text-ink-muted">{money(i.price)} each</div>}
                <div className="mt-3 flex items-center justify-between">
                  <QtyStepper size="sm" value={i.qty} max={i.stock || 99} onChange={(q) => setQty(i.id, q)} />
                  <div className="flex gap-1">
                    <button onClick={() => { toggleWishlist(i.id); remove(i.id); }} className="btn-ghost btn-sm"><Heart className="h-4 w-4" /><span className="hidden sm:inline">Save for later</span></button>
                    <button onClick={() => remove(i.id)} className="btn-ghost btn-sm text-rose-600"><Trash2 className="h-4 w-4" /><span className="hidden sm:inline">Remove</span></button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card p-5">
            <h2 className="font-bold">Order summary</h2>
            <div className="mt-4 flex justify-between text-sm"><span className="text-ink-muted">Subtotal ({count} items)</span><span className="font-semibold">{money(subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-sm"><span className="text-ink-muted">Delivery</span><span className="text-ink-muted">At checkout</span></div>
            <div className="mt-4 flex justify-between border-t border-slate-100 pt-4"><span className="font-bold">Total</span><span className="text-xl font-extrabold">{money(subtotal)}</span></div>
            <button onClick={() => navigate('/checkout')} className="btn-primary btn-lg mt-5 hidden w-full lg:flex">Proceed to checkout</button>
          </div>
          <div className="space-y-2.5 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-900/5">
            <p className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-brand-500" /> Pay with MoMo, card or on delivery</p>
            <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-navy-600" /> Delivery to all 16 regions</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Warranty on every laptop</p>
          </div>
        </aside>
      </div>
      {suggestions.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-4">You may also need</h2>
          <ProductRail products={suggestions} />
        </section>
      )}
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <button onClick={() => navigate('/checkout')} className="btn-primary btn-lg w-full">Checkout · {money(subtotal)}</button>
      </div>
    </div>
  );
}
