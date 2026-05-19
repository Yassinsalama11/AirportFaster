// STUB: integrate Priority Pass / DragonPass API in post-MVP
import type { LoungeInfo } from './types.js';

// ── Stub lounge data ──────────────────────────────────────────────────────────

const STUB_LOUNGES: LoungeInfo[] = [
  // DXB — Dubai International
  {
    loungeId: 'lounge-dxb-marhaba-t1',
    name: 'Marhaba Lounge T1',
    airportIata: 'DXB',
    terminal: 'T1',
    accessType: 'priority_pass',
    openingHours: [{ open: '05:00', close: '23:59', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 200,
    amenities: ['wifi', 'food', 'showers', 'business_center'],
    pricePerPersonMinorUnits: 5500, // £55.00
    currency: 'EUR',
    images: [],
  },
  {
    loungeId: 'lounge-dxb-ahlan-t3',
    name: 'Ahlan Business Lounge T3',
    airportIata: 'DXB',
    terminal: 'T3',
    accessType: 'dragon_pass',
    openingHours: [{ open: '00:00', close: '23:59', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 300,
    amenities: ['wifi', 'food', 'showers', 'spa', 'business_center'],
    pricePerPersonMinorUnits: 6500, // £65.00
    currency: 'EUR',
    images: [],
  },
  // LHR — London Heathrow
  {
    loungeId: 'lounge-lhr-british-t5',
    name: 'British Airways Galleries Lounge T5',
    airportIata: 'LHR',
    terminal: 'T5',
    accessType: 'direct',
    openingHours: [{ open: '04:30', close: '22:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 400,
    amenities: ['wifi', 'food', 'showers', 'spa', 'business_center'],
    pricePerPersonMinorUnits: 8500, // £85.00
    currency: 'EUR',
    images: [],
  },
  {
    loungeId: 'lounge-lhr-plaza-premium-t2',
    name: 'Plaza Premium Lounge T2',
    airportIata: 'LHR',
    terminal: 'T2',
    accessType: 'priority_pass',
    openingHours: [{ open: '05:00', close: '22:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 150,
    amenities: ['wifi', 'food', 'showers', 'business_center'],
    pricePerPersonMinorUnits: 5000, // £50.00
    currency: 'EUR',
    images: [],
  },
  // JFK — New York JFK
  {
    loungeId: 'lounge-jfk-delta-sky-t4',
    name: 'Delta Sky Club T4',
    airportIata: 'JFK',
    terminal: 'T4',
    accessType: 'priority_pass',
    openingHours: [{ open: '05:30', close: '22:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 180,
    amenities: ['wifi', 'food', 'business_center'],
    pricePerPersonMinorUnits: 5000, // $50.00
    currency: 'EUR',
    images: [],
  },
  {
    loungeId: 'lounge-jfk-amex-centurion-t4',
    name: 'Amex Centurion Lounge T4',
    airportIata: 'JFK',
    terminal: 'T4',
    accessType: 'direct',
    openingHours: [{ open: '06:00', close: '22:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 120,
    amenities: ['wifi', 'food', 'showers', 'spa'],
    pricePerPersonMinorUnits: 0, // card access only
    currency: 'EUR',
    images: [],
  },
  // CDG — Paris Charles de Gaulle
  {
    loungeId: 'lounge-cdg-air-france-t2e',
    name: 'Air France Lounge T2E',
    airportIata: 'CDG',
    terminal: '2E',
    accessType: 'priority_pass',
    openingHours: [{ open: '05:00', close: '23:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 250,
    amenities: ['wifi', 'food', 'showers', 'business_center'],
    pricePerPersonMinorUnits: 5500, // €55.00
    currency: 'EUR',
    images: [],
  },
  // AMS — Amsterdam Schiphol
  {
    loungeId: 'lounge-ams-aspire-lounge',
    name: 'Aspire Lounge Schiphol',
    airportIata: 'AMS',
    terminal: 'Main Terminal',
    accessType: 'dragon_pass',
    openingHours: [
      { open: '06:00', close: '22:00', daysOfWeek: [1, 2, 3, 4, 5] },
      { open: '07:00', close: '21:00', daysOfWeek: [0, 6] },
    ],
    capacity: 120,
    amenities: ['wifi', 'food', 'business_center'],
    pricePerPersonMinorUnits: 4500, // €45.00
    currency: 'EUR',
    images: [],
  },
  // SIN — Singapore Changi
  {
    loungeId: 'lounge-sin-plaza-premium-t1',
    name: 'Plaza Premium Lounge T1',
    airportIata: 'SIN',
    terminal: 'T1',
    accessType: 'priority_pass',
    openingHours: [{ open: '00:00', close: '23:59', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 200,
    amenities: ['wifi', 'food', 'showers', 'spa', 'business_center'],
    pricePerPersonMinorUnits: 5000, // SGD 50.00
    currency: 'EUR',
    images: [],
  },
  {
    loungeId: 'lounge-sin-jewel-transit-t1',
    name: 'Jewel Business Lounge T1',
    airportIata: 'SIN',
    terminal: 'T1',
    accessType: 'dragon_pass',
    openingHours: [{ open: '06:00', close: '23:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
    capacity: 150,
    amenities: ['wifi', 'food', 'showers', 'business_center'],
    pricePerPersonMinorUnits: 4500, // SGD 45.00
    currency: 'EUR',
    images: [],
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

export async function getLoungesByAirport(iataCode: string): Promise<LoungeInfo[]> {
  // STUB: integrate Priority Pass API in post-MVP
  const code = iataCode.toUpperCase();
  return STUB_LOUNGES.filter((l) => l.airportIata === code);
}

export async function getAllLounges(): Promise<LoungeInfo[]> {
  // STUB: integrate Priority Pass API in post-MVP
  return STUB_LOUNGES;
}

export async function checkLoungeAvailability(
  _loungeId: string,
  _date: Date,
  _persons: number,
): Promise<boolean> {
  // STUB: always available in MVP
  return true;
}

export async function reserveLounge(
  loungeId: string,
  bookingId: string,
  _date: Date,
  _persons: number,
): Promise<{ reservationId: string }> {
  // STUB: generate a deterministic stub reservation ID
  const reservationId = `STUB-${loungeId.slice(-8).toUpperCase()}-${bookingId.slice(-8).toUpperCase()}`;
  return { reservationId };
}
