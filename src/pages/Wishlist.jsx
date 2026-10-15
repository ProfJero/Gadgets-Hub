import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth, useWishlistIds } from '../context/AuthContext';
import { ProductGrid } from '../components/ProductCard';
import { Empty } from '../components/ui';

export default function Wishlist() {
  const ids = useWishlistIds();
  const { byId } = useStore();
  const { user } = useAuth();
  const items = ids.map((id) => byId[id]).filter(Boolean);
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-3xl font-bold">Saved items</h1>
      {!user && items.length > 0 && <p className="mt-1 text-sm text-ink-muted"><Link to="/login?next=/wishlist" className="link">Sign in</Link> to keep your saved items on all your devices.</p>}
      {items.length ? <ProductGrid products={items} className="mt-5" /> : (
        <Empty icon={Heart} title="No saved items yet" text="Tap the heart on any product to save it for later." action={<Link to="/shop" className="btn-primary">Browse products</Link>} />
      )}
    </div>
  );
}
