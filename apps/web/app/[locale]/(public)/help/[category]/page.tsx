import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Mail,
  Plus,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { SchemaScript } from '@/components/public/SchemaScript';
import { breadcrumbSchema, faqSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, FadeInStagger, FadeInItem } from '@/components/ui/fade-in';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

// STATIC: move to CMS when admin FAQ builder is live

interface FaqItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  faqs: FaqItem[];
}

const HELP_CATEGORIES: Record<string, HelpCategory> = {
  booking: {
    slug: 'booking',
    title: 'Booking',
    description: 'Everything you need to know about making a booking with AirportFaster.',
    icon: CalendarCheck,
    faqs: [
      {
        question: 'How do I book an airport service?',
        answer:
          'Search for your departure airport using the search bar on our homepage or airport directory. Select the service you need, choose your travel date, and complete the booking with your contact and payment details. You will receive a confirmation email immediately.',
      },
      {
        question: 'What information do I need to complete a booking?',
        answer:
          'You will need your flight number, travel date, number of passengers, and a valid email address. Some services may also require your passport number or other travel document details.',
      },
      {
        question: 'Can I book a service for someone else?',
        answer:
          'Yes, you can book on behalf of another person. Enter their name as the lead passenger during checkout and ensure they receive the booking confirmation so they can present it at the airport.',
      },
      {
        question: 'How far in advance should I book?',
        answer:
          'We recommend booking at least 24-48 hours before your travel date. For popular airports or peak travel periods, booking further in advance ensures availability and gives our suppliers time to prepare for you.',
      },
      {
        question: 'Can I book multiple services for the same trip?',
        answer:
          'Yes. You can book multiple services (e.g., fast track and lounge access) for the same trip. Each service will generate a separate booking confirmation.',
      },
    ],
  },
  payment: {
    slug: 'payment',
    title: 'Payment',
    description: 'Payment methods, security, and billing information.',
    icon: CreditCard,
    faqs: [
      {
        question: 'What payment methods does AirportFaster accept?',
        answer:
          'We accept all major credit and debit cards including Visa, Mastercard, and American Express. Payment is processed securely through Stripe.',
      },
      {
        question: 'Is my payment information secure?',
        answer:
          'Yes. All payment data is handled by Stripe, a PCI DSS Level 1 certified payment processor. AirportFaster never stores your raw card details on our servers.',
      },
      {
        question: 'When am I charged for my booking?',
        answer:
          'Payment is taken at the time of booking. You will see a charge on your card statement as soon as your booking is confirmed.',
      },
      {
        question: 'Will I receive a receipt?',
        answer:
          'Yes. A full payment receipt is included in your booking confirmation email. You can also contact support@airportfaster.com if you need a VAT invoice or additional documentation.',
      },
      {
        question: 'In what currency are prices displayed?',
        answer:
          "All prices on AirportFaster are in Euros (€). If your card is in a different currency, your bank will apply its own exchange rate when charging.",
      },
    ],
  },
  cancellation: {
    slug: 'cancellation',
    title: 'Cancellation & Refunds',
    description: 'How to cancel, refund timelines, and our cancellation policy.',
    icon: RotateCcw,
    faqs: [
      {
        question: 'How do I cancel my booking?',
        answer:
          'To cancel, please contact our support team at support@airportfaster.com with your booking reference number. We will process your cancellation and confirm by email.',
      },
      {
        question: "What is AirportFaster's refund policy?",
        answer:
          'We offer a full refund for cancellations made at least 24 hours before the scheduled service. Cancellations within 24 hours of the service are non-refundable, except in cases of flight cancellation or extraordinary circumstances.',
      },
      {
        question: 'How long do refunds take?',
        answer:
          'Refunds are typically processed within 5-10 business days, depending on your card provider. You will receive a confirmation email when the refund has been initiated.',
      },
      {
        question: 'What if my flight is cancelled by the airline?',
        answer:
          'If your flight is cancelled by your airline, please contact us with your booking reference and proof of cancellation (e.g., airline notification email). We will arrange a full refund or free rebooking.',
      },
      {
        question: 'Can I modify my booking instead of cancelling?',
        answer:
          'Yes. Please contact support@airportfaster.com as soon as possible with your booking reference and the changes you require. We will do our best to accommodate modifications subject to availability.',
      },
    ],
  },
  suppliers: {
    slug: 'suppliers',
    title: 'Service Providers',
    description: 'Learn about the trusted partners who deliver your airport services.',
    icon: Handshake,
    faqs: [
      {
        question: 'Who are the service providers?',
        answer:
          'Our airport services are delivered by a network of vetted, professional airport assistance companies and directly by airport authorities. All suppliers are contracted partners with proven track records in the travel industry.',
      },
      {
        question: 'How are service providers vetted?',
        answer:
          'Every supplier undergoes a rigorous onboarding process including reference checks, licensing verification, insurance review, and operational assessments. We continuously monitor supplier performance through customer feedback.',
      },
      {
        question: 'What happens if a supplier lets me down?',
        answer:
          'Customer satisfaction is our priority. If a supplier fails to deliver the service as booked, please contact us immediately at support@airportfaster.com. We will investigate and arrange compensation or a full refund as appropriate.',
      },
      {
        question: 'Are suppliers available at all times?',
        answer:
          'Service availability varies by airport and supplier. Availability is shown at the time of booking. For 24/7 airports, services are typically available around the clock; smaller airports may have restricted hours.',
      },
    ],
  },
};

