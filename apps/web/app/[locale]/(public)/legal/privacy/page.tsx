// STATIC: review with legal counsel before launch
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
    pageTitle: 'Privacy Policy',
    metaDescription: 'Learn how AirportFaster collects, uses, and protects your personal data.',
    lastUpdated: (year: number) => `Last updated: ${year}. Effective immediately.`,
    breadcrumbHome: 'Home',
    breadcrumbLegal: 'Legal',
    breadcrumbCurrent: 'Privacy',
    onThisPage: 'On this page',
    sections: [
      { id: 'data', title: '1. Data We Collect' },
      { id: 'use', title: '2. How We Use Your Data' },
      { id: 'legal-basis', title: '3. Legal Basis (GDPR)' },
      { id: 'rights', title: '4. Your GDPR Rights' },
      { id: 'retention', title: '5. Data Retention' },
      { id: 'cookies', title: '6. Cookies' },
      { id: 'third-party', title: '7. Third-Party Services' },
      { id: 'contact', title: '8. Contact' },
    ] as Section[],
  },
  ar: {
    pageTitle: 'سياسة الخصوصية',
    metaDescription: 'تعرف على كيفية جمع AirportFaster لبياناتك الشخصية واستخدامها وحمايتها.',
    lastUpdated: (year: number) => `آخر تحديث: ${year}. ساري المفعول فورًا.`,
    breadcrumbHome: 'الرئيسية',
    breadcrumbLegal: 'القانونية',
    breadcrumbCurrent: 'الخصوصية',
    onThisPage: 'في هذه الصفحة',
    sections: [
      { id: 'data', title: '١. البيانات التي نجمعها' },
      { id: 'use', title: '٢. كيف نستخدم بياناتك' },
      { id: 'legal-basis', title: '٣. الأساس القانوني (GDPR)' },
      { id: 'rights', title: '٤. حقوقك بموجب GDPR' },
      { id: 'retention', title: '٥. الاحتفاظ بالبيانات' },
      { id: 'cookies', title: '٦. ملفات تعريف الارتباط' },
      { id: 'third-party', title: '٧. خدمات الطرف الثالث' },
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
      url: `${BASE_URL}/${locale}/legal/privacy`,
      ...ogLocales(locale),
    },
    alternates: localeAlternates('/legal/privacy', locale),
  };
}

