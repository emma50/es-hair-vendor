'use client';

import { MessageCircle } from 'lucide-react';
import { buildWhatsAppGreetingUrl } from '@/lib/whatsapp';
import { STORE_CONFIG } from '@/lib/constants';

export function WhatsAppFAB() {
  const whatsappNumber = STORE_CONFIG.whatsappNumber;

  if (!whatsappNumber) return null;

  // NB: inline styles for `position` + `right/bottom` — we used to rely on
  // `fixed right-4 bottom-20`, but because Tailwind `right-*` utilities
  // cascade at the same specificity as other classes that the bundler may
  // reorder (and because this component gets lazy-loaded client-side, its
  // stylesheet may land after other rules), we occasionally saw the FAB
  // render on the left. Inline styles win unconditionally and also make
  // the anchor position immune to any transformed ancestors that could
  // hijack the containing block for a `position: fixed` element.
  return (
    <a
      href={buildWhatsAppGreetingUrl(whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      style={{
        position: 'fixed',
        right: '1.25rem',
        bottom: '1.5rem',
        zIndex: 50,
      }}
      className="group bg-whatsapp hover:bg-whatsapp flex h-14 w-14 items-center justify-center rounded-full shadow-[0_14px_34px_-8px_rgba(37,211,102,0.55),inset_0_1px_0_0_rgba(255,255,255,0.25)] transition-transform duration-300 ease-out hover:scale-[1.08] max-sm:bottom-[5rem]"
    >
      {/* Pulse halo */}
      <span
        aria-hidden="true"
        className="bg-whatsapp/40 pointer-events-none absolute inset-0 rounded-full"
        style={{ animation: 'whatsapp-pulse 2.4s ease-out infinite' }}
      />
      <MessageCircle
        className="relative h-6 w-6 text-white"
        fill="white"
        strokeWidth={1.5}
      />
      <style>{`
        @keyframes whatsapp-pulse {
          0% { transform: scale(1); opacity: 0.55; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
    </a>
  );
}
