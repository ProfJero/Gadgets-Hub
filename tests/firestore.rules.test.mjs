import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, writeBatch, increment, Timestamp, deleteDoc } from 'firebase/firestore';

// Run with: npm run test:rules (starts the Firestore emulator automatically)
const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const env = await initializeTestEnvironment({
  projectId: 'demo-gh',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});
await env.clearFirestore();
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('ok  ', name); } catch (e) { fail++; console.log('FAIL', name, e.message.slice(0, 200)); } };

await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, 'users/owner'), { role: 'superadmin', permissions: [], email: 'o@x.com' });
  await setDoc(doc(db, 'meta/owner'), { uid: 'owner' });
  await setDoc(doc(db, 'users/mgr'), { role: 'manager', permissions: ['products', 'orders'], email: 'm@x.com' });
  await setDoc(doc(db, 'users/sales'), { role: 'staff', permissions: ['orders'], email: 's@x.com' });
  await setDoc(doc(db, 'users/susp'), { role: 'admin', permissions: ['products'], disabled: true });
  await setDoc(doc(db, 'users/cust'), { role: 'customer', permissions: [], email: 'c@x.com', wishlist: [] });
  await setDoc(doc(db, 'products/p1'), { name: 'A', active: true, price: 100, stock: 5 });
  await setDoc(doc(db, 'products/p2'), { name: 'B', active: false, price: 100, stock: 5 });
  await setDoc(doc(db, 'coupons/SAVE10'), { code: 'SAVE10', active: true, usedCount: 0, type: 'percent', value: 10 });
  await setDoc(doc(db, 'orders/GH-EXIST'), { userId: 'cust', status: 'pending', total: 100, items: [{ productId: 'p1', qty: 1 }], payment: { method: 'paystack', status: 'pending' } });
});

const anon = env.unauthenticatedContext().firestore();
const cust = env.authenticatedContext('cust').firestore();
const other = env.authenticatedContext('other').firestore();
const mgr = env.authenticatedContext('mgr').firestore();
const sales = env.authenticatedContext('sales').firestore();
const susp = env.authenticatedContext('susp').firestore();
const owner = env.authenticatedContext('owner').firestore();

const order = (userId) => ({ userId, status: 'pending', total: 100, items: [{ productId: 'p1', qty: 1, price: 100 }], payment: { method: 'cod', status: 'pending' }, customer: { name: 'K', phone: '0241234567' } });

// catalogue
await t('anon reads active product', () => assertSucceeds(getDoc(doc(anon, 'products/p1'))));
await t('anon cannot read hidden product', () => assertFails(getDoc(doc(anon, 'products/p2'))));
await t('anon lists active products via query', () => assertSucceeds(getDocs(query(collection(anon, 'products'), where('active', '==', true)))));
await t('anon cannot list all products', () => assertFails(getDocs(collection(anon, 'products'))));
await t('staff lists all products', () => assertSucceeds(getDocs(collection(sales, 'products'))));
await t('customer cannot edit product', () => assertFails(updateDoc(doc(cust, 'products/p1'), { price: 1 })));
await t('manager edits product', () => assertSucceeds(updateDoc(doc(mgr, 'products/p1'), { price: 120 })));
await t('sales (orders) can change stock only', () => assertSucceeds(updateDoc(doc(sales, 'products/p1'), { stock: 4, soldCount: 1 })));
await t('sales cannot change price', () => assertFails(updateDoc(doc(sales, 'products/p1'), { price: 1 })));
await t('suspended admin cannot edit', () => assertFails(updateDoc(doc(susp, 'products/p1'), { price: 1 })));

