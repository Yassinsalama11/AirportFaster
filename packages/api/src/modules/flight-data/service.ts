// STUB: integrate AviationStack/FlightAware in post-MVP.
// Flight data module — stub implementation for MVP development.
// Real flight lookup will hit a third-party API (AviationStack / FlightAware).

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  origin: { iata: string; name: string; terminal?: string };
  destination: { iata: string; name: string; terminal?: string };
  scheduledDeparture: string; // ISO datetime
  scheduledArrival: string;   // ISO datetime
  status: 'scheduled' | 'departed' | 'landed' | 'cancelled' | 'delayed';
}

// Airline code → name mapping for realistic stub responses
const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates',
  QR: 'Qatar Airways',
  LH: 'Lufthansa',
  BA: 'British Airways',
  AA: 'American Airlines',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  AF: 'Air France',
  SQ: 'Singapore Airlines',
  TK: 'Turkish Airlines',
};

/**
 * Parse a flight number into airline code + number.
 * Returns null if the format is unrecognised.
 * Accepts formats like EK123, QR45, LH1234.
 */
function parseFlightNumber(flightNumber: string): { airlineCode: string; number: string } | null {
  const upper = flightNumber.toUpperCase().trim();
  const match = upper.match(/^([A-Z]{2})(\d{1,4})$/);
  if (!match) return null;
  return { airlineCode: match[1] ?? '', number: match[2] ?? '' };
}

/**
 * STUB: Look up a flight by number and date.
 * For MVP: returns realistic mock data for recognised airline codes.
 * Returns null (→ 404) for unrecognised formats.
 *
 * STUB: integrate AviationStack/FlightAware in post-MVP.
 */
export async function lookupFlight(
  flightNumber: string,
  date: string,
): Promise<FlightInfo | null> {
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) return null;

  const airlineName = AIRLINE_NAMES[parsed.airlineCode];
  if (!airlineName) return null;

  // Build a deterministic stub based on flight number digits
  const flightNum = parseInt(parsed.number, 10);
  const isLongHaul = flightNum > 500;

  // Stub departure: date at 10:00 UTC; arrival ~3h or ~12h later
  const departureTime = `${date}T10:00:00Z`;
  const arrivalHours = isLongHaul ? 12 : 3;
  const arrivalDate = new Date(`${date}T10:00:00Z`);
  arrivalDate.setHours(arrivalDate.getHours() + arrivalHours);
  const arrivalTime = arrivalDate.toISOString();

  // Stub origin/destination — always DXB for EK, DOH for QR, etc.
  const originMap: Record<string, { iata: string; name: string }> = {
    EK: { iata: 'DXB', name: 'Dubai International Airport' },
    QR: { iata: 'DOH', name: 'Hamad International Airport' },
    LH: { iata: 'FRA', name: 'Frankfurt Airport' },
    BA: { iata: 'LHR', name: 'London Heathrow Airport' },
    AA: { iata: 'DFW', name: 'Dallas/Fort Worth International Airport' },
    UA: { iata: 'ORD', name: "O'Hare International Airport" },
    DL: { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport' },
    AF: { iata: 'CDG', name: 'Charles de Gaulle Airport' },
    SQ: { iata: 'SIN', name: 'Singapore Changi Airport' },
    TK: { iata: 'IST', name: 'Istanbul Airport' },
  };

  const origin = originMap[parsed.airlineCode] ?? { iata: 'XXX', name: 'Unknown Airport' };
  const destination = { iata: 'JFK', name: 'John F. Kennedy International Airport' };

  // Determine status from date (past = landed, future = scheduled)
  const serviceDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const status: FlightInfo['status'] = serviceDate < today ? 'landed' : 'scheduled';

  return {
    flightNumber: `${parsed.airlineCode}${parsed.number}`,
    airline: airlineName,
    origin: { ...origin, terminal: 'T3' },
    destination: { ...destination, terminal: '4' },
    scheduledDeparture: departureTime,
    scheduledArrival: arrivalTime,
    status,
  };
}
