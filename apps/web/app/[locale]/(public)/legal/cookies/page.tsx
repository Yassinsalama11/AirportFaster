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
    pageTitle: 'Cookie Policy',
    metaDescription: 'Learn how AirportFaster uses cookies and how you can manage your cookie preferences.',
    lastUpdated: (year: number) => `Last updated: ${year}.`,
    breadcrumbHome: 'Home',
    breadcrumbLegal: 'Legal',
    breadcrumbCurrent: 'Cookies',
    onThisPage: 'On this page',
    sections: [
      { id: 'what', title: 'What Are Cookies?' },
      { id: 'we-use', title: 'Cookies We Use' },
      { id: 'opt-out', title: 'How to Opt Out' },
      { id: 'contact', title: 'Contact' },
    ] as Section[],
  },
  ar: {
    pageTitle: 'سياسة ملفات تعريف الارتباط',
    metaDescription: 'تعرف على كيفية استخدام AirportFaster لملفات تعريف الارتباط وكيف يمكنك إدارة تفضيلاتها.',
    lastUpdated: (year: number) => `آخر تحديث: ${year}.`,
    breadcrumbHome: 'الرئيسية',
    breadcrumbLegal: 'القانونية',
    breadcrumbCurrent: 'ملفات تعريف الارتباط',
    onThisPage: 'في هذه الصفحة',
    sections: [
      { id: 'what', title: 'ما هي ملفات تعريف الارتباط؟' },
      { id: 'we-use', title: 'ملفات تعريف الارتباط التي نستخدمها' },
      { id: 'opt-out', title: 'كيفية إلغاء الاشتراك' },
      { id: 'contact', title: 'التواصل' },
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
      url: `${BASE_URL}/${locale}/legal/cookies`,
      ...ogLocales(locale),
    },
    alternates: localeAlternates('/legal/cookies', locale),
  };
}

