import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, FolderTree, Users, Star, TicketPercent, Image, UserCog,
  Settings, History, Menu, X, ExternalLink, LogOut, Boxes, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../lib/constants';
import { PageLoader, Toaster, cx } from '../components/ui';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Products = lazy(() => import('./pages/Products'));
const ProductEditor = lazy(() => import('./pages/ProductEditor'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Content = lazy(() => import('./pages/Content'));
const Staff = lazy(() => import('./pages/Staff'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Activity = lazy(() => import('./pages/Activity'));

export const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: null },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, perm: 'orders' },
  { to: '/admin/products', label: 'Products', icon: Package, perm: 'products' },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, perm: 'products' },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes, perm: 'products' },
  { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'customers' },
  { to: '/admin/reviews', label: 'Reviews', icon: Star, perm: 'marketing' },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, perm: 'marketing' },
  { to: '/admin/content', label: 'Homepage', icon: Image, perm: 'marketing' },
  { to: '/admin/staff', label: 'Staff & roles', icon: UserCog, perm: 'staff' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, perm: 'settings' },
  { to: '/admin/activity', label: 'Activity log', icon: History, perm: 'staff' },
];

function Guard({ perm, children }) {
  const { can } = useAuth();
  if (perm && !can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h2 className="mt-3 text-lg font-bold">You don't have access to this section</h2>
        <p className="text-sm text-ink-muted">Ask the store owner to grant the “{perm}” permission.</p>
      </div>
    );
  }
  return children;
}

function Sidebar({ onNavigate }) {
  const { can, profile, role, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-2 px-5 py-5" onClick={onNavigate}>
        <img src="/icon.png" alt="" className="h-9 w-9 rounded-lg bg-white" />
        <span className="leading-tight">
          <span className="block font-display text-lg font-bold tracking-wide text-white">GADGETS <span className="text-brand-400">HUB</span></span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Admin</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.filter((n) => !n.perm || can(n.perm) || (n.to === '/admin' && true)).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
            <Icon className="h-[18px] w-[18px]" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white"><ExternalLink className="h-[18px] w-[18px]" /> View store</Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 font-bold text-white">{(profile?.name || '?')[0]?.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{profile?.name}</div>
            <div className="text-xs text-slate-400">{ROLES[role]?.label}</div>
          </div>
          <button onClick={logout} className="p-1.5 text-slate-400 hover:text-white" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const { user, loading, isStaff, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { document.title = 'Admin · Gadgets Hub'; }, []);

  if (user === undefined || (user && loading)) return <PageLoader />;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-14 w-14 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold">Admin access only</h1>
        <p className="mt-1 max-w-sm text-ink-muted">
          {profile?.disabled ? 'Your staff account has been disabled.' : `${user.email} is not a staff account.`} If you're setting up the store for the first time, visit <Link to="/setup" className="link">/setup</Link>.
        </p>
        <Link to="/" className="btn-primary mt-6">Back to store</Link>
      </div>
    );
  }

  const current = NAV.slice().reverse().find((n) => pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-navy-950 lg:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-in bg-navy-950"><Sidebar onNavigate={() => setOpen(false)} /></aside>
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white p-2"><X className="h-5 w-5" /></button>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="-ml-2 p-2" aria-label="Menu"><Menu className="h-6 w-6" /></button>
          <span className="font-bold">{current?.label || 'Admin'}</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Guard perm="orders"><Orders /></Guard>} />
              <Route path="orders/:id" element={<Guard perm="orders"><OrderDetail /></Guard>} />
              <Route path="products" element={<Guard perm="products"><Products /></Guard>} />
              <Route path="products/new" element={<Guard perm="products"><ProductEditor /></Guard>} />
              <Route path="products/:id" element={<Guard perm="products"><ProductEditor /></Guard>} />
              <Route path="categories" element={<Guard perm="products"><Categories /></Guard>} />
              <Route path="inventory" element={<Guard perm="products"><Inventory /></Guard>} />
              <Route path="customers" element={<Guard perm="customers"><Customers /></Guard>} />
              <Route path="reviews" element={<Guard perm="marketing"><Reviews /></Guard>} />
              <Route path="coupons" element={<Guard perm="marketing"><Coupons /></Guard>} />
              <Route path="content" element={<Guard perm="marketing"><Content /></Guard>} />
              <Route path="staff" element={<Guard perm="staff"><Staff /></Guard>} />
              <Route path="settings" element={<Guard perm="settings"><SettingsPage /></Guard>} />
              <Route path="activity" element={<Guard perm="staff"><Activity /></Guard>} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
