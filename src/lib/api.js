import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch, increment,
  runTransaction, arrayUnion, arrayRemove, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { slugify, orderNumber } from './format';
import { DEFAULT_DELIVERY_ZONES } from './ghana';

export { serverTimestamp, Timestamp, onSnapshot, doc, collection, query, where, orderBy, limit };

const withId = (d) => ({ id: d.id, ...d.data() });

/* ---------------------------------------------------------------- settings */

export const DEFAULT_SETTINGS = {
  storeName: 'Gadgets Hub',
  tagline: 'Where Tech Meets Trust',
  phone: '0240000000',
  whatsapp: '0240000000',
  email: 'hello@gadgetshub.com.gh',
  address: 'Circle, Accra',
  gps: '',
  openingHours: 'Mon – Sat, 8:00am – 7:00pm',
  announcement: '🚚 Free delivery in Accra on orders above GH₵5,000 · Pay with MoMo or on delivery',
  freeDeliveryThreshold: 5000,
  deliveryZones: DEFAULT_DELIVERY_ZONES,
  pickupEnabled: true,
  pickupAddress: 'Gadgets Hub Shop, Circle, Accra',
  payments: {
    paystack: true,
    momo_manual: true,
    cod: true,
    codMaxAmount: 15000,
    paystackPublicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    momoNumber: '0240000000',
    momoName: 'Gadgets Hub Enterprise',
    momoNetwork: 'MTN',
  },
  cloudinary: { cloudName: '', uploadPreset: '' },
  social: { facebook: '', instagram: '', tiktok: '', x: '' },
  lowStockThreshold: 3,
  warrantyText: 'All brand-new laptops carry a 1-year warranty. UK-used & refurbished laptops carry a 3-month shop warranty.',
  returnPolicy: '7-day return for factory defects. Item must be in original condition with all accessories.',
};

export const subscribeSettings = (cb) =>
  onSnapshot(doc(db, 'settings', 'store'), (s) => {
    const data = s.exists() ? s.data() : {};
    cb({ ...DEFAULT_SETTINGS, ...data, payments: { ...DEFAULT_SETTINGS.payments, ...(data.payments || {}) } });
  }, () => cb(DEFAULT_SETTINGS));

export const saveSettings = (patch) => setDoc(doc(db, 'settings', 'store'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });

/* ------------------------------------------------------------ home content */

export const DEFAULT_HOME = {
  banners: [],
  flashSale: { enabled: false, title: 'Flash Sale', endsAt: null, productIds: [] },
  featuredBrands: ['HP', 'Dell', 'Lenovo', 'Apple', 'ASUS', 'Acer', 'Microsoft', 'Samsung'],
};

export const subscribeHome = (cb) =>
  onSnapshot(doc(db, 'content', 'home'), (s) => cb({ ...DEFAULT_HOME, ...(s.exists() ? s.data() : {}) }), () => cb(DEFAULT_HOME));

export const saveHome = (patch) => setDoc(doc(db, 'content', 'home'), { ...patch, updatedAt: serverTimestamp() }, { merge: true });

/* ---------------------------------------------------------------- products */

export const fetchActiveProducts = async () =>
  (await getDocs(query(collection(db, 'products'), where('active', '==', true)))).docs.map(withId);

export const fetchAllProducts = async () => (await getDocs(collection(db, 'products'))).docs.map(withId);

export const getProduct = async (id) => {
  const s = await getDoc(doc(db, 'products', id));
  return s.exists() ? withId(s) : null;
};

const buildKeywords = (p) =>
  Array.from(new Set(
    [p.name, p.brand, p.category, p.condition, ...(p.tags || []), p.specs?.processor, p.specs?.ram, p.specs?.storage]
      .filter(Boolean).join(' ').toLowerCase().split(/[\s,/()-]+/).filter((w) => w.length > 1),
  ));

