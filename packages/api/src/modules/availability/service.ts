import {
  findAirportServiceWithAirport,
  findActiveRules,
  findBlackoutsForDate,
} from './repository.js';

export interface AvailabilityParams {
  airportServiceId: string;
  serviceDateTime: Date;
  passengerCount: number;
}

export interface AvailabilityResult {
  status: 'available' | 'unavailable' | 'manual_confirmation';
  reason?: string;
}

interface TimeWindow {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

function parseHHMM(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function timeInMinutes(time: string): number {
  const { h, m } = parseHHMM(time);
  return h * 60 + m;
}

function dateTimeInMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Check availability for an airport service at a given date/time.
 * Pure computation — no writes. Does DB reads.
 */
export async function checkAvailability(
  params: AvailabilityParams,
): Promise<AvailabilityResult> {
  const now = new Date();

  // Step 1: Fetch AirportService with Airport
  const airportService = await findAirportServiceWithAirport(params.airportServiceId);

  if (!airportService) {
    return { status: 'unavailable', reason: 'service_not_found' };
  }

  if (airportService.airport.status !== 'active') {
    return { status: 'unavailable', reason: 'airport_inactive' };
  }

  // Step 2: Check AirportService is active
  if (!airportService.isActive) {
    return { status: 'unavailable', reason: 'service_inactive' };
  }

  // Step 3: Fetch availability rules
  const rules = await findActiveRules(params.airportServiceId);

  // Step 4: No rules → open by default
  if (rules.length === 0) {
    return { status: 'available', reason: 'no_restrictions' };
  }

  const serviceDateTime = params.serviceDateTime;
  const dayOfWeek = serviceDateTime.getDay(); // 0=Sun, 6=Sat

  // Steps 5-8: Check rules — any matching rule means we're available for that constraint
  let dayMatched = false;
  let windowMatched = false;
  let cutOffOk = false;

  for (const rule of rules) {
    // Step 5: Check day of week
    if (!rule.daysOfWeek.includes(dayOfWeek)) continue;
    dayMatched = true;

    // Step 6: Check time windows
    const windows = rule.timeWindows as unknown as TimeWindow[];
    const serviceMins = dateTimeInMinutes(serviceDateTime);
    const inWindow = windows.some(
      (w) => serviceMins >= timeInMinutes(w.open) && serviceMins < timeInMinutes(w.close),
    );
    if (!inWindow) continue;
    windowMatched = true;

    // Steps 7-8: Check cut-off time (use larger of cutOffMinutes and minNoticeMinutes)
    const minLead = Math.max(rule.cutOffMinutes, rule.minNoticeMinutes);
    const minsUntilService = (serviceDateTime.getTime() - now.getTime()) / 60000;
    if (minsUntilService < minLead) continue;
    cutOffOk = true;

    // If we reach here, this rule allows availability
    break;
  }

  if (!dayMatched) {
    return { status: 'unavailable', reason: 'day_not_available' };
  }
  if (!windowMatched) {
    return { status: 'unavailable', reason: 'outside_operating_hours' };
  }
  if (!cutOffOk) {
    return { status: 'unavailable', reason: 'cut_off_exceeded' };
  }

  // Step 9: Check blackout dates
  const blackouts = await findBlackoutsForDate(
    serviceDateTime,
    airportService.airportId,
    params.airportServiceId,
  );

  if (blackouts.length > 0) {
    return { status: 'unavailable', reason: 'blackout_date' };
  }

  // Step 10: Available
  return { status: 'available' };
}