export default async function CookiePolicyPage({
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
          <Link href="/legal/cookies" className="hover:text-ink transition-colors">
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
                <section id="what" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">ما هي ملفات تعريف الارتباط؟</h2>
                  <p>
                    ملفات تعريف الارتباط هي ملفات نصية صغيرة تُوضع على جهازك عند زيارتك لموقع ويب. تُستخدم على نطاق واسع لجعل مواقع الويب تعمل بكفاءة وتزويد أصحاب الموقع بمعلومات. يمكن أن تكون ملفات تعريف الارتباط «لجلسة» (تُحذف عند إغلاق متصفحك) أو «دائمة» (تبقى على جهازك لفترة محددة).
                  </p>
                </section>

                <section id="we-use" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">ملفات تعريف الارتباط التي نستخدمها</h2>

                  <h3 className="text-lg font-semibold text-ink mt-6 mb-2">ملفات تعريف الارتباط الأساسية</h3>
                  <p>هذه الملفات ضرورية لعمل المنصة ولا يمكن تعطيلها.</p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">ملف تعريف الارتباط</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">الغرض</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">المدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">airportfaster_session</td>
                          <td className="px-4 py-3 text-ink-2">يحافظ على جلسة تسجيل الدخول الخاصة بك</td>
                          <td className="px-4 py-3 text-ink-2">الجلسة</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">cookie_consent</td>
                          <td className="px-4 py-3 text-ink-2">يتذكر تفضيلات ملفات تعريف الارتباط الخاصة بك</td>
                          <td className="px-4 py-3 text-ink-2">سنة واحدة</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-ink mt-8 mb-2">ملفات تعريف الارتباط التحليلية (PostHog)</h3>
                  <p>
                    نستخدم PostHog لجمع بيانات مجهولة حول كيفية تفاعل المستخدمين مع منصتنا. يساعدنا ذلك على تحسين تجربة المستخدم. لا تُشارك أي معلومات تعريفية شخصية مع PostHog إلا معرفات مجهولة.
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">ملف تعريف الارتباط</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">الغرض</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">المدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">ph_*</td>
                          <td className="px-4 py-3 text-ink-2">تتبع جلسات PostHog والمعرفات المميزة</td>
                          <td className="px-4 py-3 text-ink-2">سنة واحدة</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-ink mt-8 mb-2">ملفات تعريف الارتباط للدفع (Stripe)</h3>
                  <p>
                    يضع Stripe، معالج الدفع لدينا، ملفات تعريف الارتباط للحد من الاحتيال وضمان أمان معالجة الدفع. تخضع هذه الملفات لـ{' '}
                    <a
                      href="https://stripe.com/cookie-settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold-dark hover:underline"
                    >
                      سياسة ملفات تعريف الارتباط الخاصة بـ Stripe
                    </a>
                    .
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">ملف تعريف الارتباط</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">الغرض</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">المدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">__stripe_*</td>
                          <td className="px-4 py-3 text-ink-2">منع الاحتيال وأمان الدفع</td>
                          <td className="px-4 py-3 text-ink-2">متفاوت</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="opt-out" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">كيفية إلغاء الاشتراك</h2>
                  <p>يمكنك إدارة تفضيلات ملفات تعريف الارتباط بطريقتين:</p>
                  <ul className="list-disc list-inside mt-2 space-y-2">
                    <li>
                      <strong className="text-ink">شريط ملفات تعريف الارتباط:</strong> عند زيارتك الأولى لـ AirportFaster، ستظهر لك لافتة يمكنك من خلالها قبول ملفات تعريف الارتباط غير الأساسية أو رفضها.
                    </li>
                    <li>
                      <strong className="text-ink">إعدادات المتصفح:</strong> تتيح معظم المتصفحات رفض ملفات تعريف الارتباط أو حذف الملفات التي تم تعيينها بالفعل. يُرجى ملاحظة أن حظر جميع ملفات تعريف الارتباط قد يؤثر على قدرتك على استخدام بعض ميزات منصتنا.
                    </li>
                  </ul>
                  <p className="mt-3">
                    لمسح تفضيلات ملفات تعريف الارتباط وإعادة عرض اللافتة، امسح localStorage في متصفحك أو تصفح في وضع التصفح الخاص / وضع التخفي.
                  </p>
                </section>

                <section id="contact">
                  <h2 className="text-xl font-semibold text-ink mb-3">التواصل</h2>
                  <p>
                    للاستفسار عن استخدامنا لملفات تعريف الارتباط، تواصل معنا على{' '}
                    <a href="mailto:privacy@airportfaster.com" className="text-brand-gold-dark hover:underline">
                      privacy@airportfaster.com
                    </a>
                    .
                  </p>
                </section>
              </>
            ) : (
              <>
                <section id="what" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">What Are Cookies?</h2>
                  <p>
                    Cookies are small text files placed on your device when you visit a website. They
                    are widely used to make websites work efficiently and to provide information to the
                    site owners. Cookies can be &ldquo;session&rdquo; cookies (deleted when you close
                    your browser) or &ldquo;persistent&rdquo; cookies (remain on your device for a set
                    period).
                  </p>
                </section>

                <section id="we-use" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">Cookies We Use</h2>

                  <h3 className="text-lg font-semibold text-ink mt-6 mb-2">Essential Cookies</h3>
                  <p>These cookies are necessary for the platform to function. They cannot be disabled.</p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">Cookie</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Purpose</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">airportfaster_session</td>
                          <td className="px-4 py-3 text-ink-2">Maintains your admin login session</td>
                          <td className="px-4 py-3 text-ink-2">Session</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">cookie_consent</td>
                          <td className="px-4 py-3 text-ink-2">Remembers your cookie preference</td>
                          <td className="px-4 py-3 text-ink-2">1 year</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-ink mt-8 mb-2">Analytics Cookies (PostHog)</h3>
                  <p>
                    We use PostHog to collect anonymised data about how users interact with our
                    platform. This helps us improve the user experience. No personally identifiable
                    information is shared with PostHog beyond anonymised identifiers.
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">Cookie</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Purpose</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">ph_*</td>
                          <td className="px-4 py-3 text-ink-2">PostHog session and distinct ID tracking</td>
                          <td className="px-4 py-3 text-ink-2">1 year</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3 className="text-lg font-semibold text-ink mt-8 mb-2">Payment Cookies (Stripe)</h3>
                  <p>
                    Stripe, our payment processor, sets cookies to prevent fraud and ensure secure
                    payment processing. These cookies are governed by{' '}
                    <a
                      href="https://stripe.com/cookie-settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold-dark hover:underline"
                    >
                      Stripe&apos;s cookie policy
                    </a>
                    .
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-2 border-b border-line">
                          <th className="px-4 py-3 text-start text-ink font-semibold">Cookie</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Purpose</th>
                          <th className="px-4 py-3 text-start text-ink font-semibold">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        <tr>
                          <td className="px-4 py-3 font-mono text-ink-2">__stripe_*</td>
                          <td className="px-4 py-3 text-ink-2">Fraud prevention and payment security</td>
                          <td className="px-4 py-3 text-ink-2">Varies</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="opt-out" className="mb-10">
                  <h2 className="text-xl font-semibold text-ink mb-3">How to Opt Out</h2>
                  <p>You can manage your cookie preferences in two ways:</p>
                  <ul className="list-disc list-inside mt-2 space-y-2">
                    <li>
                      <strong className="text-ink">Cookie banner:</strong> When you first visit
                      AirportFaster, you will be shown a banner where you can accept or decline non-essential
                      cookies.
                    </li>
                    <li>
                      <strong className="text-ink">Browser settings:</strong> Most browsers allow you to
                      refuse cookies or delete cookies that have already been set. Please note that
                      blocking all cookies may affect your ability to use some features of our platform.
                    </li>
                  </ul>
                  <p className="mt-3">
                    To clear your cookie preference and see the banner again, clear your browser&apos;s
                    localStorage or browse in private/incognito mode.
                  </p>
                </section>

                <section id="contact">
                  <h2 className="text-xl font-semibold text-ink mb-3">Contact</h2>
                  <p>
                    For questions about our cookie use, contact{' '}
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
