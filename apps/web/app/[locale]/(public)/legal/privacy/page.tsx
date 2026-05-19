// STATIC: review with legal counsel before launch
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';

export const metadata: Metadata = {
  title: 'Privacy Policy | AirportFaster',
  description: 'Learn how AirportFaster collects, uses, and protects your personal data.',
};

const SECTIONS = [
  { id: 'data', title: '1. Data We Collect' },
  { id: 'use', title: '2. How We Use Your Data' },
  { id: 'legal-basis', title: '3. Legal Basis (GDPR)' },
  { id: 'rights', title: '4. Your GDPR Rights' },
  { id: 'retention', title: '5. Data Retention' },
  { id: 'cookies', title: '6. Cookies' },
  { id: 'third-party', title: '7. Third-Party Services' },
  { id: 'contact', title: '8. Contact' },
];

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="bg-bg">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <Link href="/legal/privacy" className="hover:text-ink transition-colors">
            Legal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">Privacy</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        <FadeIn>
          <h1 className="text-display-md font-bold text-ink tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-3">
            Last updated: {year}. Effective immediately.
          </p>
        </FadeIn>
      </section>

      {/* Two-column layout */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 lg:gap-12">
          {/* TOC sidebar */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="bg-surface rounded-2xl border border-line p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
                On this page
              </p>
              <nav className="flex flex-col gap-1.5">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="text-sm text-ink-2 hover:text-ink transition-colors py-1"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Article */}
          <article className="prose prose-ink max-w-none text-ink-2">
            <section id="data" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">1. Data We Collect</h2>
              <p>When you use AirportFaster, we collect the following categories of data:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong className="text-ink">Identity data:</strong> Full name, email address, phone number
                </li>
                <li>
                  <strong className="text-ink">Booking data:</strong> Passenger details, service dates, flight information, special requests
                </li>
                <li>
                  <strong className="text-ink">Payment data:</strong> Payment card details (processed by Stripe — we do not store raw card numbers)
                </li>
                <li>
                  <strong className="text-ink">Usage data:</strong> Pages visited, search queries, device type, IP address, browser type (collected via PostHog analytics)
                </li>
                <li>
                  <strong className="text-ink">Cookie data:</strong> Session identifiers and preference settings
                </li>
              </ul>
            </section>

            <section id="use" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">2. How We Use Your Data</h2>
              <p>We use your personal data to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Process and manage your bookings</li>
                <li>Send booking confirmations and service updates via email</li>
                <li>Handle payments securely through our payment processor (Stripe)</li>
                <li>Improve our platform through anonymised analytics</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal data to third parties. We do not use your data for
                unsolicited marketing without your explicit consent.
              </p>
            </section>

            <section id="legal-basis" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">3. Legal Basis (GDPR)</h2>
              <p>
                For users in the European Economic Area (EEA), we process your personal data on the
                following legal bases:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong className="text-ink">Contract performance:</strong> Processing necessary to fulfill your booking
                </li>
                <li>
                  <strong className="text-ink">Legitimate interests:</strong> Fraud prevention, platform security, and analytics (anonymised)
                </li>
                <li>
                  <strong className="text-ink">Legal obligation:</strong> Compliance with tax, accounting, and regulatory requirements
                </li>
                <li>
                  <strong className="text-ink">Consent:</strong> Non-essential cookies and optional marketing communications
                </li>
              </ul>
            </section>

            <section id="rights" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">4. Your GDPR Rights</h2>
              <p>If you are in the EEA, you have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access a copy of your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Request erasure (&ldquo;right to be forgotten&rdquo;)</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p className="mt-2">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:privacy@airportfaster.com" className="text-brand-gold-dark hover:underline">
                  privacy@airportfaster.com
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section id="retention" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">5. Data Retention</h2>
              <p>We retain your data for the following periods:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong className="text-ink">Booking records:</strong> 7 years (for tax and legal compliance)
                </li>
                <li>
                  <strong className="text-ink">Payment records:</strong> 7 years (financial regulations)
                </li>
                <li>
                  <strong className="text-ink">Account data:</strong> Until account deletion request + 30-day grace period
                </li>
                <li>
                  <strong className="text-ink">Analytics data:</strong> 2 years (anonymised after 90 days)
                </li>
                <li>
                  <strong className="text-ink">Session cookies:</strong> Duration of browser session
                </li>
              </ul>
            </section>

            <section id="cookies" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">6. Cookies</h2>
              <p>
                We use essential, analytical, and third-party cookies. For full details, see our{' '}
                <Link href="/legal/cookies" className="text-brand-gold-dark hover:underline">
                  Cookie Policy
                </Link>
                . You can manage your cookie preferences at any time.
              </p>
            </section>

            <section id="third-party" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">7. Third-Party Services</h2>
              <p>We share data with the following trusted third parties:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong className="text-ink">Stripe:</strong> Payment processing — governed by{' '}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-gold-dark hover:underline"
                  >
                    Stripe&apos;s Privacy Policy
                  </a>
                </li>
                <li>
                  <strong className="text-ink">PostHog:</strong> Product analytics (anonymised usage data)
                </li>
                <li>
                  <strong className="text-ink">Airport service suppliers:</strong> Your booking details are shared with the supplier fulfilling your service
                </li>
              </ul>
            </section>

            <section id="contact">
              <h2 className="text-xl font-semibold text-ink mb-3">8. Contact</h2>
              <p>
                For privacy-related enquiries, contact our Data Protection team at{' '}
                <a href="mailto:privacy@airportfaster.com" className="text-brand-gold-dark hover:underline">
                  privacy@airportfaster.com
                </a>
                .
              </p>
            </section>
          </article>
        </div>
      </section>
    </div>
  );
}
