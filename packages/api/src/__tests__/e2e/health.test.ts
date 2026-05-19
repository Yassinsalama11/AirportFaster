import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServer } from '../../server.js';

test('GET /health returns 200 with correct shape', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);

    const body = JSON.parse(response.body) as {
      status?: string;
      service?: string;
      timestamp?: string;
    };

    assert.equal(body['status'], 'ok');
    assert.equal(body['service'], 'airportfaster-api');
    assert.ok(typeof body['timestamp'] === 'string', 'timestamp should be a string');
    assert.ok(
      !Number.isNaN(Date.parse(body['timestamp'])),
      'timestamp should be a valid ISO date',
    );
  } finally {
    await app.close();
  }
});
