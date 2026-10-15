import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPhone } from '../lib/ghana';
import { usePrefs } from '../store';
import { Toggle } from './ui';

export default function Footer() {
  const { settings, categories } = useStore();
  const { dataSaver, setDataSaver } = usePrefs();
  return (
    <footer className="no-print mt-16 bg-navy-950 pb-24 text-slate-300 lg:pb-0">
      <div className="kente-strip h-1.5 opacity-90" />
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="" className="h-11 w-11 rounded-xl bg-white p-0.5" />
            <span className="font-display text-xl font-bold tracking-wide text-white">GADGETS <span className="text-brand-400">HUB</span></span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Genuine laptops and accessories, honest prices and real warranty. Proudly Ghanaian, delivering to all 16 regions.
          </p>
          <div className="mt-4 flex gap-2">
            {settings.social?.facebook && <a href={settings.social.facebook} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>}
            {settings.social?.instagram && <a href={settings.social.instagram} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>}
            {settings.social?.tiktok && <a href={settings.social.tiktok} target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-2.5 py-2 text-xs font-bold hover:bg-white/20">TikTok</a>}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-white">All products</Link></li>
            {categories.slice(0, 6).map((c) => <li key={c.id}><Link to={`/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>)}
            <li><Link to="/deals" className="hover:text-white">Deals</Link></li>
            <li><Link to="/finder" className="hover:text-white">Laptop finder</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link to="/help" className="hover:text-white">FAQs</Link></li>
            <li><Link to="/help#delivery" className="hover:text-white">Delivery & pickup</Link></li>
            <li><Link to="/help#warranty" className="hover:text-white">Warranty & returns</Link></li>
            <li><Link to="/help#payment" className="hover:text-white">Paying with Mobile Money</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">Visit or call</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{settings.address}{settings.gps && <> · {settings.gps}</>}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`tel:${settings.phone}`}>{formatPhone(settings.phone)}</a></li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`mailto:${settings.email}`}>{settings.email}</a></li>
            <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{settings.openingHours}</li>
          </ul>
          <div className="mt-5 rounded-xl bg-white/5 p-3 text-slate-200 [&_*]:!text-slate-200">
            <Toggle checked={dataSaver} onChange={setDataSaver} label="Data saver" desc="Smaller images to save your bundle" />
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-2">
            {['MTN MoMo', 'Telecel Cash', 'AT Money', 'Visa', 'Mastercard'].map((m) => (
              <span key={m} className="rounded-md bg-white/10 px-2 py-1 font-semibold text-slate-200">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
