import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '48Takvim',
    short_name: '48Takvim',
    description: 'Web + mobil PWA takvim, not ve randevu yönetimi.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#0f172a',
    lang: 'tr-TR',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/maskable-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
