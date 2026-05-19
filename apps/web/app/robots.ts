import type { MetadataRoute } from 'next';

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
    sitemap: 'https://airportfaster.com/sitemap.xml',
  };
}
