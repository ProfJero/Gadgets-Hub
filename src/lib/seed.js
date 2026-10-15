// Demo catalogue so the store looks alive on day one. Loaded from Admin → Dashboard.
// Replace with real products (and Cloudinary photos) before launch.
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { slugify } from './format';

const u = (id) => `https://images.unsplash.com/photo-${id}?w=1000`;

export const SEED_CATEGORIES = [
  { name: 'Laptops', slug: 'laptops', order: 1, description: 'Brand new, UK-used and refurbished laptops from HP, Dell, Lenovo, Apple and more.' },
  { name: 'Chargers & Power', slug: 'chargers-power', order: 2, description: 'Original chargers, power banks and surge protectors to beat “lights off”.' },
  { name: 'Bags & Sleeves', slug: 'bags-sleeves', order: 3 },
  { name: 'Mice & Keyboards', slug: 'mice-keyboards', order: 4 },
  { name: 'Monitors', slug: 'monitors', order: 5 },
  { name: 'Storage & Memory', slug: 'storage-memory', order: 6 },
  { name: 'Audio', slug: 'audio', order: 7 },
  { name: 'Networking', slug: 'networking', order: 8 },
];

const L = (o) => ({ category: 'laptops', active: true, ...o });

export const SEED_PRODUCTS = [
  L({ name: 'HP EliteBook 840 G8', brand: 'HP', condition: 'uk-used', price: 6200, compareAtPrice: 7000, stock: 12, featured: true, soldCount: 64, warranty: '3 months shop warranty',
    images: [{ url: u('1496181133206-80ce9b88a853') }],
    specs: { processor: 'Intel Core i5-1135G7 (11th Gen)', ram: '16GB DDR4', storage: '512GB NVMe SSD', display: '14" Full HD IPS', graphics: 'Intel Iris Xe', os: 'Windows 11 Pro', battery: 'Up to 9 hours', weight: '1.37 kg', keyboard: 'Backlit' },
    highlights: ['Grade A, tested battery', 'Backlit keyboard & fingerprint', 'Ideal for work and university'], useCases: ['business', 'student', 'coding'],
    description: 'The EliteBook 840 G8 is a premium business laptop built to last: aluminium body, excellent keyboard and all-day battery. Perfect for professionals and students who want reliability without paying brand-new prices.' }),
  L({ name: 'Dell Latitude 5420', brand: 'Dell', condition: 'uk-used', price: 4800, compareAtPrice: 5500, stock: 9, soldCount: 51,
    images: [{ url: u('1593642702821-c8da6771f0c6') }],
    specs: { processor: 'Intel Core i5-1145G7 (11th Gen)', ram: '8GB DDR4', storage: '256GB SSD', display: '14" Full HD', graphics: 'Intel Iris Xe', os: 'Windows 11 Pro', battery: 'Up to 8 hours', weight: '1.4 kg' },
    highlights: ['Durable business build', 'Great value for students'], useCases: ['business', 'student'],
    description: 'Dependable Dell Latitude with fast SSD and 11th-gen Intel performance. A favourite for offices and schools across Ghana.' }),
  L({ name: 'Lenovo ThinkPad T14 Gen 2', brand: 'Lenovo', condition: 'refurbished', price: 5600, stock: 7, soldCount: 33,
    images: [{ url: u('1588872657578-7efd1f1555ed') }],
    specs: { processor: 'AMD Ryzen 5 PRO 5650U', ram: '16GB', storage: '512GB SSD', display: '14" Full HD IPS', graphics: 'AMD Radeon', os: 'Windows 11 Pro', weight: '1.5 kg', keyboard: 'Backlit, spill-resistant' },
    highlights: ['Legendary ThinkPad keyboard', 'MIL-SPEC tested durability'], useCases: ['business', 'coding'],
    description: 'Certified refurbished ThinkPad T14: tough, fast and secure. Built for people who type a lot.' }),
  L({ name: 'Apple MacBook Air M2 13"', brand: 'Apple', condition: 'new', price: 15500, compareAtPrice: 16800, stock: 5, featured: true, soldCount: 28, warranty: '1 year Apple warranty',
    images: [{ url: u('1611186871348-b1ce696e52c9') }],
    specs: { processor: 'Apple M2 8-core CPU', ram: '8GB Unified', storage: '256GB SSD', display: '13.6" Liquid Retina', graphics: '8-core GPU', os: 'macOS', battery: 'Up to 18 hours', weight: '1.24 kg' },
    highlights: ['18-hour battery: survives dumsor', 'Silent fan-less design', 'Sealed in box'], useCases: ['student', 'business', 'creative'],
    description: 'Ultra-thin, ultra-fast. The MacBook Air M2 delivers incredible battery life and performance for study, work and creative projects.' }),
  L({ name: 'Apple MacBook Pro 14" M3 Pro', brand: 'Apple', condition: 'new', price: 32000, stock: 2, soldCount: 6, warranty: '1 year Apple warranty',
    images: [{ url: u('1517336714731-489689fd1ca8') }],
    specs: { processor: 'Apple M3 Pro 11-core', ram: '18GB Unified', storage: '512GB SSD', display: '14.2" Liquid Retina XDR 120Hz', graphics: '14-core GPU', os: 'macOS', battery: 'Up to 17 hours', weight: '1.61 kg' },
    highlights: ['Pro performance for video & design', 'XDR display'], useCases: ['creative', 'coding', 'business'],
    description: 'For editors, designers and developers who need serious power on the go.' }),
  L({ name: 'ASUS TUF Gaming F15', brand: 'ASUS', condition: 'new', price: 13900, compareAtPrice: 15200, stock: 4, featured: true, soldCount: 19, warranty: '1 year warranty',
    images: [{ url: u('1603302576837-37561b2e2302') }],
    specs: { processor: 'Intel Core i7-12700H', ram: '16GB DDR4', storage: '512GB NVMe SSD', display: '15.6" FHD 144Hz', graphics: 'NVIDIA GeForce RTX 4050 6GB', os: 'Windows 11 Home', weight: '2.2 kg', keyboard: 'RGB backlit' },
    highlights: ['RTX 4050 graphics', '144Hz smooth display', 'Military-grade toughness'], useCases: ['gaming', 'creative'],
    description: 'Game hard, work hard. The TUF F15 packs RTX graphics and a high refresh display in a durable chassis.' }),
  L({ name: 'HP 250 G9', brand: 'HP', condition: 'new', price: 4300, stock: 15, soldCount: 72, warranty: '1 year warranty',
    images: [{ url: u('1525547719571-a2d4ac8945e2') }],
    specs: { processor: 'Intel Core i3-1215U', ram: '8GB', storage: '256GB SSD', display: '15.6" HD', graphics: 'Intel UHD', os: 'Windows 11 Home', weight: '1.74 kg' },
    highlights: ['Best budget brand-new laptop', 'Full-size keyboard with numpad'], useCases: ['student'],
    description: 'Affordable, brand new and reliable. Great first laptop for SHS and university students.' }),
  L({ name: 'Lenovo IdeaPad Slim 3', brand: 'Lenovo', condition: 'new', price: 5900, compareAtPrice: 6400, stock: 8, soldCount: 40, warranty: '1 year warranty',
    images: [{ url: u('1541807084-5c52b6b3adef') }],
    specs: { processor: 'AMD Ryzen 5 7520U', ram: '8GB', storage: '512GB SSD', display: '15.6" Full HD', graphics: 'AMD Radeon', os: 'Windows 11 Home', battery: 'Up to 10 hours', weight: '1.62 kg' },
    highlights: ['Fast 512GB SSD', 'Long battery life'], useCases: ['student', 'business'],
    description: 'Slim, modern and fast for everyday work, school and streaming.' }),
  L({ name: 'Dell XPS 13 9310', brand: 'Dell', condition: 'uk-used', price: 8900, stock: 3, soldCount: 12,
    images: [{ url: u('1484788984921-03950022c9ef') }],
    specs: { processor: 'Intel Core i7-1185G7', ram: '16GB LPDDR4x', storage: '512GB SSD', display: '13.4" FHD+ InfinityEdge', graphics: 'Intel Iris Xe', os: 'Windows 11', weight: '1.2 kg' },
    highlights: ['Premium compact design', 'Stunning edge-to-edge screen'], useCases: ['business', 'creative', 'coding'],
    description: 'One of the best ultrabooks ever made, now at a UK-used price.' }),
  L({ name: 'HP ProBook 450 G7', brand: 'HP', condition: 'uk-used', price: 3600, compareAtPrice: 4200, stock: 10, soldCount: 58,
    images: [{ url: u('1531297484001-80022131f5a1') }],
    specs: { processor: 'Intel Core i5-10210U (10th Gen)', ram: '8GB', storage: '256GB SSD', display: '15.6" Full HD', graphics: 'Intel UHD', os: 'Windows 10 Pro', weight: '2.0 kg' },
    highlights: ['Under GH₵4,000', 'Big 15.6" screen'], useCases: ['student', 'business'],
    description: 'Solid everyday laptop at a great price.' }),
  { name: 'Original HP 65W USB-C Charger', brand: 'HP', category: 'chargers-power', condition: 'new', price: 380, compareAtPrice: 450, stock: 25, soldCount: 90, active: true,
    images: [{ url: u('1585792180666-f7347c490ee2') }], specs: {}, highlights: ['Genuine HP', 'Works with most USB-C laptops'], description: 'Original 65W USB-C power adapter.' },
  { name: 'Anker 20,000mAh Power Bank (PD 65W)', brand: 'Anker', category: 'chargers-power', condition: 'new', price: 850, stock: 14, soldCount: 37, active: true, featured: true,
    images: [{ url: u('1609091839311-d5365f9ff1c5') }], specs: {}, highlights: ['Charges laptops via USB-C', 'Beat the lights-off'], description: 'Keep your laptop and phone running during power outages.' },
  { name: 'Water-resistant Laptop Backpack 15.6"', brand: 'Gadgets Hub', category: 'bags-sleeves', condition: 'new', price: 250, compareAtPrice: 320, stock: 30, soldCount: 66, active: true,
    images: [{ url: u('1553062407-98eeb64c6a62') }], specs: {}, highlights: ['Padded laptop compartment', 'USB charging port'], description: 'Durable, comfortable backpack for school and work.' },
  { name: 'Logitech M185 Wireless Mouse', brand: 'Logitech', category: 'mice-keyboards', condition: 'new', price: 140, stock: 40, soldCount: 120, active: true,
    images: [{ url: u('1527864550417-7fd91fc51a46') }], specs: {}, highlights: ['12-month battery', 'Plug-and-play nano receiver'], description: 'Reliable wireless mouse.' },
  { name: 'Logitech K380 Bluetooth Keyboard', brand: 'Logitech', category: 'mice-keyboards', condition: 'new', price: 420, stock: 12, soldCount: 22, active: true,
    images: [{ url: u('1587829741301-dc798b83add3') }], specs: {}, description: 'Compact multi-device keyboard.' },
  { name: 'Dell 24" Full HD Monitor (P2422H)', brand: 'Dell', category: 'monitors', condition: 'new', price: 2300, compareAtPrice: 2600, stock: 6, soldCount: 15, active: true,
    images: [{ url: u('1527443224154-c4a3942d3acf') }], specs: { display: '23.8" FHD IPS', ports: 'HDMI, DisplayPort, VGA, USB' }, description: 'Ergonomic, height-adjustable monitor.' },
  { name: 'Samsung T7 1TB Portable SSD', brand: 'Samsung', category: 'storage-memory', condition: 'new', price: 1250, stock: 9, soldCount: 18, active: true,
    images: [{ url: u('1597872200969-2b65d56bd16b') }], specs: { storage: '1TB' }, description: 'Ultra-fast USB-C external SSD.' },
  { name: 'Sony WH-CH520 Wireless Headphones', brand: 'Sony', category: 'audio', condition: 'new', price: 650, stock: 11, soldCount: 26, active: true,
    images: [{ url: u('1505740420928-5e560c06d30e') }], specs: {}, highlights: ['50-hour battery'], description: 'Comfortable on-ear headphones for calls and music.' },
];

export async function seedCatalogue() {
  const batch = writeBatch(db);
  SEED_CATEGORIES.forEach((c) => batch.set(doc(db, 'categories', c.slug), c));
  SEED_PRODUCTS.forEach((p, i) => {
    const ref = doc(collection(db, 'products'));
    const keywords = Array.from(new Set([p.name, p.brand, p.category, ...Object.values(p.specs || {})].join(' ').toLowerCase().split(/[\s,/()-]+/).filter((w) => w.length > 1)));
    batch.set(ref, {
      rating: 0, reviewCount: 0, tags: [], costPrice: 0, sku: `GH-${1000 + i}`, highlights: [], useCases: [],
      ...p, slug: slugify(p.name), keywords,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
