'use client';

import { usePathname } from 'next/navigation';

const WHATSAPP_NUMBER = '441748220006';
const WHATSAPP_MESSAGE = 'Hello AirportFaster, I need help with my booking.';

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M16.01 4C9.39 4 4 9.28 4 15.77c0 2.07.56 4.1 1.63 5.88L4 28l6.54-1.6A12.18 12.18 0 0 0 16.01 27C22.63 27 28 21.72 28 15.77S22.63 4 16.01 4Zm0 20.96c-1.75 0-3.47-.46-4.96-1.33l-.36-.21-3.88.95.98-3.68-.24-.38a9.63 9.63 0 0 1-1.5-5.14c0-5.35 4.47-9.71 9.96-9.71s9.95 4.36 9.95 9.71-4.46 9.79-9.95 9.79Zm5.46-7.31c-.3-.15-1.78-.86-2.05-.96-.28-.1-.48-.15-.68.15-.2.29-.78.95-.96 1.15-.18.2-.35.22-.65.07-.3-.15-1.26-.45-2.4-1.45-.89-.77-1.49-1.72-1.66-2-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.68-1.6-.93-2.2-.25-.58-.5-.5-.68-.5h-.58c-.2 0-.52.07-.8.37-.27.3-1.05 1-1.05 2.43 0 1.43 1.08 2.82 1.23 3.02.15.2 2.13 3.16 5.15 4.43.72.3 1.28.48 1.72.62.72.22 1.38.19 1.9.12.58-.08 1.78-.7 2.03-1.38.25-.67.25-1.25.17-1.38-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function WhatsAppSupportButton() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  const isDashboard =
    normalizedPath === '/admin' ||
    normalizedPath.startsWith('/admin/') ||
    normalizedPath === '/supplier-portal' ||
    normalizedPath.startsWith('/supplier-portal/');

  if (isDashboard) return null;

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact AirportFaster customer service on WhatsApp"
      title="WhatsApp customer service"
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 ring-1 ring-white/20 transition-transform hover:scale-105 hover:bg-[#1ebe5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon />
      <span className="sr-only">WhatsApp customer service</span>
    </a>
  );
}
