import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Handshake,
  Plane,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, FadeInItem, FadeInStagger } from '@/components/ui/fade-in';
import { SchemaScript } from '@/components/public/SchemaScript';
import { breadcrumbSchema } from '@/lib/schema';
import { localeAlternates, ogLocales } from '@/lib/seo';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=85';

const copy = {
  en: {
    metaTitle: 'About AirportFaster | Premium Airport Services Worldwide',
    metaDescription:
      'AirportFaster is a global airport services platform for Fast Track, Meet & Greet, and Lounge Access at international airports.',
    breadcrumb: 'About',
    home: 'Home',
    eyebrow: 'About AirportFaster',
    title: 'A smoother airport experience, built for modern travel.',
    intro:
      'AirportFaster is a global airport services platform designed to simplify and enhance the airport experience for travellers worldwide.',
    primaryCta: 'Find your airport',
    secondaryCta: 'Partner with us',
    directAnswerTitle: 'What is AirportFaster?',
    directAnswer:
      'AirportFaster helps passengers book premium airport services such as Fast Track, Meet & Greet, and Lounge Access through one seamless digital booking experience.',
    missionTitle: 'Our Mission',
    mission:
      'Our mission is to make airports faster, smoother, and less stressful, whether travellers are flying for business, family trips, luxury experiences, or international connections.',
    platformTitle: 'A Platform For Premium Airport Services',
    platform:
      'We combine travel technology, operational expertise, and a growing international partner network to deliver reliable airport assistance with a strong focus on convenience, speed, and customer experience.',
    poweredTitle: 'Powered By Travel Operations Experience',
    powered:
      'AirportFaster is powered by the team behind Sinai Taxi, an international transportation and travel operations company serving travellers across multiple countries and destinations worldwide.',
    futureTitle: 'Building The Next Generation Of Airport Services',
    future:
      'By combining airport services, operational infrastructure, and scalable travel technology, AirportFaster is building a next-generation platform for premium airport experiences.',
    valuesTitle: 'What We Stand For',
    servicesTitle: 'Services You Can Book',
    ctaTitle: 'Move through the airport with less friction.',
    ctaBody:
      'Search your airport, choose the service you need, and book a premium airport experience in minutes.',
    stats: [
      ['Global platform', 'Built for international airport coverage'],
      ['Premium services', 'Fast Track, Meet & Greet, and Lounge Access'],
      ['Operations led', 'Designed around reliable fulfilment and traveller support'],
    ],
    values: [
      ['Speed', 'We reduce airport friction so travellers can move with confidence.'],
      ['Reliability', 'We focus on clear processes, trusted partners, and operational visibility.'],
      ['Experience', 'We design for calm, premium, and human travel moments.'],
    ],
    services: [
      ['Fast Track', 'Priority airport processing for travellers who value time.'],
      ['Meet & Greet', 'Personal airport assistance from arrival to departure.'],
      ['Lounge Access', 'Comfortable airport lounge experiences before a flight.'],
    ],
  },
  ar: {
    metaTitle: 'من نحن | AirportFaster',
    metaDescription:
      'AirportFaster منصة عالمية لخدمات المطارات المميزة مثل المسار السريع والاستقبال ودخول الصالات في المطارات الدولية.',
    breadcrumb: 'من نحن',
    home: 'الرئيسية',
    eyebrow: 'من نحن',
    title: 'تجربة مطار أكثر سلاسة للمسافر الحديث.',
    intro:
      'AirportFaster منصة عالمية لخدمات المطارات صُممت لتبسيط تجربة السفر داخل المطار وتحسينها للمسافرين حول العالم.',
    primaryCta: 'ابحث عن مطارك',
    secondaryCta: 'اشترك معنا',
    directAnswerTitle: 'ما هي AirportFaster؟',
    directAnswer:
      'تساعد AirportFaster المسافرين على حجز خدمات مطار مميزة مثل المسار السريع، الاستقبال والتوديع، ودخول الصالات عبر تجربة رقمية سهلة وموحدة.',
    missionTitle: 'مهمتنا',
    mission:
      'مهمتنا هي جعل المطارات أسرع وأسهل وأقل توتراً للمسافرين، سواء كان السفر للعمل أو العائلة أو التجارب الفاخرة أو رحلات الربط الدولية.',
    platformTitle: 'منصة لخدمات المطارات المميزة',
    platform:
      'نجمع بين تكنولوجيا السفر، والخبرة التشغيلية، وشبكة شركاء دولية متنامية لتقديم خدمات مساعدة موثوقة داخل المطارات مع تركيز قوي على الراحة والسرعة وتجربة العميل.',
    poweredTitle: 'مدعومة بخبرة تشغيلية في قطاع السفر',
    powered:
      'تعمل AirportFaster بواسطة الفريق وراء Sinai Taxi، وهي شركة نقل وعمليات سفر دولية تخدم المسافرين في عدة دول ووجهات حول العالم.',
    futureTitle: 'نبني الجيل القادم من خدمات المطارات',
    future:
      'من خلال الجمع بين خدمات المطارات والبنية التشغيلية وتكنولوجيا السفر القابلة للتوسع، تبني AirportFaster منصة جديدة لتجارب المطارات المميزة.',
    valuesTitle: 'ما الذي نؤمن به',
    servicesTitle: 'الخدمات التي يمكنك حجزها',
    ctaTitle: 'اعبر المطار بسلاسة أكبر.',
    ctaBody: 'ابحث عن مطارك، اختر الخدمة المناسبة، واحجز تجربة مطار مميزة خلال دقائق.',
    stats: [
      ['منصة عالمية', 'مصممة لتغطية المطارات الدولية'],
      ['خدمات مميزة', 'المسار السريع، الاستقبال والتوديع، ودخول الصالات'],
      ['تشغيل موثوق', 'مصممة حول تنفيذ موثوق ودعم واضح للمسافرين'],
    ],
    values: [
      ['السرعة', 'نقلل تعقيدات المطار حتى يتحرك المسافر بثقة.'],
      ['الموثوقية', 'نركز على العمليات الواضحة والشركاء الموثوقين والرؤية التشغيلية.'],
      ['التجربة', 'نصمم لحظات سفر هادئة ومميزة وإنسانية.'],
    ],
    services: [
      ['المسار السريع', 'إجراءات أولوية داخل المطار للمسافرين الذين يقدرون وقتهم.'],
      ['الاستقبال والتوديع', 'مساعدة شخصية داخل المطار من الوصول إلى المغادرة.'],
      ['دخول الصالات', 'تجارب صالات مريحة قبل الرحلة.'],
    ],
  },
} as const;