export const saveProduct = async (p) => {
  const data = {
    ...p,
    slug: p.slug || slugify(`${p.name}`),
    price: Number(p.price) || 0,
    compareAtPrice: Number(p.compareAtPrice) || 0,
    costPrice: Number(p.costPrice) || 0,
    stock: Number(p.stock) || 0,
    keywords: buildKeywords(p),
    updatedAt: serverTimestamp(),
  };
  delete data.id;
  if (p.id) {
    await updateDoc(doc(db, 'products', p.id), data);
    return p.id;
  }
  const ref = await addDoc(collection(db, 'products'), {
    rating: 0, reviewCount: 0, soldCount: 0, ...data, createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateProduct = (id, patch) => updateDoc(doc(db, 'products', id), { ...patch, updatedAt: serverTimestamp() });
export const deleteProduct = (id) => deleteDoc(doc(db, 'products', id));

/* -------------------------------------------------------------- categories */

export const fetchCategories = async () =>
  (await getDocs(collection(db, 'categories'))).docs.map(withId).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

export const saveCategory = async (c) => {
  const data = { ...c, slug: c.slug || slugify(c.name), order: Number(c.order) || 0 };
  delete data.id;
  if (c.id) return updateDoc(doc(db, 'categories', c.id), data);
  return setDoc(doc(db, 'categories', data.slug), data);
};
export const deleteCategory = (id) => deleteDoc(doc(db, 'categories', id));

/* ------------------------------------------------------------------ orders */

export const createOrder = async (order) => {
  // The human-friendly order number doubles as the document ID, so customers can
  // track an order with just the number on their receipt.
  const id = orderNumber();
  const ref = doc(db, 'orders', id);
  const batch = writeBatch(db);
  batch.set(ref, {
    ...order,
    orderNumber: id,
    userId: auth.currentUser?.uid || null,
    status: 'pending',
    timeline: [{ status: 'pending', at: Timestamp.now(), note: 'Order placed' }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (order.couponCode) {
    batch.update(doc(db, 'coupons', order.couponCode), { usedCount: increment(1) });
  }
  await batch.commit();
  return id;
};

export const getOrder = async (id) => {
  const s = await getDoc(doc(db, 'orders', id));
  return s.exists() ? withId(s) : null;
};

export const subscribeOrder = (id, cb, onErr) =>
  onSnapshot(doc(db, 'orders', id), (s) => cb(s.exists() ? withId(s) : null), onErr);

/** Customer marks a Paystack payment as completed (rules only allow this exact transition). */
export const attachPayment = (id, reference) =>
  updateDoc(doc(db, 'orders', id), {
    'payment.status': 'paid',
    'payment.reference': reference,
    'payment.paidAt': serverTimestamp(),
  });

export const attachMomoReference = (id, reference) =>
  updateDoc(doc(db, 'orders', id), { 'payment.customerReference': reference });

export const fetchMyOrders = async (uid) =>
  (await getDocs(query(collection(db, 'orders'), where('userId', '==', uid)))).docs
    .map(withId)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

export const cancelMyOrder = (id) =>
  updateDoc(doc(db, 'orders', id), {
    status: 'cancelled',
    timeline: arrayUnion({ status: 'cancelled', at: Timestamp.now(), note: 'Cancelled by customer' }),
    updatedAt: serverTimestamp(),
  });

export const fetchOrders = async ({ since } = {}) => {
  const base = collection(db, 'orders');
  const q = since
    ? query(base, where('createdAt', '>=', Timestamp.fromDate(since)), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'), limit(1000));
  return (await getDocs(q)).docs.map(withId);
};

export const subscribeRecentOrders = (cb, n = 300) =>
  onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(n)), (s) => cb(s.docs.map(withId)));

/**
 * Admin status change. Moving into "confirmed" deducts stock (once);
 * cancelling a confirmed order restores it.
 */
export const setOrderStatus = (orderId, status, note = '') =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, 'orders', orderId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Order not found');
    const o = snap.data();
    const productRefs = (o.items || []).map((i) => doc(db, 'products', i.productId));
    const needsStock = (status !== 'pending' && status !== 'cancelled' && !o.stockDeducted) || (status === 'cancelled' && o.stockDeducted);
    const productSnaps = needsStock ? await Promise.all(productRefs.map((r) => tx.get(r))) : [];
    const patch = {
      status,
      timeline: arrayUnion({ status, at: Timestamp.now(), note, by: auth.currentUser?.email || '' }),
      updatedAt: serverTimestamp(),
    };
    if (needsStock) {
      const dir = status === 'cancelled' ? 1 : -1;
      o.items.forEach((item, i) => {
        if (productSnaps[i]?.exists()) {
          tx.update(productRefs[i], { stock: increment(dir * item.qty), soldCount: increment(-dir * item.qty) });
        }
      });
      patch.stockDeducted = dir === -1;
    }
    if (status === 'delivered' && o.payment?.method === 'cod' && o.payment?.status !== 'paid') {
      patch['payment.status'] = 'paid';
      patch['payment.paidAt'] = serverTimestamp();
    }
    tx.update(ref, patch);
  });

export const updateOrder = (id, patch) => updateDoc(doc(db, 'orders', id), { ...patch, updatedAt: serverTimestamp() });

/* ----------------------------------------------------------------- reviews */

export const fetchProductReviews = async (productId) =>
  (await getDocs(query(collection(db, 'reviews'), where('productId', '==', productId), where('status', '==', 'approved')))).docs
    .map(withId)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

export const addReview = (r) =>
  addDoc(collection(db, 'reviews'), { ...r, userId: auth.currentUser.uid, status: 'pending', createdAt: serverTimestamp() });

export const fetchAllReviews = async () =>
  (await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(500)))).docs.map(withId);

export const recomputeRating = async (productId) => {
  const approved = await fetchProductReviews(productId);
  const count = approved.length;
  const avg = count ? approved.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
  await updateDoc(doc(db, 'products', productId), { rating: Math.round(avg * 10) / 10, reviewCount: count });
};

/** Approve/reject and recompute the product's aggregate rating. */
export const moderateReview = async (review, status) => {
  await updateDoc(doc(db, 'reviews', review.id), { status });
  await recomputeRating(review.productId);
};

export const deleteReview = async (review) => {
  await deleteDoc(doc(db, 'reviews', review.id));
  if (review.status === 'approved') await recomputeRating(review.productId);
};

/* ----------------------------------------------------------------- coupons */

export const getCoupon = async (code) => {
  const s = await getDoc(doc(db, 'coupons', code.trim().toUpperCase()));
  return s.exists() ? withId(s) : null;
};
export const fetchCoupons = async () => (await getDocs(collection(db, 'coupons'))).docs.map(withId);
export const saveCoupon = (c) => {
  const code = c.code.trim().toUpperCase();
  const data = { ...c, code, value: Number(c.value) || 0, minOrder: Number(c.minOrder) || 0, usageLimit: Number(c.usageLimit) || 0 };
  delete data.id;
  return setDoc(doc(db, 'coupons', code), { usedCount: 0, ...data }, { merge: true });
};
export const deleteCoupon = (code) => deleteDoc(doc(db, 'coupons', code));

/** Validate a coupon against a subtotal; returns { coupon, discount } or throws. */
export const evaluateCoupon = (coupon, subtotal) => {
  if (!coupon || !coupon.active) throw new Error('This code is not valid');
  const exp = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : coupon.expiresAt ? new Date(coupon.expiresAt) : null;
  if (exp && exp < new Date()) throw new Error('This code has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new Error('This code has been fully used');
  if (coupon.minOrder && subtotal < coupon.minOrder) throw new Error(`Spend at least GH₵${coupon.minOrder.toLocaleString()} to use this code`);
  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(Math.round(capped * 100) / 100, subtotal);
};

/* ------------------------------------------------------------------- users */

export const subscribeUser = (uid, cb) => onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? withId(s) : null), () => cb(null));

