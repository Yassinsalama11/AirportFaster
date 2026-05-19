import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

let mockAirportService: unknown = null;
let mockRules: unknown[] = [];
let mockBlackouts: unknown[] = [];

mock.module('../repository.js', {
  namedExports: {
    findAirportServiceWithAirport: async () => mockAirportService,
    findActiveRules: async () => mockRules,
    findBlackoutsForDate: async () => mockBlackouts,
  },
});

const { checkAvailability } = await import('../service.js');

const makeFutureDate = (hoursFromNow = 48, hour = 10) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const makeAirportService = (overrides: Record<string, unknown> = {}) => ({
  id: 'as-1',
  airportId: 'airport-1',
  serviceId: 'svc-1',
  isActive: true,
  cutOffMinutes: null,
  minNoticeMinutes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  airport: {
    id: 'airport-1',
    status: 'active',
    ...overrides,
  },
  ...overrides,
});

const makeRule = (overrides: Record<string, unknown> = {}) => ({
  id: 'rule-1',
  airportServiceId: 'as-1',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // all days
  timeWindows: [{ open: '06:00', close: '23:00' }],
  cutOffMinutes: 60,
  minNoticeMinutes: 30,
  capacityPerSlot: null,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('checkAvailability()', () => {
  beforeEach(() => {
    mockAirportService = null;
    mockRules = [];
    mockBlackouts = [];
  });

  it('returns unavailable when airport is inactive', async () => {
    mockAirportService = makeAirportService({ airport: { id: 'airport-1', status: 'inactive' } });
    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime: makeFutureDate(),
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'airport_inactive');
  });

  it('returns unavailable when service is inactive', async () => {
    mockAirportService = { ...makeAirportService(), isActive: false };
    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime: makeFutureDate(),
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'service_inactive');
  });

  it('returns available with no_restrictions when no rules exist', async () => {
    mockAirportService = makeAirportService();
    mockRules = [];
    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime: makeFutureDate(),
      passengerCount: 1,
    });
    assert.equal(result.status, 'available');
    assert.equal(result.reason, 'no_restrictions');
  });

  it('returns unavailable when day is not in daysOfWeek', async () => {
    const serviceDateTime = makeFutureDate(48, 10);
    const dayOfWeek = serviceDateTime.getDay();
    const excludedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dayOfWeek);

    mockAirportService = makeAirportService();
    mockRules = [makeRule({ daysOfWeek: excludedDays })];

    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime,
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'day_not_available');
  });

  it('returns unavailable when outside operating hours', async () => {
    const serviceDateTime = new Date();
    serviceDateTime.setHours(serviceDateTime.getHours() + 48);
    serviceDateTime.setHours(3, 0, 0, 0); // 3am

    mockAirportService = makeAirportService();
    mockRules = [makeRule({ timeWindows: [{ open: '08:00', close: '22:00' }] })];

    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime,
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'outside_operating_hours');
  });

  it('returns unavailable when cut-off exceeded', async () => {
    const serviceDateTime = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
    serviceDateTime.setMinutes(serviceDateTime.getMinutes()); // keep it within hours

    mockAirportService = makeAirportService();
    mockRules = [makeRule({
      cutOffMinutes: 120, // requires 2 hours notice
      minNoticeMinutes: 60,
      timeWindows: [{ open: '00:00', close: '23:59' }],
    })];

    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime,
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'cut_off_exceeded');
  });

  it('returns unavailable on blackout date', async () => {
    mockAirportService = makeAirportService();
    mockRules = [makeRule()];
    mockBlackouts = [{ id: 'bo-1', scopeType: 'airport', scopeId: 'airport-1' }];

    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime: makeFutureDate(72, 10),
      passengerCount: 1,
    });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'blackout_date');
  });

  it('returns available on a valid date/time', async () => {
    mockAirportService = makeAirportService();
    mockRules = [makeRule({
      timeWindows: [{ open: '00:00', close: '23:59' }],
      cutOffMinutes: 60,
      minNoticeMinutes: 30,
    })];
    mockBlackouts = [];

    const result = await checkAvailability({
      airportServiceId: 'as-1',
      serviceDateTime: makeFutureDate(48, 10),
      passengerCount: 1,
    });
    assert.equal(result.status, 'available');
  });
});
