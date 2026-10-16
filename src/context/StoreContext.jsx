import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchActiveProducts, fetchCategories, subscribeHome, subscribeSettings, DEFAULT_SETTINGS, DEFAULT_HOME } from '../lib/api';
import { configureCloudinary } from '../lib/cloudinary';

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [home, setHome] = useState(DEFAULT_HOME);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => subscribeSettings((s) => { setSettings(s); configureCloudinary(s.cloudinary); }), []);
  useEffect(() => subscribeHome(setHome), []);

  const refresh = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([fetchActiveProducts(), fetchCategories()]);
      setProducts(p);
      setCategories(c);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
    const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();
    return { settings, home, products, categories, brands, byId, bySlug, loading, error, refresh };
  }, [settings, home, products, categories, loading, error, refresh]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