function getCopy(locale: string) {
  return locale === 'ar' ? copy.ar : copy.en;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = getCopy(locale);

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${BASE_URL}/${locale}/about`,
      images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: c.metaTitle }],
      ...ogLocales(locale),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@airportfaster',
      title: c.metaTitle,
      description: c.metaDescription,
    },
    alternates: localeAlternates('/about', locale),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = getCopy(locale);

  const breadcrumb = breadcrumbSchema([
    { name: c.home, url: `${BASE_URL}/${locale}` },
    { name: c.breadcrumb, url: `${BASE_URL}/${locale}/about` },
  ]);

  const storyBlocks = [
    { title: c.missionTitle, body: c.mission },
    { title: c.platformTitle, body: c.platform },
    { title: c.poweredTitle, body: c.powered },
    { title: c.futureTitle, body: c.future },
  ];

  return (
    <>
      <SchemaScript schema={breadcrumb} />

      <main className="bg-bg">
        <section className="border-b border-line bg-surface-2/70">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-20">
            <nav className="flex items-center gap-2 text-sm text-ink-3 mb-10">
              <Link href="/" className="hover:text-ink transition-colors">
                {c.home}
              </Link>
              <span>/</span>
              <span className="text-ink">{c.breadcrumb}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.75fr] gap-12 lg:gap-16 items-center">
              <FadeIn>
                <div>
                  <Badge variant="gold" className="mb-6">
                    <Plane className="w-3.5 h-3.5 me-1.5" />
                    {c.eyebrow}
                  </Badge>
                  <h1 className="text-display-xl lg:text-display-2xl font-bold text-ink tracking-tight text-balance mb-6">
                    {c.title}
                  </h1>
                  <p className="text-body-xl text-ink-2 max-w-2xl leading-relaxed mb-8">
                    {c.intro}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="gold" size="lg" asChild>
                      <Link href="/search">
                        {c.primaryCta}
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link href="/for-business">{c.secondaryCta}</Link>
                    </Button>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <div className="relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
                  <Image
                    src={HERO_IMAGE_URL}
                    alt="Aircraft wing above clouds during international travel"
                    width={1200}
                    height={900}
                    priority
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-5 lg:px-8 py-14 lg:py-16">
          <FadeInStagger className="grid grid-cols-1 md:grid-cols-3 gap-4" staggerDelay={0.06}>
            {c.stats.map(([title, body]) => (
              <FadeInItem key={title}>
                <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-card">
                  <BadgeCheck className="w-5 h-5 text-brand-gold-dark mb-4" />
                  <h2 className="text-lg font-semibold text-ink mb-2">{title}</h2>
                  <p className="text-sm leading-relaxed text-ink-2">{body}</p>
                </div>
              </FadeInItem>
            ))}
          </FadeInStagger>
        </section>

        <section className="border-y border-line bg-surface-2">
          <div className="max-w-6xl mx-auto px-5 lg:px-8 py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1fr] gap-10 lg:gap-16">
              <FadeIn>
                <div className="lg:sticky lg:top-28">
                  <Badge variant="secondary" className="mb-5">
                    <Globe2 className="w-3.5 h-3.5 me-1.5" />
                    AirportFaster
                  </Badge>
                  <h2 className="text-display-sm font-bold text-ink tracking-tight text-balance">
                    {c.directAnswerTitle}
                  </h2>
                  <p className="mt-5 text-body-lg text-ink-2 leading-relaxed">{c.directAnswer}</p>
                </div>
              </FadeIn>

              <div className="space-y-5">
                {storyBlocks.map((block, index) => (
                  <FadeIn key={block.title} delay={index * 0.04}>
                    <article className="rounded-2xl border border-line bg-surface p-6 lg:p-7 shadow-card">
                      <h3 className="text-xl font-semibold text-ink mb-3">{block.title}</h3>
                      <p className="text-ink-2 leading-relaxed">{block.body}</p>
                    </article>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <FadeIn>
              <div>
                <Badge variant="gold" className="mb-5">
                  <ShieldCheck className="w-3.5 h-3.5 me-1.5" />
                  {c.valuesTitle}
                </Badge>
                <div className="space-y-4">
                  {c.values.map(([title, body]) => (
                    <div key={title} className="rounded-2xl border border-line bg-surface p-6">
                      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <div>
                <Badge variant="secondary" className="mb-5">
                  <Sparkles className="w-3.5 h-3.5 me-1.5" />
                  {c.servicesTitle}
                </Badge>
                <div className="space-y-4">
                  {c.services.map(([title, body]) => (
                    <div key={title} className="rounded-2xl border border-line bg-surface p-6">
                      <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 lg:px-8 pb-20 lg:pb-24">
          <FadeIn>
            <div className="rounded-3xl border border-brand-gold/30 bg-brand-black px-6 py-10 lg:px-12 lg:py-12 text-center shadow-card">
              <Handshake className="mx-auto mb-5 h-8 w-8 text-brand-gold" />
              <h2 className="text-display-sm font-bold text-brand-off-white tracking-tight mb-4">
                {c.ctaTitle}
              </h2>
              <p className="mx-auto max-w-2xl text-white/70 leading-relaxed mb-8">{c.ctaBody}</p>
              <Button variant="gold" size="lg" asChild>
                <Link href="/search">
                  {c.primaryCta}
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        </section>
      </main>
    </>
  );
}
