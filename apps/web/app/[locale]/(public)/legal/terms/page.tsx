// STATIC: replace with lawyer-reviewed version before launch
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';

export const metadata: Metadata = {
  title: 'Terms of Service | AirportFaster',
  description: 'Read the Terms of Service for AirportFaster — the premium airport services marketplace.',
};

const SECTIONS = [
  { id: 'acceptance', title: '1. Acceptance of Terms' },
  { id: 'booking', title: '2. Booking Conditions' },
  { id: 'cancellation', title: '3. Cancellation Policy' },
  { id: 'liability', title: '4. Liability Limitations' },
  { id: 'disputes', title: '5. Dispute Resolution' },
  { id: 'ip', title: '6. Intellectual Property' },
  { id: 'changes', title: '7. Changes to Terms' },
  { id: 'contact', title: '8. Contact' },
];

export default function TermsOfServicePage() {
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
          <Link href="/legal/terms" className="hover:text-ink transition-colors">
            Legal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">Terms</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        <FadeIn>
          <h1 className="text-display-md font-bold text-ink tracking-tight mb-3">
            Terms of Service
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
            <section id="acceptance" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the AirportFaster platform (&ldquo;Service&rdquo;), you agree to be
                bound by these Terms of Service. If you do not agree to these terms, please do not
                use the Service.
              </p>
            </section>

            <section id="booking" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">2. Booking Conditions</h2>
              <p>
                All bookings made through AirportFaster are subject to availability and confirmation by
                our service partners. A booking is confirmed only when you receive a written
                confirmation email with a booking reference number. Prices displayed are inclusive
                of all fees unless stated otherwise.
              </p>
              <p className="mt-2">
                You are responsible for ensuring that all passenger details provided at the time of
                booking are accurate. AirportFaster is not liable for service disruptions caused by
                inaccurate passenger information.
              </p>
            </section>

            <section id="cancellation" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">3. Cancellation Policy</h2>
              <p>
                Cancellations made more than 48 hours before the scheduled service time are eligible
                for a full refund. Cancellations made between 24 and 48 hours before the service are
                subject to a 50% cancellation fee. Cancellations made less than 24 hours before the
                service are non-refundable.
              </p>
              <p className="mt-2">
                In the event of flight cancellations or significant delays, please contact our
                support team to discuss rebooking options. We will make reasonable efforts to
                accommodate changes where operationally possible.
              </p>
            </section>

            <section id="liability" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">4. Liability Limitations</h2>
              <p>
                AirportFaster acts as a marketplace connecting travelers with third-party airport service
                providers. We do not directly provide the airport services. To the maximum extent
                permitted by applicable law, AirportFaster shall not be liable for:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Any failure or delay in service delivery by third-party suppliers</li>
                <li>Loss or damage to personal property</li>
                <li>Indirect, consequential, or punitive damages</li>
                <li>Travel disruptions outside our reasonable control (force majeure)</li>
              </ul>
              <p className="mt-2">
                Our total liability to you for any claim shall not exceed the amount paid for the
                specific booking giving rise to the claim.
              </p>
            </section>

            <section id="disputes" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">5. Dispute Resolution</h2>
              <p>
                In the event of a dispute, please first contact our customer support team. We aim to
                resolve all disputes within 14 business days. If a resolution cannot be reached
                through our internal process, disputes shall be subject to binding arbitration under
                the rules of the relevant jurisdiction.
              </p>
              <p className="mt-2">
                These Terms are governed by and construed in accordance with applicable law. You
                agree to submit to the exclusive jurisdiction of the courts of the applicable
                jurisdiction for any disputes not resolved through arbitration.
              </p>
            </section>

            <section id="ip" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">6. Intellectual Property</h2>
              <p>
                All content on the AirportFaster platform, including but not limited to text, graphics,
                logos, and software, is the property of AirportFaster or its content suppliers and is
                protected by intellectual property laws. You may not reproduce, distribute, or
                create derivative works without our express written consent.
              </p>
            </section>

            <section id="changes" className="mb-10">
              <h2 className="text-xl font-semibold text-ink mb-3">7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective
                upon posting to the platform. Your continued use of the Service after changes are
                posted constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section id="contact">
              <h2 className="text-xl font-semibold text-ink mb-3">8. Contact</h2>
              <p>
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@airportfaster.com" className="text-brand-gold-dark hover:underline">
                  legal@airportfaster.com
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
