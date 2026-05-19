import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { prisma } from '@airportfaster/db';
import { buildServer } from '../../../server.js';
import { createSession } from '../../../lib/session.js';

const runId = `${Date.now()}-${process.pid}`;
const serviceSlug = `test-airport-service-${runId}`;
const adminRoleName = `test_airports_admin_${runId}`.replace(/[^a-zA-Z0-9_]/g, '_');
const readOnlyRoleName = `test_airports_read_${runId}`.replace(/[^a-zA-Z0-9_]/g, '_');
const adminEmail = `airports-admin-${runId}@airportfaster.test`;
const readOnlyEmail = `airports-read-${runId}@airportfaster.test`;
const createdAirportIds: string[] = [];
const usedIataCodes = new Set<string>();

function randomIataCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  while (true) {
    const code = Array.from({ length: 3 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('');

    if (!usedIataCodes.has(code)) {
      usedIataCodes.add(code);
      return code;
    }
  }
}

async function createTestUserWithRole(params: {
  email: string;
  roleName: string;
  permissions: string[];
}) {
  const permissions = await Promise.all(
    params.permissions.map((key) =>
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
      name: params.roleName,
      displayName: params.roleName,
      rolePermissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
        })),
      },
    },
  });

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash: 'not-used-in-route-tests',
      isActive: true,
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
    },
  });

  const session = await createSession({ userId: user.id });
  return { user, role, token: session.token };
}

function sessionCookie(token: string): string {
  return `airportfaster_session=${token}`;
}

before(async () => {
  await prisma.service.create({
    data: {
      slug: serviceSlug,
      icon: 'test',
      status: 'active',
      translations: {
        create: [
          {
            locale: 'en',
            name: 'Test Airport Service',
            description: 'Temporary service for airport route tests.',
          },
        ],
      },
    },
  });
});

after(async () => {
  await prisma.airport.deleteMany({
    where: {
      id: {
        in: createdAirportIds,
      },
    },
  });
  await prisma.service.deleteMany({ where: { slug: serviceSlug } });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [adminEmail, readOnlyEmail],
      },
    },
  });
  await prisma.role.deleteMany({
    where: {
      name: {
        in: [adminRoleName, readOnlyRoleName],
      },
    },
  });
  await prisma.$disconnect();
});

test('airport routes require authentication', async () => {
  const app = await buildServer();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/airports',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await app.close();
  }
});

test('airport write route rejects users without airports.write', async () => {
  const { token } = await createTestUserWithRole({
    email: readOnlyEmail,
    roleName: readOnlyRoleName,
    permissions: ['airports.read'],
  });
  const app = await buildServer();

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/airports',
      headers: {
        cookie: sessionCookie(token),
      },
      payload: {
        iataCode: randomIataCode(),
        country: 'GB',
        city: 'London',
        timezone: 'Europe/London',
        translations: [{ locale: 'en', name: `Blocked Airport ${runId}` }],
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'FORBIDDEN');
  } finally {
    await app.close();
  }
});

test('airport admin can create, publish, and list airports', async () => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { slug: serviceSlug },
  });
  const { token } = await createTestUserWithRole({
    email: adminEmail,
    roleName: adminRoleName,
    permissions: ['airports.read', 'airports.write', 'airports.publish'],
  });
  const app = await buildServer();
  const airportName = `Test Airport ${runId}`;

  try {
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/airports',
      headers: {
        cookie: sessionCookie(token),
      },
      payload: {
        iataCode: randomIataCode(),
        icaoCode: randomIataCode() + 'A',
        country: 'GB',
        city: 'London',
        timezone: 'Europe/London',
        latitude: 51.47,
        longitude: -0.4543,
        translations: [
          {
            locale: 'en',
            name: airportName,
            description: 'Temporary airport for route tests.',
          },
          {
            locale: 'ar',
            name: `مطار اختبار ${runId}`,
          },
        ],
        images: [
          {
            url: 'https://cdn.airportfaster.test/airports/test.jpg',
            altText: 'Test airport',
            isPrimary: true,
          },
        ],
        airportServices: [
          {
            serviceId: service.id,
            isActive: true,
          },
        ],
      },
    });

    assert.equal(createResponse.statusCode, 201);
    const createdAirport = createResponse.json().data.airport;
    createdAirportIds.push(createdAirport.id);
    assert.equal(createdAirport.status, 'draft');
    assert.equal(createdAirport.translations.length, 2);
    assert.equal(createdAirport.airportServices.length, 1);

    const duplicateSlugResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/airports',
      headers: {
        cookie: sessionCookie(token),
      },
      payload: {
        iataCode: randomIataCode(),
        country: 'GB',
        city: 'London',
        timezone: 'Europe/London',
        translations: [{ locale: 'en', name: airportName }],
      },
    });

    assert.equal(duplicateSlugResponse.statusCode, 201);
    const duplicateSlugAirport = duplicateSlugResponse.json().data.airport;
    createdAirportIds.push(duplicateSlugAirport.id);
    assert.match(duplicateSlugAirport.slug, /-2$/);

    const publishResponse = await app.inject({
      method: 'PATCH',
      url: `/api/admin/airports/${createdAirport.id}/publish`,
      headers: {
        cookie: sessionCookie(token),
      },
    });

    assert.equal(publishResponse.statusCode, 200);
    const publishedAirport = publishResponse.json().data.airport;
    assert.equal(publishedAirport.status, 'active');
    assert.ok(publishedAirport.publishedAt);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'airports.publish',
        entityId: createdAirport.id,
      },
    });
    assert.ok(auditLog);

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/admin/airports?q=${encodeURIComponent(airportName)}`,
      headers: {
        cookie: sessionCookie(token),
      },
    });

    assert.equal(listResponse.statusCode, 200);
    assert.ok(listResponse.json().data.total >= 2);
  } finally {
    await app.close();
  }
});