export const ensureUserDoc = async (user, extra = {}) => {
  const ref = doc(db, 'users', user.uid);
  const s = await getDoc(ref);
  if (!s.exists()) {
    await setDoc(ref, {
      name: extra.name || user.displayName || '',
      email: user.email || '',
      phone: extra.phone || '',
      role: 'customer',
      permissions: [],
      addresses: [],
      wishlist: extra.wishlist || [],
      createdAt: serverTimestamp(),
    });
  }
};

export const updateMe = (uid, patch) => updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
export const wishlistAdd = (uid, id) => updateDoc(doc(db, 'users', uid), { wishlist: arrayUnion(id) });
export const wishlistRemove = (uid, id) => updateDoc(doc(db, 'users', uid), { wishlist: arrayRemove(id) });

export const fetchUsers = async () =>
  (await getDocs(collection(db, 'users'))).docs.map(withId)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

export const updateUser = (uid, patch) => updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });

/* ------------------------------------------------- owner bootstrap (first run) */

export const ownerExists = async () => (await getDoc(doc(db, 'meta', 'owner'))).exists();

export const claimOwnership = async (user, name) => {
  const batch = writeBatch(db);
  batch.set(doc(db, 'meta', 'owner'), { uid: user.uid, email: user.email, claimedAt: serverTimestamp() });
  batch.set(doc(db, 'users', user.uid), {
    name: name || user.displayName || 'Owner', email: user.email, phone: '',
    role: 'superadmin', permissions: [], addresses: [], wishlist: [], createdAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
};

/* ---------------------------------------------------------------- activity */

export const logActivity = (action, detail = '') =>
  addDoc(collection(db, 'activity'), {
    action, detail, uid: auth.currentUser?.uid || null, email: auth.currentUser?.email || '', at: serverTimestamp(),
  }).catch(() => {});

export const fetchActivity = async (n = 200) =>
  (await getDocs(query(collection(db, 'activity'), orderBy('at', 'desc'), limit(n)))).docs.map(withId);

/* ---------------------------------------------------------- stock alerts */

export const requestRestockAlert = (productId, contact) =>
  addDoc(collection(db, 'restockAlerts'), { productId, contact, createdAt: serverTimestamp() });

export const fetchRestockAlerts = async () => (await getDocs(collection(db, 'restockAlerts'))).docs.map(withId);
export const deleteRestockAlert = (id) => deleteDoc(doc(db, 'restockAlerts', id));