// orders
await t('guest creates order', () => assertSucceeds(setDoc(doc(anon, 'orders/GH-G1'), order(null))));
await t('guest cannot spoof userId', () => assertFails(setDoc(doc(anon, 'orders/GH-G2'), order('cust'))));
await t('customer creates own order', () => assertSucceeds(setDoc(doc(cust, 'orders/GH-C1'), order('cust'))));
await t('cannot create pre-paid order', () => assertFails(setDoc(doc(cust, 'orders/GH-C2'), { ...order('cust'), payment: { method: 'cod', status: 'paid' } })));
await t('cannot create confirmed order', () => assertFails(setDoc(doc(cust, 'orders/GH-C3'), { ...order('cust'), status: 'confirmed' })));
await t('cannot overwrite existing order', () => assertFails(setDoc(doc(anon, 'orders/GH-EXIST'), order(null))));
await t('anyone gets order by id', () => assertSucceeds(getDoc(doc(anon, 'orders/GH-EXIST'))));
await t('anon cannot list orders', () => assertFails(getDocs(collection(anon, 'orders'))));
await t('customer lists own orders', () => assertSucceeds(getDocs(query(collection(cust, 'orders'), where('userId', '==', 'cust')))));
await t('other user cannot list cust orders', () => assertFails(getDocs(query(collection(other, 'orders'), where('userId', '==', 'cust')))));
await t('staff lists orders', () => assertSucceeds(getDocs(collection(sales, 'orders'))));
await t('customer marks paystack paid', () => assertSucceeds(updateDoc(doc(anon, 'orders/GH-EXIST'), { 'payment.status': 'paid', 'payment.reference': 'r1' })));
await t('customer cannot change status to delivered', () => assertFails(updateDoc(doc(cust, 'orders/GH-EXIST'), { status: 'delivered' })));
await t('customer cannot change total', () => assertFails(updateDoc(doc(cust, 'orders/GH-EXIST'), { total: 1 })));
await t('customer cancels own pending order', () => assertSucceeds(updateDoc(doc(cust, 'orders/GH-C1'), { status: 'cancelled', timeline: [], updatedAt: Timestamp.now() })));
await t('guest cannot cancel', () => assertFails(updateDoc(doc(anon, 'orders/GH-G1'), { status: 'cancelled', timeline: [], updatedAt: Timestamp.now() })));
await t('cod order cannot be self-marked paid', () => assertFails(updateDoc(doc(anon, 'orders/GH-G1'), { 'payment.status': 'paid' })));
await t('guest adds momo reference', () => assertSucceeds(updateDoc(doc(anon, 'orders/GH-G1'), { 'payment.customerReference': 'TX123' })));
await t('staff updates order status', () => assertSucceeds(updateDoc(doc(sales, 'orders/GH-G1'), { status: 'confirmed' })));
await t('only owner deletes orders', async () => { await assertFails(deleteDoc(doc(mgr, 'orders/GH-G1'))); await assertSucceeds(deleteDoc(doc(owner, 'orders/GH-G1'))); });

// coupons
await t('order + coupon increment in batch', async () => {
  const b = writeBatch(cust);
  b.set(doc(cust, 'orders/GH-C9'), { ...order('cust'), couponCode: 'SAVE10' });
  b.update(doc(cust, 'coupons/SAVE10'), { usedCount: increment(1) });
  await assertSucceeds(b.commit());
});
await t('cannot reset coupon usage', () => assertFails(updateDoc(doc(cust, 'coupons/SAVE10'), { usedCount: 0 })));
await t('cannot list coupons', () => assertFails(getDocs(collection(cust, 'coupons'))));
await t('can get coupon by code', () => assertSucceeds(getDoc(doc(anon, 'coupons/SAVE10'))));

