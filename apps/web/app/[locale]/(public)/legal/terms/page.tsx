// STATIC: replace with lawyer-reviewed version before launch
import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';
import { localeAlternates, ogLocales } from '@/lib/seo';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

interface Section { id: string; title: string; }

const CONTENT = {
  en: {
    pageTitle: 'Terms of Service',
    metaDescription: 'Read the Terms of Service for AirportFaster — the premium airport services marketplace.',
    lastUpdated: (year: number) => `Last updated: ${year}. Effective immediately.`,
    breadcrumbHome: 'Home',
    breadcrumbLegal: 'Legal',
    breadcrumbCurrent: 'Terms',
    onThisPage: 'On this page',
    sections: [
      { id: 'acceptance', title: '1. Acceptance of Terms' },
      { id: 'booking', title: '2. Booking Conditions' },
      { id: 'cancellation', title: '3. Cancellation Policy' },
      { id: 'liability', title: '4. Liability Limitations' },
      { id: 'disputes', title: '5. Dispute Resolution' },
      { id: 'ip', title: '6. Intellectual Property' },
      { id: 'changes', title: '7. Changes to Terms' },
      { id: 'contact', title: '8. Contact' },
    ] as Section[],
  },
  ar: {
    pageTitle: 'شروط الخدمة',
    metaDescription: 'اقرأ شروط الخدمة الخاصة بـ AirportFaster — السوق المتميزة لخدمات المطارات.',
    lastUpdated: (year: number) => `آخر تحديث: ${year}. ساري المفعول فورًا.`,
    breadcrumbHome: 'الرئيسية',
    breadcrumbLegal: 'القانونية',
    breadcrumbCurrent: 'الشروط',
    onThisPage: 'في هذه الصفحة',
    sections: [
      { id: 'acceptance', title: '١. قبول الشروط' },
      { id: 'booking', title: '٢. شروط الحجز' },
      { id: 'cancellation', title: '٣. سياسة الإلغاء' },
      { id: 'liability', title: '٤. حدود المسؤولية' },
      { id: 'disputes', title: '٥. تسوية النزاعات' },
      { id: 'ip', title: '٦. الملكية الفكرية' },
      { id: 'changes', title: '٧. التعديلات على الشروط' },
      { id: 'contact', title: '٨. التواصل' },
    ] as Section[],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = CONTENT[locale as keyof typeof CONTENT] ?? CONTENT.en;
  return {
    title: `${c.pageTitle} | AirportFaster`,
    description: c.metaDescription,
    openGraph: {
      title: `${c.pageTitle} | AirportFaster`,
      description: c.metaDescription,
      url: `${BASE_URL}/${locale}/legal/terms`,
      ...ogLocales(locale),
    },
    alternates: localeAlternates('/legal/terms', locale),
  };
}

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const c = CONTENT[locale as keyof typeof CONTENT] ?? CONTENT.en;
  const isAr = locale === 'ar';
  const year = new Date().getFullYear();

  return (
    <div className="bg-bg" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            {c.breadcrumbHome}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <Link href="/legal/terms" className="hover:text-ink transition-colors">
            {c.breadcrumbLegal}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">{c.breadcrumbCurrent}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        <FadeIn>
          <h1 className="text-display-md font-bold text-ink tracking-tight mb-3">
            {c.pageTitle}
          </h1>
          <p className="text-sm text-ink-3">{c.lastUpdated(year)}</p>
        </FadeIn>
      </section>

      {/* Two-column layout */}
      <section className="max-w-4xl mx-auto px-5 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 lg:gap-12">
          {/* TOC sidebar */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="bg-surface rounded-2xl border border-line p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">
                {c.onThisPage}
              </p>
              <nav className="flex flex-col gap-1.5">
                {c.sections.map((s) => (
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
            {isAr ? (
              <>
                <section id="acceptance" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">١. قبول الشروط</h2>
                  <p>
                    بالوصول إلى منصة AirportFaster («الخدمة») أو استخدامها، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام الخدمة.
                  </p>
                </section>

                <section id="booking" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٢. شروط الحجز</h2>
                  <p>
                    تخضع جميع الحجوزات المُجراة عبر AirportFaster للتوافر والتأكيد من قِبَل شركائنا في الخدمة. لا يُعتبر الحجز مؤكدًا إلا عند تلقيك بريد تأكيد مكتوب يتضمن رقم مرجع الحجز. الأسعار المعروضة تشمل جميع الرسوم ما لم يُذكر خلاف ذلك.
                  </p>
                  <p className="mt-2">
                    أنت مسؤول عن التأكد من دقة جميع تفاصيل الركاب المقدمة عند الحجز. لا تتحمل AirportFaster المسؤولية عن أي اضطرابات في الخدمة ناجمة عن معلومات ركاب غير دقيقة.
                  </p>
                </section>

                <section id="cancellation" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٣. سياسة الإلغاء</h2>
                  <p>
                    الإلغاءات التي تتم قبل أكثر من 48 ساعة من وقت الخدمة المحدد تستحق استردادًا كاملًا. الإلغاءات التي تتم بين 24 و48 ساعة قبل الخدمة تخضع لرسوم إلغاء بنسبة 50%. الإلغاءات التي تتم في غضون أقل من 24 ساعة قبل الخدمة غير قابلة للاسترداد.
                  </p>
                  <p className="mt-2">
                    في حالة إلغاء الرحلات أو تأخيرها بشكل كبير، يرجى التواصل مع فريق الدعم لمناقشة خيارات إعادة الحجز. سنبذل جهودًا معقولة لاستيعاب التغييرات حيثما أمكن تشغيليًا.
                  </p>
                </section>

                <section id="liability" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٤. حدود المسؤولية</h2>
                  <p>
                    تعمل AirportFaster بوصفها سوقًا يربط المسافرين بمزودي خدمات المطار من الأطراف الثالثة. نحن لا نقدم خدمات المطار بشكل مباشر. إلى أقصى حد يسمح به القانون المعمول به، لا تتحمل AirportFaster المسؤولية عن:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>أي إخفاق أو تأخير في تقديم الخدمة من قِبَل الموردين الخارجيين</li>
                    <li>الخسارة أو الضرر الذي يلحق بالممتلكات الشخصية</li>
                    <li>الأضرار غير المباشرة أو التبعية أو العقابية</li>
                    <li>اضطرابات السفر خارجة عن سيطرتنا المعقولة (القوة القاهرة)</li>
                  </ul>
                  <p className="mt-2">
                    لا تتجاوز مسؤوليتنا الإجمالية تجاهك بأي مطالبة المبلغ المدفوع للحجز المحدد الذي نشأ عنه المطالبة.
                  </p>
                </section>

                <section id="disputes" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٥. تسوية النزاعات</h2>
                  <p>
                    في حال نشوء نزاع، يرجى التواصل أولًا مع فريق خدمة العملاء لدينا. نهدف إلى حل جميع النزاعات خلال 14 يوم عمل. إذا تعذّر التوصل إلى حل من خلال إجراءاتنا الداخلية، تخضع النزاعات للتحكيم الملزم وفقًا لقواعد الاختصاص القضائي المعمول به.
                  </p>
                  <p className="mt-2">
                    تخضع هذه الشروط للقانون المعمول به وتُفسَّر وفقًا له. توافق على الخضوع للاختصاص القضائي الحصري لمحاكم الاختصاص المعمول به لأي نزاعات لم يتم حلها عبر التحكيم.
                  </p>
                </section>

                <section id="ip" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٦. الملكية الفكرية</h2>
                  <p>
                    جميع المحتويات على منصة AirportFaster، بما فيها على سبيل المثال لا الحصر النصوص والرسوم والشعارات والبرامج، هي ملك لـ AirportFaster أو لموردي محتواها وتحميها قوانين الملكية الفكرية. لا يجوز لك إعادة إنتاجها أو توزيعها أو إنشاء أعمال مشتقة منها دون موافقتنا الكتابية الصريحة.
                  </p>
                </section>

                <section id="changes" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٧. التعديلات على الشروط</h2>
                  <p>
                    نحتفظ بالحق في تعديل هذه الشروط في أي وقت. تسري التعديلات فور نشرها على المنصة. استمرارك في استخدام الخدمة بعد نشر التعديلات يُعدّ قبولًا منك للشروط المعدّلة.
                  </p>
                </section>

                <section id="contact">
                  <h2 className="text-xl font-semibold text-ink mb-3">٨. التواصل</h2>
                  <p>
                    للاستفسار عن هذه الشروط، يرجى التواصل معنا على{' '}
                    <a href="mailto:legal@airportfaster.com" className="text-brand-gold-dark hover:underline">
                      legal@airportfaster.com
                    </a>
                    .
                  </p>
                </section>
              </>
            ) : (
              <>
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
              </>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