export default async function PrivacyPolicyPage({
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
          <Link href="/legal/privacy" className="hover:text-ink transition-colors">
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
                <section id="data" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">١. البيانات التي نجمعها</h2>
                  <p>عند استخدامك لـ AirportFaster، نجمع الفئات التالية من البيانات:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-ink">بيانات الهوية:</strong> الاسم الكامل وعنوان البريد الإلكتروني ورقم الهاتف</li>
                    <li><strong className="text-ink">بيانات الحجز:</strong> تفاصيل الركاب وتواريخ الخدمة ومعلومات الرحلة والطلبات الخاصة</li>
                    <li><strong className="text-ink">بيانات الدفع:</strong> تفاصيل بطاقة الدفع (تُعالج عبر Stripe — لا نخزن أرقام البطاقات الأصلية)</li>
                    <li><strong className="text-ink">بيانات الاستخدام:</strong> الصفحات التي تمت زيارتها وعمليات البحث ونوع الجهاز وعنوان IP ونوع المتصفح (تُجمع عبر تحليلات PostHog)</li>
                    <li><strong className="text-ink">بيانات ملفات تعريف الارتباط:</strong> معرفات الجلسة وإعدادات التفضيلات</li>
                  </ul>
                </section>

                <section id="use" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٢. كيف نستخدم بياناتك</h2>
                  <p>نستخدم بياناتك الشخصية من أجل:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>معالجة حجوزاتك وإدارتها</li>
                    <li>إرسال تأكيدات الحجز وتحديثات الخدمة عبر البريد الإلكتروني</li>
                    <li>معالجة المدفوعات بأمان عبر معالج الدفع لدينا (Stripe)</li>
                    <li>تحسين منصتنا من خلال التحليلات المجهولة</li>
                    <li>الامتثال للالتزامات القانونية</li>
                    <li>منع الاحتيال وضمان أمان المنصة</li>
                  </ul>
                  <p className="mt-2">
                    لا نبيع بياناتك الشخصية لأطراف ثالثة. ولا نستخدم بياناتك في التسويق غير المرغوب فيه دون موافقتك الصريحة.
                  </p>
                </section>

                <section id="legal-basis" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٣. الأساس القانوني (GDPR)</h2>
                  <p>بالنسبة للمستخدمين في المنطقة الاقتصادية الأوروبية، نعالج بياناتك الشخصية على الأسس القانونية التالية:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-ink">تنفيذ العقد:</strong> المعالجة الضرورية لإتمام حجزك</li>
                    <li><strong className="text-ink">المصالح المشروعة:</strong> منع الاحتيال وأمان المنصة والتحليلات (المجهولة)</li>
                    <li><strong className="text-ink">الالتزام القانوني:</strong> الامتثال للمتطلبات الضريبية والمحاسبية والتنظيمية</li>
                    <li><strong className="text-ink">الموافقة:</strong> ملفات تعريف الارتباط غير الأساسية والاتصالات التسويقية الاختيارية</li>
                  </ul>
                </section>

                <section id="rights" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٤. حقوقك بموجب GDPR</h2>
                  <p>إذا كنت في المنطقة الاقتصادية الأوروبية، يحق لك:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>الوصول إلى نسخة من بياناتك الشخصية</li>
                    <li>تصحيح البيانات غير الدقيقة</li>
                    <li>طلب الحذف («الحق في النسيان»)</li>
                    <li>تقييد المعالجة أو الاعتراض عليها</li>
                    <li>نقل البيانات</li>
                    <li>سحب الموافقة في أي وقت</li>
                  </ul>
                  <p className="mt-2">
                    لممارسة أي من هذه الحقوق، تواصل معنا على{' '}
                    <a href="mailto:privacy@airportfaster.com" className="text-brand-gold-dark hover:underline">
                      privacy@airportfaster.com
                    </a>
                    . سنرد خلال 30 يومًا.
                  </p>
                </section>

                <section id="retention" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٥. الاحتفاظ بالبيانات</h2>
                  <p>نحتفظ ببياناتك للفترات التالية:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-ink">سجلات الحجز:</strong> 7 سنوات (للامتثال الضريبي والقانوني)</li>
                    <li><strong className="text-ink">سجلات الدفع:</strong> 7 سنوات (اللوائح المالية)</li>
                    <li><strong className="text-ink">بيانات الحساب:</strong> حتى طلب حذف الحساب + 30 يومًا كفترة سماح</li>
                    <li><strong className="text-ink">بيانات التحليلات:</strong> سنتان (مجهولة بعد 90 يومًا)</li>
                    <li><strong className="text-ink">ملفات تعريف الارتباط للجلسة:</strong> مدة جلسة المتصفح</li>
                  </ul>
                </section>

                <section id="cookies" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٦. ملفات تعريف الارتباط</h2>
                  <p>
                    نستخدم ملفات تعريف الارتباط الأساسية والتحليلية وملفات الطرف الثالث. لمزيد من التفاصيل، راجع{' '}
                    <Link href="/legal/cookies" className="text-brand-gold-dark hover:underline">
                      سياسة ملفات تعريف الارتباط
                    </Link>
                    . يمكنك إدارة تفضيلاتك في أي وقت.
                  </p>
                </section>

                <section id="third-party" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">٧. خدمات الطرف الثالث</h2>
                  <p>نشارك البيانات مع الأطراف الثالثة الموثوقة التالية:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      <strong className="text-ink">Stripe:</strong> معالجة الدفع — تخضع لـ{' '}
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-gold-dark hover:underline">
                        سياسة خصوصية Stripe
                      </a>
                    </li>
                    <li><strong className="text-ink">PostHog:</strong> تحليلات المنتج (بيانات الاستخدام المجهولة)</li>
                    <li><strong className="text-ink">موردو خدمات المطار:</strong> تفاصيل حجزك تُشارك مع المورد المنفذ لخدمتك</li>
                  </ul>
                </section>

                <section id="contact">
                  <h2 className="text-xl font-semibold text-ink mb-3">٨. التواصل</h2>
                  <p>
                    للاستفسارات المتعلقة بالخصوصية، تواصل مع فريق حماية البيانات لدينا على{' '}
                    <a href="mailto:privacy@airportfaster.com" className="text-brand-gold-dark hover:underline">
                      privacy@airportfaster.com
                    </a>
                    .
                  </p>
                </section>
              </>
            ) : (
              <>
                <section id="data" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">1. Data We Collect</h2>
                  <p>When you use AirportFaster, we collect the following categories of data:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong className="text-ink">Identity data:</strong> Full name, email address, phone number</li>
                    <li><strong className="text-ink">Booking data:</strong> Passenger details, service dates, flight information, special requests</li>
                    <li><strong className="text-ink">Payment data:</strong> Payment card details (processed by Stripe — we do not store raw card numbers)</li>
                    <li><strong className="text-ink">Usage data:</strong> Pages visited, search queries, device type, IP address, browser type (collected via PostHog analytics)</li>
                    <li><strong className="text-ink">Cookie data:</strong> Session identifiers and preference settings</li>
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
                    <li><strong className="text-ink">Contract performance:</strong> Processing necessary to fulfill your booking</li>
                    <li><strong className="text-ink">Legitimate interests:</strong> Fraud prevention, platform security, and analytics (anonymised)</li>
                    <li><strong className="text-ink">Legal obligation:</strong> Compliance with tax, accounting, and regulatory requirements</li>
                    <li><strong className="text-ink">Consent:</strong> Non-essential cookies and optional marketing communications</li>
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
                    <li><strong className="text-ink">Booking records:</strong> 7 years (for tax and legal compliance)</li>
                    <li><strong className="text-ink">Payment records:</strong> 7 years (financial regulations)</li>
                    <li><strong className="text-ink">Account data:</strong> Until account deletion request + 30-day grace period</li>
                    <li><strong className="text-ink">Analytics data:</strong> 2 years (anonymised after 90 days)</li>
                    <li><strong className="text-ink">Session cookies:</strong> Duration of browser session</li>
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
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-gold-dark hover:underline">
                        Stripe&apos;s Privacy Policy
                      </a>
                    </li>
                    <li><strong className="text-ink">PostHog:</strong> Product analytics (anonymised usage data)</li>
                    <li><strong className="text-ink">Airport service suppliers:</strong> Your booking details are shared with the supplier fulfilling your service</li>
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
              </>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
