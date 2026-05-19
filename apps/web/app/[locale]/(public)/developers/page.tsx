import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Code2,
  Zap,
  Shield,
  Globe,
  Clock,
  KeyRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, FadeInStagger, FadeInItem } from '@/components/ui/fade-in';

export const metadata = {
  title: 'Developer API | AirportFaster',
  description: 'Build with AirportFaster — programmatic access to airport services inventory',
};

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/search',
    title: 'Search Airports',
    description: 'Search available airports and services by IATA code, city, or name',
  },
  {
    method: 'GET',
    path: '/v1/airports/:iata',
    title: 'Get Airport',
    description: 'Retrieve full details, services, and availability for a specific airport',
  },
  {
    method: 'POST',
    path: '/v1/bookings',
    title: 'Create Booking',
    description: 'Book a Fast Track, Meet & Greet, or Lounge service for a passenger',
  },
  {
    method: 'GET',
    path: '/v1/bookings/:ref',
    title: 'Check Booking Status',
    description: 'Retrieve live status and details for a booking by reference',
  },
];

const METHOD_BADGE: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-700 border-blue-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

const FEATURES = [
  {
    icon: Zap,
    title: 'RESTful & predictable',
    desc: 'Clean JSON responses, idempotent operations, and consistent error shapes.',
  },
  {
    icon: Shield,
    title: 'Production grade',
    desc: 'PCI-compliant payments, 99.9% uptime, audited every quarter.',
  },
  {
    icon: Globe,
    title: 'Global coverage',
    desc: '200+ airports across Europe, the Middle East, and Asia — and growing.',
  },
  {
    icon: Clock,
    title: 'Real-time inventory',
    desc: 'Live availability, pricing, and instant booking confirmation.',
  },
];

