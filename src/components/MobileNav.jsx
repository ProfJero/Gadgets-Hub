import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart, useUI } from '../store';
import { useAuth } from '../context/AuthContext';
import { cx } from './ui';

export default function MobileNav() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const openCart = useUI((s) => s.openCart);
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (pathname.startsWith('/checkout')) return null;
  const item = ({ isActive }) => cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand-600' : 'text-ink-muted');
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur lg:hidden">
      <div className="flex">
        <NavLink to="/" end className={item}><Home className="h-6 w-6" />Home</NavLink>
        <NavLink to="/categories" className={item}><LayoutGrid className="h-6 w-6" />Categories</NavLink>
        <button onClick={openCart} className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-ink-muted">
          <span className="relative">
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">{count}</span>}
          </span>
          Cart
        </button>
        <NavLink to="/wishlist" className={item}><Heart className="h-6 w-6" />Saved</NavLink>
        <NavLink to={user ? '/account' : '/login'} className={item}><User className="h-6 w-6" />{user ? 'Account' : 'Sign in'}</NavLink>
      </div>
    </nav>
  );
}
