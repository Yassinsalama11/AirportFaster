import { NextResponse } from 'next/server';

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://airportfaster.com';

const content = `# AirportFaster

> Premium airport services booking platform — fast track security, meet & greet, and lounge access at 50+ airports worldwide.

AirportFaster lets travellers book premium airport services online in under two minutes. Instant confirmation, all major cards accepted. Available in English and Arabic.

## Services

- **Fast Track** (from €29): Skip security and passport control queues using dedicated fast-track lanes. No airline or cabin class restriction.
- **Meet & Greet** (from €45): Dedicated airport assistant guides you through departures or arrivals — check-in, baggage, navigation, escort to gate.
- **Lounge Access** (from €35): Access premium airport lounges with complimentary food, drinks, Wi-Fi, and showers. Open to all passengers regardless of ticket class.

## Key Facts

- 50+ partner airports across Europe, Middle East, and Asia
- 10,000+ bookings processed, 4.9/5 average rating
- Free cancellation up to 24 hours before service
- Support: support@airportfaster.com

## Key Pages

- ${BASE_URL}/en — Homepage (English)
- ${BASE_URL}/ar — Homepage (Arabic)
- ${BASE_URL}/en/airports — All supported airports
- ${BASE_URL}/en/services/fast-track — Fast Track service
- ${BASE_URL}/en/services/meet-and-greet — Meet & Greet service
- ${BASE_URL}/en/services/lounge-access — Lounge Access service
- ${BASE_URL}/en/search — Search and book
- ${BASE_URL}/en/for-business — Partnerships

## Full Content

${BASE_URL}/llms-full.txt
`;

export function GET() {
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
