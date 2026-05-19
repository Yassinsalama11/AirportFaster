import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServer } from '../../server.js';

test('POST /api/admin/auth/login with wrong password returns 401', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' }),
    });

    assert.equal(response.statusCode, 401);

    const body = JSON.parse(response.body) as { success?: boolean; error?: { code?: string } };
    assert.equal(body['success'], false);
    assert.ok(body['error'], 'error field should be present');
  } finally {
    await app.close();
  }
});

test('POST /api/admin/auth/login with missing fields returns 400', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }), // missing password
    });

    assert.equal(response.statusCode, 400);

    const body = JSON.parse(response.body) as { success?: boolean; error?: { code?: string } };
    assert.equal(body['success'], false);
    assert.equal(body['error']?.['code'], 'VALIDATION_ERROR');
  } finally {
    await app.close();
  }
});

test('GET /api/admin/airports without session returns 401', async () => {
  const app = await buildServer();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/airports',
    });

    assert.equal(response.statusCode, 401);

    const body = JSON.parse(response.body) as { success?: boolean };
    assert.equal(body['success'], false);
  } finally {
    await app.close();
  }
});
