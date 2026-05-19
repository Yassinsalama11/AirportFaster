import assert from 'node:assert/strict';
import type { OutgoingHttpHeaders } from 'node:http';
import { after, before, test } from 'node:test';
import { hash } from '@node-rs/argon2';
import { prisma } from '@airportfaster/db';
import { buildServer } from '../../../server.js';

const runId = `${Date.now()}-${process.pid}`;
const roleName = `test_auth_admin_${runId}`.replace(/[^a-zA-Z0-9_]/g, '_');
const email = `auth-admin-${runId}@airportfaster.test`;
const initialPassword = 'AirportFaster!Initial2026';
const resetPassword = 'AirportFaster!Reset2026';

async function createAuthUser() {
  const permissions = await Promise.all(
    ['airports.read', 'airports.write'].map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          displayName: key,
          domain: key.split('.')[0] ?? 'test',
        },
      }),
    ),
  );

  const role = await prisma.role.create({
    data: {
      name: roleName,
      displayName: roleName,
      rolePermissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
    },
  });

  const passwordHash = await hash(initialPassword, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Auth Test Admin',
      isActive: true,
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });
}

function sessionCookie(response: { headers: OutgoingHttpHeaders }) {
  const cookie = response.headers['set-cookie'];
  if (Array.isArray(cookie)) return cookie[0];
  if (typeof cookie === 'string') return cookie;
  return undefined;
}

before(async () => {
  await createAuthUser();
});

after(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.role.deleteMany({ where: { name: roleName } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { metadata: { path: ['email'], equals: email } },
        { action: { startsWith: 'auth.password_reset' } },
      ],
    },
  });
  await prisma.$disconnect();
});

test('auth login creates a server-side session and /me validates the cookie', async () => {
  const app = await buildServer();

  try {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email,
        password: initialPassword,
      },
    });

    assert.equal(loginResponse.statusCode, 200);
    assert.equal(loginResponse.json().data.user.email, email);
    assert.match(sessionCookie(loginResponse) ?? '', /airportfaster_session=/);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/auth/me',
      headers: {
        cookie: sessionCookie(loginResponse) ?? '',
      },
    });

    assert.equal(meResponse.statusCode, 200);
    assert.deepEqual(meResponse.json().data.user.permissions.sort(), [
      'airports.read',
      'airports.write',
    ]);

    const auditLog = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'auth.login.success', user: { email } },
    });
    assert.equal(auditLog.action, 'auth.login.success');
  } finally {
    await app.close();
  }
});

test('invalid credentials return 401 and auth route rate limiting triggers', async () => {
  const app = await buildServer();

  try {
    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email,
        password: 'wrong-password',
      },
    });
    assert.equal(invalidResponse.statusCode, 401);

    let rateLimited = false;
    for (let index = 0; index < 11; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/auth/login',
        payload: {
          email: `missing-${index}-${runId}@airportfaster.test`,
          password: 'wrong-password',
        },
      });
      if (response.statusCode === 429) {
        rateLimited = true;
        break;
      }
    }

    assert.equal(rateLimited, true);
  } finally {
    await app.close();
  }
});

test('password reset uses a signed token, updates the argon2 hash, and audits completion', async () => {
  const app = await buildServer();

  try {
    const requestResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/password-reset/request',
      payload: { email },
    });

    assert.equal(requestResponse.statusCode, 200);
    const resetToken = requestResponse.json().data.resetToken as string | undefined;
    assert.equal(typeof resetToken, 'string');

    const confirmResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/password-reset/confirm',
      payload: {
        token: resetToken,
        password: resetPassword,
      },
    });

    assert.equal(confirmResponse.statusCode, 200);

    const oldPasswordResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email,
        password: initialPassword,
      },
    });
    assert.equal(oldPasswordResponse.statusCode, 401);

    const newPasswordResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/auth/login',
      payload: {
        email,
        password: resetPassword,
      },
    });
    assert.equal(newPasswordResponse.statusCode, 200);

    const auditLog = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'auth.password_reset.completed', user: { email } },
    });
    assert.equal(auditLog.action, 'auth.password_reset.completed');
  } finally {
    await app.close();
  }
});