const VALID_SLUGS = Object.keys(HELP_CATEGORIES);

export async function generateStaticParams(): Promise<{ category: string }[]> {
  return VALID_SLUGS.map((slug) => ({ category: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; locale: string }>;
}): Promise<Metadata> {
  const { category, locale } = await params;
  const cat = HELP_CATEGORIES[category];
  if (!cat) return { title: 'Not Found' };
  const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

  return {
    title: `${cat.title} Help | AirportFaster`,
    description: cat.description,
    openGraph: { title: `${cat.title} Help | AirportFaster`, description: cat.description, url: `${BASE_URL}/${locale}/help/${category}`, ...ogLocales(locale) },
    alternates: localeAlternates(`/help/${category}`, locale),
  };
}

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = HELP_CATEGORIES[category];

  if (!cat) {
    notFound();
  }

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: BASE_URL },
    { name: 'Help Centre', url: `${BASE_URL}/help` },
    { name: cat.title, url: `${BASE_URL}/help/${category}` },
  ]);

  const faqSchemaData = faqSchema(cat.faqs);
  const Icon = cat.icon;
  const otherCategories = VALID_SLUGS
    .filter((slug) => slug !== category)
    .map((slug) => HELP_CATEGORIES[slug])
    .filter((c): c is HelpCategory => c !== undefined);

  return (
    <div className="bg-bg">
      <SchemaScript schema={breadcrumb} />
      <SchemaScript schema={faqSchemaData} />

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <Link href="/help" className="hover:text-ink transition-colors">
            Help Centre
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">{cat.title}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 py-10 lg:py-16">
        <FadeIn>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/15 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-brand-gold-dark" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-3">
                Help Centre
              </Badge>
              <h1 className="text-display-md font-bold text-ink tracking-tight mb-3">
                {cat.title}
              </h1>
              <p className="text-body-lg text-ink-2 max-w-2xl">{cat.description}</p>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Two-column layout */}
      <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 lg:gap-12">
          {/* Sidebar — related topics */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="bg-surface rounded-2xl border border-line p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-4">
                Related topics
              </p>
              <nav className="flex flex-col gap-1">
                {otherCategories.map((c) => {
                  const OtherIcon = c.icon;
                  return (
                    <Link
                      key={c.slug}
                      href={`/help/${c.slug}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-2 group-hover:bg-brand-gold/15 flex items-center justify-center transition-colors">
                        <OtherIcon className="w-4 h-4 text-ink-2 group-hover:text-brand-gold-dark transition-colors" />
                      </div>
                      <span className="text-sm text-ink font-medium">{c.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* FAQ list */}
          <div>
            <FadeInStagger className="space-y-3" staggerDelay={0.05}>
              {cat.faqs.map((faq) => (
                <FadeInItem key={faq.question}>
                  <details className="group bg-surface rounded-2xl border border-line hover:border-line-2 transition-colors">
                    <summary className="flex items-start justify-between gap-4 p-6 cursor-pointer list-none">
                      <span className="text-body-md font-semibold text-ink">{faq.question}</span>
                      <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-ink shrink-0 group-open:rotate-45 transition-transform duration-200">
                        <Plus className="w-4 h-4" />
                      </span>
                    </summary>
                    <div className="px-6 pb-6 text-body-sm text-ink-2 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                </FadeInItem>
              ))}
            </FadeInStagger>

            {/* Still need help CTA */}
            <FadeIn>
              <div className="mt-10 bg-surface rounded-3xl border border-line shadow-card p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <h3 className="text-body-lg font-semibold text-ink mb-1 tracking-tight">
                      Still need help?
                    </h3>
                    <p className="text-sm text-ink-2">
                      Our support team is available 24/7 to assist with any questions.
                    </p>
                  </div>
                  <Button variant="default" size="lg" asChild>
                    <a href="mailto:support@airportfaster.com">
                      <Mail className="w-4 h-4" />
                      Contact support
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </a>
                  </Button>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
