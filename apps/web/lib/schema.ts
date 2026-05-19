const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// ── T-050: Centralized schema.org JSON-LD builders ────────────────────────────

export function airportSchema(airport: {
  name: string;
  iataCode: string;
  city: string;
  country: string;
  slug: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    name: airport.name,
    iataCode: airport.iataCode,
    address: {
      '@type': 'PostalAddress',
      addressLocality: airport.city,
      addressCountry: airport.country,
    },
    url: `${BASE_URL}/en/airports/${airport.slug}`,
  };
}

export function serviceSchema(service: {
  name: string;
  description: string;
  slug: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: 'AirportFaster',
      url: BASE_URL,
    },
    url: `${BASE_URL}/en/services/${service.slug}`,
  };
}

export function offerSchema(opts: {
  serviceName: string;
  airportName: string;
  iataCode: string;
  slug: string;
  serviceSlug: string;
  fromPriceEur?: number;
}): object {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    priceCurrency: 'EUR',
    seller: { '@type': 'Organization', name: 'AirportFaster', url: BASE_URL },
    url: `${BASE_URL}/en/airports/${opts.slug}/${opts.serviceSlug}`,
  };
  if (opts.fromPriceEur != null) {
    offer['price'] = opts.fromPriceEur.toFixed(2);
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${opts.serviceName} at ${opts.airportName} (${opts.iataCode})`,
    description: `Book ${opts.serviceName} at ${opts.airportName}. Premium airport assistance with instant confirmation.`,
    brand: { '@type': 'Brand', name: 'AirportFaster' },
    offers: offer,
  };
}

export function itemListSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function howToSchema(opts: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: opts.name,
    description: opts.description,
    step: opts.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function speakableSchema(cssSelectors: string[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  };
}

export function websiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AirportFaster',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/en/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'AirportFaster',
    url: BASE_URL,
    description:
      'Premium airport services marketplace. Book fast track, meet & greet, and lounge access at airports worldwide.',
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/airportfaster-logo.png`,
      width: 1200,
      height: 300,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@airportfaster.com',
    },
    sameAs: [
      'https://www.facebook.com/airportfaster',
      'https://twitter.com/airportfaster',
      'https://x.com/airportfaster',
      'https://www.linkedin.com/company/airportfaster',
      'https://www.instagram.com/airportfaster',
      'https://www.tiktok.com/@airportfaster',
      'https://www.snapchat.com/add/airportfaster',
    ],
  };
}
