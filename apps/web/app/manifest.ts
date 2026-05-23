import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AirportFaster',
    short_name: 'AirportFaster',
    description: 'Book fast track, meet & greet, and lounge access at airports worldwide.',
    start_url: '/en',
    display: 'standalone',
    background_color: '#FAFAF7',
    theme_color: '#FAFAF7',
    orientation: 'portrait',
    categories: ['travel', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
