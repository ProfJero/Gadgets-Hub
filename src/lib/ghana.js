// Ghana-specific data and helpers.

export const REGIONS = [
  'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Western North',
  'Volta', 'Oti', 'Northern', 'Savannah', 'North East', 'Upper East',
  'Upper West', 'Bono', 'Bono East', 'Ahafo',
];

export const DEFAULT_DELIVERY_ZONES = [
  { region: 'Greater Accra', fee: 40, eta: 'Same day / next day' },
  { region: 'Ashanti', fee: 60, eta: '1–2 days' },
  { region: 'Central', fee: 60, eta: '1–2 days' },
  { region: 'Eastern', fee: 60, eta: '1–2 days' },
  { region: 'Western', fee: 70, eta: '2–3 days' },
  { region: 'Western North', fee: 80, eta: '2–4 days' },
  { region: 'Volta', fee: 70, eta: '2–3 days' },
  { region: 'Oti', fee: 90, eta: '3–4 days' },
  { region: 'Northern', fee: 90, eta: '2–4 days' },
  { region: 'Savannah', fee: 100, eta: '3–5 days' },
  { region: 'North East', fee: 100, eta: '3–5 days' },
  { region: 'Upper East', fee: 100, eta: '3–5 days' },
  { region: 'Upper West', fee: 100, eta: '3–5 days' },
  { region: 'Bono', fee: 80, eta: '2–3 days' },
  { region: 'Bono East', fee: 80, eta: '2–3 days' },
  { region: 'Ahafo', fee: 80, eta: '2–3 days' },
];

const NETWORK_PREFIXES = {
  MTN: ['024', '025', '053', '054', '055', '059'],
  Telecel: ['020', '050'],
  AirtelTigo: ['026', '027', '056', '057'],
};

/** Normalise a Ghana number to local 10-digit form (0XXXXXXXXX). */
export const normalizePhone = (raw = '') => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('233')) d = '0' + d.slice(3);
  if (d.length === 9 && !d.startsWith('0')) d = '0' + d;
  return d;
};

export const isValidGhPhone = (raw) => /^0[2-5]\d{8}$/.test(normalizePhone(raw));

export const detectNetwork = (raw) => {
  const p = normalizePhone(raw).slice(0, 3);
  for (const [net, list] of Object.entries(NETWORK_PREFIXES)) if (list.includes(p)) return net;
  return null;
};

export const toIntl = (raw) => {
  const n = normalizePhone(raw);
  return n ? '233' + n.slice(1) : '';
};

export const formatPhone = (raw) => {
  const n = normalizePhone(raw);
  return n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : raw;
};

/** GhanaPost GPS digital address, e.g. GA-123-4567 or AK-0039-5028 */
export const isValidGhanaPostGPS = (s = '') => /^[A-Z]{2}-?\d{3,4}-?\d{3,4}$/i.test(s.trim());

export const whatsappLink = (number, text = '') =>
  `https://wa.me/${toIntl(number)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
