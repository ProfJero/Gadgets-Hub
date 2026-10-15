import { useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { whatsappLink } from '../lib/ghana';

export const WhatsAppIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.47 9.47 0 0 1-4.83-1.32l-.35-.21-3.59.94.96-3.5-.23-.36a9.45 9.45 0 0 1-1.45-5.05c0-5.23 4.26-9.49 9.5-9.49 2.54 0 4.92.99 6.71 2.79a9.43 9.43 0 0 1 2.78 6.71c0 5.23-4.26 9.49-9.49 9.49zm8.08-17.57A11.35 11.35 0 0 0 12.04.5C5.74.5.62 5.62.62 11.91c0 2.01.52 3.97 1.52 5.7L.52 23.5l6.03-1.58a11.38 11.38 0 0 0 5.45 1.39h.01c6.29 0 11.41-5.12 11.42-11.41 0-3.05-1.19-5.91-3.34-8.07z" />
  </svg>
);

export default function WhatsAppFab() {
  const { settings } = useStore();
  const { pathname } = useLocation();
  if (!settings.whatsapp || pathname.startsWith('/checkout') || pathname.startsWith('/product/')) return null;
  return (
    <a
      href={whatsappLink(settings.whatsapp, 'Hello Gadgets Hub 👋, I need help choosing a laptop.')}
      target="_blank"
      rel="noreferrer"
      className="no-print fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105 lg:bottom-6 lg:right-6"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
