import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const metadata: Metadata = {
  title: '48Takvim',
  description: 'PWA destekli, Firebase tabanlı modern takvim ve randevu uygulaması.',
  manifest: '/manifest.webmanifest',
  applicationName: '48Takvim',
  icons: {
    icon: [
      { url: '/icons/favicon-32.svg', type: 'image/svg+xml', sizes: '32x32' },
      { url: '/icons/icon-192.svg', type: 'image/svg+xml', sizes: '192x192' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#f4f7ff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="takvim-theme">
          <PWARegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
