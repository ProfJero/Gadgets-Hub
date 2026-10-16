import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Truck, ShieldCheck } from 'lucide-react';
import { useCart, useUI } from '../store';
import { useStore } from '../context/StoreContext';
import { money } from '../lib/format';
import { Drawer, Img, QtyStepper, Empty } from './ui';

export default function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const { items, setQty, remove } = useCart();
  const { settings } = useStore();
  const navigate = useNavigate();
  const subtotal = items.reduce((n, i) => n + i.qty * i.price, 0);
  const threshold = Number(settings.freeDeliveryThreshold) || 0;
  const left = Math.max(0, threshold - subtotal);
  const pct = threshold ? Math.min(100, (subtotal / threshold) * 100) : 0;
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={`Your cart${count ? ` (${count})` : ''}`}
      footer={items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">Subtotal</span>
            <span className="text-xl font-extrabold">{money(subtotal)}</span>
          </div>
          <p className="text-xs text-ink-muted">Delivery fee is calculated at checkout based on your region.</p>
          <button onClick={() => { close(); navigate('/checkout'); }} className="btn-primary btn-lg w-full">Checkout · {money(subtotal)}</button>
          <Link to="/cart" onClick={close} className="btn-outline w-full">View full cart</Link>
        </div>
      )}
    >
      {items.length === 0 ? (
        <Empty
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Browse genuine laptops and accessories with warranty and fast delivery across Ghana."
          action={<Link to="/shop" onClick={close} className="btn-primary">Start shopping</Link>}
        />
      ) : (
        <div>
          {threshold > 0 && (
            <div className="border-b border-slate-100 bg-emerald-50/60 px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Truck className="h-4 w-4" />
                {left > 0 ? <>Add <b>{money(left)}</b> more for free delivery in Accra</> : <>You've unlocked <b>free delivery</b> in Accra 🎉</>}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 px-5 py-4">
                <Link to={`/product/${i.slug || i.id}`} onClick={close} className="shrink-0">
                  <Img src={i.image} w={160} h={160} fit="contain" className="h-20 w-20 rounded-xl bg-white ring-1 ring-slate-100" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${i.slug || i.id}`} onClick={close} className="line-clamp-2 text-sm font-semibold">{i.name}</Link>
                  <div className="mt-0.5 font-bold">{money(i.price)}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <QtyStepper size="sm" value={i.qty} max={i.stock || 99} onChange={(q) => setQty(i.id, q)} />
                    <button onClick={() => remove(i.id)} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-ink-soft">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /> Secure checkout · Mobile Money, card or pay on delivery
          </div>
        </div>
      )}
    </Drawer>
  );
}
