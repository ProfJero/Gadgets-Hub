import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPhone, whatsappLink } from '../lib/ghana';
import { WhatsAppIcon } from '../components/WhatsAppFab';

export default function Contact() {
  const { settings } = useStore();
  return (
    <div className="container-x max-w-3xl py-8">
      <h1 className="font-display text-4xl font-bold">Contact us</h1>
      <p className="mt-1 text-ink-muted">Real people, quick replies. We're here to help.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a href={whatsappLink(settings.whatsapp, 'Hello Gadgets Hub 👋')} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl bg-[#25D366] p-5 text-white sm:col-span-2">
          <WhatsAppIcon className="h-10 w-10" />
          <div><div className="text-lg font-bold">Chat on WhatsApp</div><div className="text-sm text-white/90">Fastest way to reach us · {formatPhone(settings.whatsapp)}</div></div>
        </a>
        <a href={`tel:${settings.phone}`} className="card flex items-center gap-4 p-5"><Phone className="h-6 w-6 text-navy-600" /><div><div className="font-bold">Call</div><div className="text-sm text-ink-muted">{formatPhone(settings.phone)}</div></div></a>
        <a href={`mailto:${settings.email}`} className="card flex items-center gap-4 p-5"><Mail className="h-6 w-6 text-navy-600" /><div><div className="font-bold">Email</div><div className="text-sm text-ink-muted">{settings.email}</div></div></a>
        <div className="card flex items-center gap-4 p-5"><MapPin className="h-6 w-6 text-navy-600" /><div><div className="font-bold">Visit</div><div className="text-sm text-ink-muted">{settings.address}{settings.gps && ` · ${settings.gps}`}</div></div></div>
        <div className="card flex items-center gap-4 p-5"><Clock className="h-6 w-6 text-navy-600" /><div><div className="font-bold">Hours</div><div className="text-sm text-ink-muted">{settings.openingHours}</div></div></div>
      </div>
      {settings.address && (
        <div className="card mt-4 overflow-hidden">
          <iframe title="Map" className="h-72 w-full" loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address + ', Ghana')}&output=embed`} />
        </div>
      )}
    </div>
  );
}
