import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import CartDrawer from './components/CartDrawer';
import WhatsAppFab from './components/WhatsAppFab';
import { Toaster, PageLoader } from './components/ui';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Shop from './pages/Shop';

const Product = lazy(() => import('./pages/Product'));
const Categories = lazy(() => import('./pages/Categories'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderView = lazy(() => import('./pages/OrderView'));
const Track = lazy(() => import('./pages/Track'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Compare = lazy(() => import('./pages/Compare'));
const Finder = lazy(() => import('./pages/Finder'));
const Auth = lazy(() => import('./pages/Auth'));
const Account = lazy(() => import('./pages/account/Account'));
const Help = lazy(() => import('./pages/Help'));
const Contact = lazy(() => import('./pages/Contact'));
const Setup = lazy(() => import('./pages/Setup'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
      </main>
      <Footer />
      <MobileNav />
      <CartDrawer />
      <WhatsAppFab />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading && user !== null) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<PageLoader />}><AdminApp /></Suspense>} />
        <Route element={<ShopLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="category/:slug" element={<Shop />} />
          <Route path="brand/:brand" element={<Shop />} />
          <Route path="deals" element={<Shop deals />} />
          <Route path="categories" element={<Categories />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:id" element={<OrderView />} />
          <Route path="track" element={<Track />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="compare" element={<Compare />} />
          <Route path="finder" element={<Finder />} />
          <Route path="login" element={<Auth mode="login" />} />
          <Route path="register" element={<Auth mode="register" />} />
          <Route path="forgot" element={<Auth mode="forgot" />} />
          <Route path="account/*" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="help" element={<Help />} />
          <Route path="contact" element={<Contact />} />
          <Route path="setup" element={<Setup />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