export default function DevelopersPage() {
  return (
    <div className="bg-bg">
      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-5 lg:px-8 pt-6">
        <nav className="flex items-center gap-2 text-sm text-ink-3">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-ink">Developers</span>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        {/* Hero */}
        <FadeIn>
          <div className="text-center mb-16">
            <Badge variant="gold" className="mb-6">
              <Code2 className="w-3 h-3 me-1.5" />
              Developer API
            </Badge>
            <h1 className="text-display-xl font-bold text-ink tracking-tight text-balance mb-6">
              Build with{' '}
              <span className="gradient-text-gold">AirportFaster</span>
            </h1>
            <p className="text-body-xl text-ink-2 max-w-2xl mx-auto mb-10 text-balance">
              Access Fast Track, Meet &amp; Greet and Lounge inventory programmatically. Integrate
              premium airport services directly into your travel product.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="default" size="lg" asChild>
                <Link href="/for-business">
                  <KeyRound className="w-4 h-4" />
                  Get an API key
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#endpoints">
                  API documentation
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </a>
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Code snippet card */}
        <FadeIn delay={0.1}>
          <div className="bg-surface rounded-3xl border border-line shadow-card overflow-hidden mb-16">
            <div className="border-b border-line bg-surface-2 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
              </div>
              <span className="text-xs text-ink-3 font-mono">curl • bash</span>
            </div>
            <div className="p-6 overflow-x-auto" dir="ltr">
              <pre className="text-sm font-mono text-ink leading-relaxed">
                <span className="text-ink-3"># Search Dubai International (DXB)</span>
                {'\n'}
                {'curl '}
                <span className="text-brand-gold-dark">https://api.airportfaster.com/v1/search?q=DXB</span>
                {' \\\n  -H '}
                <span className="text-brand-gold-dark">&quot;X-API-Key: ap_live_...&quot;</span>
              </pre>
              <div className="mt-5 pt-5 border-t border-line">
                <p className="text-xs text-ink-3 mb-3 font-mono">Response</p>
                <pre className="text-sm font-mono text-ink-2 leading-relaxed">{`{
  "success": true,
  "data": {
    "airports": [
      {
        "iataCode": "DXB",
        "name": "Dubai International Airport",
        "services": ["fast_track", "meet_greet", "lounge"]
      }
    ]
  }
}`}</pre>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Features grid */}
        <section className="mb-16">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="secondary" className="mb-4">
                Why developers choose us
              </Badge>
              <h2 className="text-display-md font-bold text-ink tracking-tight">
                Built for production
              </h2>
            </div>
          </FadeIn>

          <FadeInStagger
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            staggerDelay={0.06}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <FadeInItem key={f.title}>
                  <div className="bg-surface rounded-2xl border border-line shadow-card p-6 h-full hover-lift hover:shadow-card-hover transition-shadow">
                    <div className="w-11 h-11 rounded-2xl bg-brand-gold/15 flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5 text-brand-gold-dark" />
                    </div>
                    <h3 className="text-body-md font-semibold text-ink mb-2 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-sm text-ink-2 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeInItem>
              );
            })}
          </FadeInStagger>
        </section>

        {/* Authentication + Base URL */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-16">
          <FadeIn>
            <div className="bg-surface rounded-2xl border border-line shadow-card p-6">
              <h3 className="text-body-lg font-semibold text-ink mb-3 tracking-tight">
                Authentication
              </h3>
              <p className="text-sm text-ink-2 mb-4">
                All requests must include your API key in the{' '}
                <code className="px-1.5 py-0.5 bg-brand-gold/15 text-brand-gold-dark rounded text-xs font-mono">
                  X-API-Key
                </code>{' '}
                header.
              </p>
              <div className="rounded-xl bg-surface-2 border border-line p-4" dir="ltr">
                <pre className="text-xs font-mono text-ink leading-relaxed">
                  <span className="text-ink-3">Header:</span>
                  {'\n'}
                  X-API-Key: ap_live_your_key_here
                </pre>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="bg-surface rounded-2xl border border-line shadow-card p-6">
              <h3 className="text-body-lg font-semibold text-ink mb-3 tracking-tight">
                Base URL
              </h3>
              <p className="text-sm text-ink-2 mb-4">
                All endpoints are versioned and served over HTTPS.
              </p>
              <div className="rounded-xl bg-surface-2 border border-line p-4 flex items-center justify-between" dir="ltr">
                <code className="text-sm font-mono text-ink">
                  https://api.airportfaster.com/v1
                </code>
                <Badge variant="success">Production</Badge>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Endpoints */}
        <section id="endpoints" className="mb-16">
          <FadeIn>
            <div className="mb-8">
              <h2 className="text-display-sm font-bold text-ink tracking-tight">Endpoints</h2>
              <p className="text-body-md text-ink-2 mt-2">
                A small surface area — that&apos;s all you need to integrate.
              </p>
            </div>
          </FadeIn>

          <FadeInStagger
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            staggerDelay={0.05}
          >
            {ENDPOINTS.map((ep) => (
              <FadeInItem key={ep.path}>
                <div className="bg-surface rounded-2xl border border-line shadow-card p-5 h-full hover-lift hover:shadow-card-hover transition-shadow">
                  <div className="flex items-center gap-3 mb-3" dir="ltr">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${METHOD_BADGE[ep.method] ?? 'bg-surface-2 text-ink-2 border-line'}`}
                    >
                      {ep.method}
                    </span>
                    <code className="text-xs text-ink-2 font-mono">{ep.path}</code>
                  </div>
                  <h3 className="text-body-md text-ink font-semibold mb-1 tracking-tight">
                    {ep.title}
                  </h3>
                  <p className="text-sm text-ink-2 leading-relaxed">{ep.description}</p>
                </div>
              </FadeInItem>
            ))}
          </FadeInStagger>
        </section>

        {/* Rate Limits */}
        <section className="mb-16">
          <FadeIn>
            <div className="bg-surface rounded-2xl border border-line shadow-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-gold/15 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-brand-gold-dark" />
                </div>
                <div className="flex-1">
                  <h3 className="text-body-lg font-semibold text-ink tracking-tight mb-1">
                    Rate Limits
                  </h3>
                  <p className="text-sm text-ink-2">
                    1,000 requests/hour for standard keys. Enterprise tiers with higher limits are
                    available on request.
                  </p>
                  <div className="mt-4 rounded-xl bg-surface-2 border border-line p-4" dir="ltr">
                    <p className="text-xs text-ink-3 font-mono mb-2">
                      Rate limit headers returned on every response:
                    </p>
                    <pre className="text-xs font-mono text-ink-2">{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 993
X-RateLimit-Reset: 1715872800`}</pre>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* CTA */}
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden bg-ink p-10 lg:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/20 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-display-md font-bold text-white tracking-tight mb-4">
                Ready to build?
              </h2>
              <p className="text-body-md text-white/80 mb-8">
                Request API access and get your key within 24 hours. Our team will walk you through
                integration and answer any questions.
              </p>
              <Button size="xl" variant="gold" asChild>
                <Link href="/for-business">
                  <KeyRound className="w-4 h-4" />
                  Request API access
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
