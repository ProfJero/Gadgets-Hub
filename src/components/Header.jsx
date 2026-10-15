import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, Phone, LayoutDashboard, Search, Truck, ShieldCheck, Smartphone } from 'lucide-react';
import { useCart, useUI } from '../store';
import { useAuth, useWishlistIds } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { formatPhone } from '../lib/ghana';
import SearchBox from './SearchBox';
import { cx, Drawer } from './ui';

export function Logo({ className = 'h-10' }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Gadgets Hub home">
      <img src="/icon.png" alt="" width="48" height="48" className={cx('aspect-square w-auto', className)} />
      <span className="leading-none">
        <span className="block font-display text-xl font-bold tracking-wide text-ink">GADGETS <span className="text-brand-500">HUB</span></span>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[.2em] text-navy-600 sm:block">Where tech meets trust</span>
      </span>
    </Link>
  );
}

function CountBadge({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function Header() {
  const { settings, categories } = useStore();
  const { user, isStaff, profile } = useAuth();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wish = useWishlistIds().length;
  const openCart = useUI((s) => s.openCart);
  const [menu, setMenu] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  useEffect(() => { setMenu(false); setMobileSearch(false); }, [pathname]);

  const navCats = categories.filter((c) => !c.hidden).slice(0, 7);

  return (
    <>
      {settings.announcement && (
        <div className="bg-navy-900 text-white">
          <div className="container-x flex h-9 items-center justify-between gap-4 text-xs sm:text-[13px]">
            <p className="truncate font-medium">{settings.announcement}</p>
            <div className="hidden shrink-0 items-center gap-5 md:flex">
              <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 hover:text-brand-300"><Phone className="h-3.5 w-3.5" /> {formatPhone(settings.phone)}</a>
              <Link to="/track" className="flex items-center gap-1.5 hover:text-brand-300"><Truck className="h-3.5 w-3.5" /> Track order</Link>
            </div>
          </div>
        </div>
      )}
      <header className={cx('sticky top-0 z-40 bg-white/95 backdrop-blur transition-shadow', scrolled && 'shadow-card')}>
        <div className="container-x flex h-16 items-center gap-3 lg:h-20 lg:gap-8">
          <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <Logo className="h-10 lg:h-12" />
          <SearchBox className="hidden max-w-2xl flex-1 lg:block" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button className="btn-ghost p-2 lg:hidden" onClick={() => setMobileSearch((v) => !v)} aria-label="Search"><Search className="h-6 w-6" /></button>
            {isStaff && (
              <Link to="/admin" className="btn-outline hidden px-3 lg:inline-flex"><LayoutDashboard className="h-4 w-4" /> Admin</Link>
            )}
            <Link to={user ? '/account' : '/login'} className="btn-ghost hidden gap-2 p-2 lg:inline-flex">
              <User className="h-6 w-6" />
              <span className="text-left text-xs leading-tight">
                <span className="block text-ink-muted">{user ? 'Hello,' : 'Sign in'}</span>
                <span className="block font-bold text-ink">{user ? (profile?.name || 'Account').split(' ')[0] : 'Account'}</span>
              </span>
            </Link>
            <Link to="/wishlist" className="btn-ghost relative hidden p-2 sm:inline-flex" aria-label="Wishlist">
              <Heart className="h-6 w-6" /><CountBadge n={wish} />
            </Link>
            <button onClick={openCart} className="btn-ghost relative p-2" aria-label="Cart">
              <ShoppingCart className="h-6 w-6" /><CountBadge n={count} />
            </button>
          </div>
        </div>
        {mobileSearch && (
          <div className="container-x pb-3 lg:hidden"><SearchBox autoFocus onDone={() => setMobileSearch(false)} /></div>
        )}
        <nav className="hidden border-t border-slate-100 lg:block">
          <div className="container-x flex h-12 items-center gap-1 text-sm font-semibold">
            <NavLink to="/shop" end className={({ isActive }) => cx('rounded-lg px-3 py-2 hover:bg-slate-100', isActive && 'text-brand-600')}>All products</NavLink>
            {navCats.map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => cx('rounded-lg px-3 py-2 hover:bg-slate-100', isActive && 'text-brand-600')}>{c.name}</NavLink>
            ))}
            <NavLink to="/deals" className="rounded-lg px-3 py-2 text-brand-600 hover:bg-brand-50">🔥 Deals</NavLink>
            <NavLink to="/finder" className="rounded-lg px-3 py-2 hover:bg-slate-100">Laptop finder</NavLink>
            <div className="ml-auto flex items-center gap-4 text-xs font-medium text-ink-muted">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Genuine & warrantied</span>
              <span className="flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-brand-500" /> Pay with MoMo</span>
            </div>
          </div>
        </nav>
      </header>

      <Drawer open={menu} onClose={() => setMenu(false)} title={<Logo className="h-9" />} side="left" width="max-w-xs">
        <div className="p-3">
          {user ? (
            <Link to="/account" className="mb-3 flex items-center gap-3 rounded-2xl bg-navy-50 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-700 font-bold text-white">{(profile?.name || user.email || '?')[0].toUpperCase()}</span>
              <span><span className="block text-sm font-bold">{profile?.name || 'My account'}</span><span className="text-xs text-ink-muted">View orders & profile</span></span>
            </Link>
          ) : (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Link to="/login" className="btn-navy">Sign in</Link>
              <Link to="/register" className="btn-outline">Register</Link>
            </div>
          )}
          {isStaff && <Link to="/admin" className="btn-outline mb-3 w-full"><LayoutDashboard className="h-4 w-4" /> Admin dashboard</Link>}
          <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Shop</p>
          <Link to="/shop" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">All products</Link>
          {categories.filter((c) => !c.hidden).map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">{c.name}</Link>
          ))}
          <Link to="/deals" className="block rounded-xl px-3 py-2.5 font-medium text-brand-600 hover:bg-slate-50">🔥 Deals</Link>
          <Link to="/finder" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">✨ Laptop finder</Link>
          <Link to="/compare" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">Compare laptops</Link>
          <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Help</p>
          <Link to="/track" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">Track my order</Link>
          <Link to="/help" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">Help & FAQs</Link>
          <Link to="/contact" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-slate-50">Contact us</Link>
        </div>
      </Drawer>
    </>
  );
}
