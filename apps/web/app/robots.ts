import type { MetadataRoute } from 'next';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/en/admin/',
          '/ar/admin/',
          '/en/account/',
          '/ar/account/',
          '/en/manage/',
          '/ar/manage/',
          '/en/book/',
          '/ar/book/',
          '/en/supplier/',
          '/ar/supplier/',
          '/*?*utm_',
          '/*?*ref=',
          '/*?*fbclid=',
          '/*?*gclid=',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
