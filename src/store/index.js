import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const lineFrom = (p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  brand: p.brand || '',
  image: p.images?.[0]?.url || '',
  price: p.price,
  condition: p.condition,
  stock: p.stock,
});

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      add: (p, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === p.id);
          const max = Math.max(1, p.stock ?? 99);
          if (existing) {
            return { items: s.items.map((i) => (i.id === p.id ? { ...i, ...lineFrom(p), qty: Math.min(max, i.qty + qty) } : i)) };
          }
          return { items: [...s.items, { ...lineFrom(p), qty: Math.min(max, qty) }] };
        }),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.id === id ? { ...i, qty: Math.max(0, Math.min(qty, i.stock ?? 99)) } : i))
            .filter((i) => i.qty > 0),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      /** Refresh prices/stock from the live catalogue. Returns list of changes. */
      sync: (products) => {
        const changes = [];
        const byId = Object.fromEntries(products.map((p) => [p.id, p]));
        const items = get().items.flatMap((i) => {
          const p = byId[i.id];
          if (!p || p.stock <= 0) { changes.push(`${i.name} is no longer available`); return []; }
          const next = { ...i, ...lineFrom(p), qty: Math.min(i.qty, p.stock) };
          if (p.price !== i.price) changes.push(`${i.name} price updated`);
          if (next.qty !== i.qty) changes.push(`${i.name} quantity reduced to ${next.qty} (stock)`);
          return [next];
        });
        set({ items });
        return changes;
      },
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.qty * i.price, 0),
    }),
    { name: 'gh-cart' },
  ),
);

export const useCompare = create(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => (s.ids.includes(id) ? { ids: s.ids.filter((x) => x !== id) } : { ids: [...s.ids, id].slice(-4) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'gh-compare' },
  ),
);

export const useRecent = create(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 12) })),
    }),
    { name: 'gh-recent' },
  ),
);

export const useGuestWishlist = create(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'gh-wishlist' },
  ),
);

export const usePrefs = create(
  persist(
    (set) => ({
      dataSaver: false,
      checkout: {}, // remembered contact + delivery details
      recentSearches: [],
      setDataSaver: (v) => set({ dataSaver: v }),
      saveCheckout: (c) => set({ checkout: c }),
      pushSearch: (q) => set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 6) })),
      clearSearches: () => set({ recentSearches: [] }),
    }),
    { name: 'gh-prefs' },
  ),
);

// Transient UI state (not persisted)
export const useUI = create((set) => ({
  cartOpen: false,
  menuOpen: false,
  searchOpen: false,
  toasts: [],
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  setMenu: (v) => set({ menuOpen: v }),
  setSearch: (v) => set({ searchOpen: v }),
  toast: (message, type = 'success', action) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (...args) => useUI.getState().toast(...args);
