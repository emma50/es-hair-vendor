import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { ToastProvider } from '@/components/ui/Toast';
import { WhatsAppFABLoader } from '@/components/shared/WhatsAppFABLoader';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import { STORE_CONFIG } from '@/lib/constants';
import '@/styles/globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#D4A853',
};

export const metadata: Metadata = {
  title: {
    default: 'Emmanuel Sarah Hair — Premium Human Hair, Lagos',
    template: '%s | Emmanuel Sarah Hair',
  },
  description:
    'Premium human hair bundles, closures, frontals, and wigs. Shop the finest quality hair delivered to your doorstep in Lagos, Nigeria.',
  metadataBase: new URL(STORE_CONFIG.appUrl),
  // manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'Emmanuel Sarah Hair',
    locale: 'en_NG',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // suppressHydrationWarning is correct here — the themeInitScript
      // mutates <html data-theme="..."> before React hydrates, which
      // would otherwise trigger a mismatch warning on first paint.
      suppressHydrationWarning
      className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* FOUC-prevention: runs synchronously BEFORE first paint so users
            with a stored "light" preference never see a dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <WhatsAppFABLoader />
          </ToastProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
