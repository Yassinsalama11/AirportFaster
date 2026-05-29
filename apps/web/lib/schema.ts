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
  fromPriceEur?: number;
  imageUrl?: string;
  locale?: string;
}): object {
  const locale = service.locale ?? 'en';
  const price = (service.fromPriceEur ?? DEFAULT_FROM_PRICE_EUR).toFixed(2);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    image: service.imageUrl ? [service.imageUrl] : [DEFAULT_PRODUCT_IMAGE],
    serviceType: service.name,
    category: 'Travel > Airport Services',
    provider: {
      '@type': 'Organization',
      name: 'AirportFaster',
      url: BASE_URL,
    },
    areaServed: { '@type': 'Place', name: 'Worldwide' },
    url: `${BASE_URL}/${locale}/services/${service.slug}`,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}/${locale}/services/${service.slug}`,
    },
  };
}

export function webPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  locale: string;
  dateModified?: string;
  primaryImageUrl?: string;
  breadcrumb?: Array<{ name: string; url: string }>;
}): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: opts.locale === 'ar' ? 'ar' : 'en',
    isPartOf: { '@type': 'WebSite', url: BASE_URL, name: 'AirportFaster' },
    publisher: { '@type': 'Organization', name: 'AirportFaster', url: BASE_URL },
  };
  if (opts.dateModified) schema['dateModified'] = opts.dateModified;
  if (opts.primaryImageUrl) {
    schema['primaryImageOfPage'] = {
      '@type': 'ImageObject',
      url: opts.primaryImageUrl,
    };
  }
  if (opts.breadcrumb && opts.breadcrumb.length > 0) {
    schema['breadcrumb'] = {
      '@type': 'BreadcrumbList',
      itemListElement: opts.breadcrumb.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }
  return schema;
}

// Minimum sensible price for any airport service (in EUR). Used as a defensive
// fallback when a specific airport hasn't been priced yet, so Product/Offer
// structured data never ships with a missing `price` (which fails Google
// Merchant Listings + Product Snippets validation).
const DEFAULT_FROM_PRICE_EUR = 29;

const DEFAULT_PRODUCT_IMAGE = `${BASE_URL}/og-image.png`;

export function offerSchema(opts: {
  serviceName: string;
  airportName: string;
  iataCode: string;
  slug: string;
  serviceSlug: string;
  /** From-price in EUR. Falls back to `DEFAULT_FROM_PRICE_EUR` if not provided. */
  fromPriceEur?: number;
  /** Absolute image URL for the product. Falls back to brand OG image. */
  imageUrl?: string;
  /** ISO 3166-1 alpha-2 country code of the airport. Falls back to 'GB'. */
  countryCode?: string;
  /** Override for the product description shown to crawlers. */
  description?: string;
  /** Override the canonical product URL (locale-prefixed). */
  locale?: string;
}): object {
  const price = (opts.fromPriceEur ?? DEFAULT_FROM_PRICE_EUR).toFixed(2);
  const image = opts.imageUrl ?? DEFAULT_PRODUCT_IMAGE;
  const country = (opts.countryCode ?? 'GB').toUpperCase();
  const locale = opts.locale ?? 'en';
  const productUrl = `${BASE_URL}/${locale}/airports/${opts.slug}/${opts.serviceSlug}`;
  const description =
    opts.description ??
    `Book ${opts.serviceName} at ${opts.airportName} (${opts.iataCode}). Premium airport assistance with instant confirmation, free cancellation up to 24h before service.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${opts.serviceName} at ${opts.airportName} (${opts.iataCode})`,
    description,
    image: [image],
    brand: { '@type': 'Brand', name: 'AirportFaster' },
    sku: `${opts.iataCode}-${opts.serviceSlug}`.toUpperCase(),
    mpn: `${opts.iataCode}-${opts.serviceSlug}`.toUpperCase(),
    category: 'Travel > Airport Services',
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'EUR',
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'AirportFaster',
        url: BASE_URL,
      },
      // Digital-delivery shipping spec — satisfies Google Merchant Listings
      // recommended fields for non-physical goods (instant electronic delivery,
      // worldwide, no shipping fee).
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'EUR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: country,
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'HUR',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'HUR',
          },
        },
      },
      // Customer-friendly return policy — satisfies hasMerchantReturnPolicy
      // recommended field. Mirrors the platform's 24-hour cancellation policy.
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: country,
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 1,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
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
