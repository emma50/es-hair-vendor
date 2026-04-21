'use client';

import dynamic from 'next/dynamic';

const WhatsAppFAB = dynamic(
  () => import('@/components/shared/WhatsAppFAB').then((m) => m.WhatsAppFAB),
  { ssr: false },
);

export function WhatsAppFABLoader() {
  return <WhatsAppFAB />;
}
