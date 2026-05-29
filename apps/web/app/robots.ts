import type { MetadataRoute } from 'next';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// Private paths that no crawler (search or AI) should index.
const DISALLOW_PRIVATE = [
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
];

// Tracking params that produce duplicate URLs (cause "duplicate without
// user-selected canonical" warnings in Search Console).
const DISALLOW_TRACKING = [
  '/*?*utm_',
  '/*?*ref=',
  '/*?*fbclid=',
  '/*?*gclid=',
  '/*?*msclkid=',
  '/*?*mc_eid=',
];

// Explicit allow-list of AI / answer-engine crawlers. Listing them is best
// practice for AEO/GEO so they can index us without being conflated with
// scrapers and so we can adjust their access independently of generic crawlers.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'cohere-ai',
  'Applebot-Extended',
  'YouBot',
  'meta-externalagent',
  'Bytespider',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
];

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow: [...DISALLOW_PRIVATE, ...DISALLOW_TRACKING],
    },
    // Each AI bot gets its own rule block so it's discoverable in robots.txt
    // (search.appearance + assistant grounding both care that the bot can read
    // the public site, but not admin/account flows).
    ...AI_BOTS.map((userAgent) => ({
      userAgent,
      allow: '/',
      disallow: DISALLOW_PRIVATE,
    })),
  ];

  return {
    rules,
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
