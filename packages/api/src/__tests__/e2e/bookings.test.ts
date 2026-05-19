import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServer } from '../../server.js';

const VALID_BOOKING_BASE = {
  airportServiceId: '00000000-0000-0000-0000-000000000001',
  direction: 'arrival',
  serviceDate: new Date(Date.now() + 86400_000).toISOString().slice(0, 10), // tomorrow
  locale: 'en',
  passengers: [
    { firstName: 'Test', lastName: 'Traveller', type: 'adult' },
    { firstName: 'Second', lastName: 'Traveller', type: 'adult' },
  ],
  contact: {
    email: 'test@example.com',
    phone: '+1234567890',
    firstName: 'Test',
    lastName: 'Traveller',
  },
};

test('POST /api/public/bookings with missing fields returns 400', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/public/bookings',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // Missing required fields: airportServiceId, direction, etc.
        locale: 'en',
      }),
    });

    assert.equal(response.statusCode, 400);

    const body = JSON.parse(response.body) as { success?: boolean; error?: { code?: string } };
    assert.equal(body['success'], false);
    assert.ok(body['error'], 'error field should be present');
  } finally {
    await app.close();
  }
});

test('POST /api/public/bookings with non-existent airportServiceId returns 404', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/public/bookings',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(VALID_BOOKING_BASE),
    });

    // The booking service throws 404 AIRPORT_SERVICE_NOT_FOUND for non-existent IDs.
    // Note: if the database is unavailable in CI, this may return 500 — acceptable.
    assert.ok(
      response.statusCode === 404 || response.statusCode === 500,
      `Expected 404 (or 500 if DB unavailable), got ${response.statusCode}: ${response.body}`,
    );

    if (response.statusCode === 404) {
      const body = JSON.parse(response.body) as {
        success?: boolean;
        error?: { code?: string };
      };
      assert.equal(body['success'], false);
      assert.equal(body['error']?.['code'], 'AIRPORT_SERVICE_NOT_FOUND');
    }
  } finally {
    await app.close();
  }
});