// users
await t('customer creates own customer profile', () => assertSucceeds(setDoc(doc(other, 'users/other'), { role: 'customer', permissions: [], email: 'z@x.com' })));
await t('cannot self-create as admin', () => assertFails(setDoc(doc(env.authenticatedContext('evil').firestore(), 'users/evil'), { role: 'admin', permissions: ['staff'] })));
await t('cannot self-promote', () => assertFails(updateDoc(doc(cust, 'users/cust'), { role: 'admin' })));
await t('cannot self-grant permissions', () => assertFails(updateDoc(doc(cust, 'users/cust'), { permissions: ['orders'] })));
await t('customer edits own name/wishlist', () => assertSucceeds(updateDoc(doc(cust, 'users/cust'), { name: 'Ama', wishlist: ['p1'] })));
await t('customer cannot read others', () => assertFails(getDoc(doc(cust, 'users/mgr'))));
await t('manager (no staff perm) cannot promote', () => assertFails(updateDoc(doc(mgr, 'users/cust'), { role: 'admin', permissions: ['products'] })));
await t('owner promotes customer to manager', () => assertSucceeds(updateDoc(doc(owner, 'users/cust'), { role: 'manager', permissions: ['products'] })));
await t('owner creates staff doc for new uid', () => assertSucceeds(setDoc(doc(owner, 'users/newstaff'), { role: 'staff', permissions: ['orders'] })));
await t('nobody can mint a second owner', () => assertFails(setDoc(doc(owner, 'users/x2'), { role: 'superadmin', permissions: [] })));
await t('owner cannot demote self', () => assertFails(updateDoc(doc(owner, 'users/owner'), { role: 'customer' })));
await t('cannot claim ownership again', async () => {
  const evil = env.authenticatedContext('evil').firestore();
  const b = writeBatch(evil);
  b.set(doc(evil, 'meta/owner'), { uid: 'evil' });
  b.set(doc(evil, 'users/evil'), { role: 'superadmin', permissions: [] });
  await assertFails(b.commit());
});

// reviews
await t('signed-in user submits pending review', () => assertSucceeds(setDoc(doc(other, 'reviews/r1'), { userId: 'other', status: 'pending', rating: 5, comment: 'Great laptop', productId: 'p1' })));
await t('cannot submit pre-approved review', () => assertFails(setDoc(doc(other, 'reviews/r2'), { userId: 'other', status: 'approved', rating: 5, comment: 'x', productId: 'p1' })));
await t('anon cannot read pending review', () => assertFails(getDoc(doc(anon, 'reviews/r1'))));

// settings
await t('anyone reads settings', () => assertSucceeds(getDoc(doc(anon, 'settings/store'))));
await t('manager cannot change settings', () => assertFails(setDoc(doc(mgr, 'settings/store'), { storeName: 'x' })));
await t('owner changes settings', () => assertSucceeds(setDoc(doc(owner, 'settings/store'), { storeName: 'x' })));
await t('restock alert by anon', () => assertSucceeds(setDoc(doc(anon, 'restockAlerts/a1'), { productId: 'p1', contact: '0241234567', createdAt: Timestamp.now() })));

// first-run ownership claim on a fresh project
const env2 = await initializeTestEnvironment({ projectId: 'demo-gh2', firestore: { rules: RULES, host: '127.0.0.1', port: 8080 } });
await env2.clearFirestore();
const first = env2.authenticatedContext('first').firestore();
const second = env2.authenticatedContext('second').firestore();
await setDoc(doc(first, 'users/first'), { role: 'customer', permissions: [] });
await setDoc(doc(second, 'users/second'), { role: 'customer', permissions: [] });
const claim = (db, uid) => { const b = writeBatch(db); b.set(doc(db, 'meta/owner'), { uid }); b.set(doc(db, `users/${uid}`), { role: 'superadmin', permissions: [] }, { merge: true }); return b.commit(); };
await t('cannot claim with someone else\'s uid', () => assertFails((() => { const b = writeBatch(second); b.set(doc(second, 'meta/owner'), { uid: 'first' }); return b.commit(); })()));
await t('cannot self-promote without meta claim', () => assertFails(updateDoc(doc(first, 'users/first'), { role: 'superadmin' })));
await t('first user claims ownership', () => assertSucceeds(claim(first, 'first')));
await t('second user cannot claim after', () => assertFails(claim(second, 'second')));
await env2.cleanup();

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
