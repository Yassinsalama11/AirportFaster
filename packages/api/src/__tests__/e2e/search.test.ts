import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServer } from '../../server.js';

test('GET /api/public/search without q returns empty successful result set', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/public/search',
    });

    assert.equal(response.statusCode, 200);

    const body = JSON.parse(response.body) as {
      success?: boolean;
      data?: { results?: unknown[]; total?: number };
    };
    assert.equal(body['success'], true);
    assert.ok(Array.isArray(body['data']?.['results']), 'data.results should be an array');
    assert.equal(
      body['data']?.['total'],
      body['data']?.['results']?.length,
      'data.total should match results length',
    );
  } finally {
    await app.close();
  }
});

test('GET /api/public/search?q=DXB returns correct shape', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/public/search?q=DXB',
    });

    // Should be 200 (results or empty array) — not a server error
    assert.ok(
      response.statusCode === 200,
      `Expected 200, got ${response.statusCode}: ${response.body}`,
    );

    const body = JSON.parse(response.body) as {
      success?: boolean;
      data?: { results?: unknown[]; total?: number; query?: string };
    };

    assert.equal(body['success'], true);
    assert.ok(body['data'], 'data field should be present');
    assert.ok(
      Array.isArray(body['data']?.['results']),
      'data.results should be an array',
    );
    assert.ok(
      typeof body['data']?.['total'] === 'number',
      'data.total should be a number',
    );
  } finally {
    await app.close();
  }
});
