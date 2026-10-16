export const CONDITIONS = [
  { value: 'new', label: 'Brand New', short: 'New', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { value: 'uk-used', label: 'UK / US Used', short: 'UK Used', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { value: 'refurbished', label: 'Refurbished', short: 'Refurbished', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
];
export const conditionOf = (v) => CONDITIONS.find((c) => c.value === v) || CONDITIONS[0];

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { value: 'confirmed', label: 'Confirmed', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { value: 'processing', label: 'Processing', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  { value: 'shipped', label: 'Out for delivery', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { value: 'delivered', label: 'Delivered', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { value: 'cancelled', label: 'Cancelled', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
];
export const statusOf = (v) => ORDER_STATUSES.find((s) => s.value === v) || ORDER_STATUSES[0];
export const TRACK_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export const PAYMENT_METHODS = {
  paystack: { label: 'Mobile Money / Card', hint: 'MTN MoMo, Telecel Cash, AirtelTigo Money, Visa, Mastercard' },
  momo_manual: { label: 'Send MoMo manually', hint: 'Transfer to our merchant number and we confirm' },
  cod: { label: 'Pay on delivery', hint: 'Cash or MoMo when your order arrives' },
};
export const PAYMENT_STATUSES = {
  pending: { label: 'Awaiting payment', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paid: { label: 'Paid', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Failed', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  refunded: { label: 'Refunded', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

// Admin roles. Permissions are stored on the user doc and enforced by Firestore rules.
export const PERMISSIONS = [
  { key: 'products', label: 'Products & inventory', desc: 'Add, edit, price and stock products; manage categories' },
  { key: 'orders', label: 'Orders', desc: 'View orders, update status and payment' },
  { key: 'customers', label: 'Customers', desc: 'View customer list and history' },
  { key: 'marketing', label: 'Marketing', desc: 'Coupons, banners, homepage content, reviews' },
  { key: 'reports', label: 'Reports', desc: 'Sales dashboard and analytics' },
  { key: 'settings', label: 'Store settings', desc: 'Delivery fees, payments, store info' },
  { key: 'staff', label: 'Staff management', desc: 'Add/remove admins and set their permissions' },
];
export const ALL_PERMS = PERMISSIONS.map((p) => p.key);

export const ROLES = {
  superadmin: { label: 'Owner', perms: ALL_PERMS },
  admin: { label: 'Admin', perms: ['products', 'orders', 'customers', 'marketing', 'reports'] },
  manager: { label: 'Manager', perms: ['products', 'orders', 'customers'] },
  staff: { label: 'Sales staff', perms: ['orders'] },
  customer: { label: 'Customer', perms: [] },
};
export const STAFF_ROLES = ['admin', 'manager', 'staff'];

export const USE_CASES = [
  { key: 'student', label: 'School & Study', emoji: '🎓', desc: 'Light, long battery, great value' },
  { key: 'business', label: 'Work & Business', emoji: '💼', desc: 'Reliable, fast, secure' },
  { key: 'creative', label: 'Design & Editing', emoji: '🎨', desc: 'Sharp screen, strong CPU & RAM' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮', desc: 'Dedicated graphics, high refresh' },
  { key: 'coding', label: 'Programming', emoji: '💻', desc: '16GB+ RAM, fast SSD' },
];

export const SPEC_FIELDS = [
  { key: 'processor', label: 'Processor' },
  { key: 'ram', label: 'RAM' },
  { key: 'storage', label: 'Storage' },
  { key: 'display', label: 'Display' },
  { key: 'graphics', label: 'Graphics' },
  { key: 'os', label: 'Operating system' },
  { key: 'battery', label: 'Battery' },
  { key: 'weight', label: 'Weight' },
  { key: 'ports', label: 'Ports' },
  { key: 'keyboard', label: 'Keyboard' },
];
