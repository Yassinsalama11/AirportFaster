'use client';

const POSTHOG_KEY = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
const POSTHOG_HOST = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com';

export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured — analytics disabled');
    return;
  }

  // Lazy-load PostHog to avoid impacting initial bundle size
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      // Do not send PII by default
      person_profiles: 'identified_only',
    });
  }).catch(() => {
    console.warn('Failed to initialize PostHog');
  });
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return;

  import('posthog-js').then(({ default: posthog }) => {
    posthog.capture(event, properties);
  }).catch(() => null);
}
