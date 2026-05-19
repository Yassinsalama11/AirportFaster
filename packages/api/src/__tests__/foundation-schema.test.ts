import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Prisma, prisma } from '@airportfaster/db';

const runId = `${Date.now()}-${process.pid}`;
const permissionKey = `foundation.${runId}`;
const roleName = `foundation_role_${runId}`.replace(/[^a-zA-Z0-9_]/g, '_');
const userEmail = `foundation-user-${runId}@airportfaster.test`;
const airportSlug = `foundation-airport-${runId}`;
const serviceSlug = `foundation-service-${runId}`;
const settingKey = `foundation_setting_${runId}`;
const airportIataCode = Array.from({ length: 3 }, (_, index) =>
  String.fromCharCode(65 + ((Date.now() + process.pid + index) % 26)),
).join('');

function assertPrismaCode(error: unknown, code: string) {
  assert.equal(error instanceof Prisma.PrismaClientKnownRequestError, true);
  assert.equal((error as Prisma.PrismaClientKnownRequestError).code, code);
}

after(async () => {
  await prisma.airport.deleteMany({ where: { slug: airportSlug } });
  await prisma.service.deleteMany({ where: { slug: serviceSlug } });
  await prisma.setting.deleteMany({ where: { key: settingKey } });
  await prisma.user.deleteMany({ where: { email: userEmail } });
  await prisma.role.deleteMany({ where: { name: roleName } });
  await prisma.permission.deleteMany({ where: { key: permissionKey } });
  await prisma.$disconnect();
});

test('identity tables enforce uniqueness, FKs, and cascade/session cleanup rules', async () => {
  const permission = await prisma.permission.create({
    data: {
      key: permissionKey,
      displayName: permissionKey,
      domain: 'foundation',
    },
  });
  const role = await prisma.role.create({
    data: {
      name: roleName,
      displayName: roleName,
    },
  });
  await prisma.rolePermission.create({
    data: {
      roleId: role.id,
      permissionId: permission.id,
    },
  });

  await assert.rejects(
    () =>
      prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      }),
    (error) => {
      assertPrismaCode(error, 'P2002');
      return true;
    },
  );

  const user = await prisma.user.create({
    data: {
      email: userEmail,
      passwordHash: 'argon2-hash-placeholder',
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
      sessions: {
        create: {
          tokenHash: `token-${runId}`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      },
    },
  });
  const auditLog = await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'foundation.identity.test',
    },
  });

  await prisma.user.delete({ where: { id: user.id } });

  assert.equal(await prisma.userRole.count({ where: { userId: user.id } }), 0);
  assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);

  const orphanedAuditLog = await prisma.auditLog.findUniqueOrThrow({
    where: { id: auditLog.id },
  });
  assert.equal(orphanedAuditLog.userId, null);

  await prisma.role.delete({ where: { id: role.id } });
  assert.equal(await prisma.rolePermission.count({ where: { roleId: role.id } }), 0);
});

test('airport, service, settings tables enforce unique constraints and cascades', async () => {
  const service = await prisma.service.create({
    data: {
      slug: serviceSlug,
      status: 'active',
      translations: {
        create: {
          locale: 'en',
          name: 'Foundation Service',
          description: 'Service used by foundation schema tests.',
        },
      },
      seo: {
        create: {
          metaTitle: 'Foundation Service',
        },
      },
    },
  });

  const airport = await prisma.airport.create({
    data: {
      iataCode: airportIataCode,
      slug: airportSlug,
      country: 'GB',
      city: 'London',
      timezone: 'Europe/London',
      translations: {
        create: {
          locale: 'en',
          name: 'Foundation Airport',
          description: 'Airport used by foundation schema tests.',
        },
      },
      images: {
        create: {
          url: 'https://cdn.airportfaster.test/foundation.jpg',
          altText: 'Foundation airport',
        },
      },
      seo: {
        create: {
          metaTitle: 'Foundation Airport',
        },
      },
      airportServices: {
        create: {
          serviceId: service.id,
        },
      },
    },
  });

  await assert.rejects(
    () =>
      prisma.airportService.create({
        data: {
          airportId: airport.id,
          serviceId: service.id,
        },
      }),
    (error) => {
      assertPrismaCode(error, 'P2002');
      return true;
    },
  );

  await prisma.setting.create({
    data: {
      key: settingKey,
      value: { enabled: true },
      domain: 'foundation',
      isPublic: false,
    },
  });

  await assert.rejects(
    () =>
      prisma.setting.create({
        data: {
          key: settingKey,
          value: { enabled: false },
        },
      }),
    (error) => {
      assertPrismaCode(error, 'P2002');
      return true;
    },
  );

  await prisma.airport.delete({ where: { id: airport.id } });
  assert.equal(await prisma.airportTranslation.count({ where: { airportId: airport.id } }), 0);
  assert.equal(await prisma.airportImage.count({ where: { airportId: airport.id } }), 0);
  assert.equal(await prisma.airportSeo.count({ where: { airportId: airport.id } }), 0);
  assert.equal(await prisma.airportService.count({ where: { airportId: airport.id } }), 0);

  await prisma.service.delete({ where: { id: service.id } });
  assert.equal(await prisma.serviceTranslation.count({ where: { serviceId: service.id } }), 0);
  assert.equal(await prisma.serviceSeo.count({ where: { serviceId: service.id } }), 0);
});

test('foundation full-text search GIN indexes are present', async () => {
  const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'airport_translations_search_gin_idx',
        'service_translations_search_gin_idx'
      )
  `;

  assert.equal(indexes.length, 2);
  for (const index of indexes) {
    assert.match(index.indexdef.toLowerCase(), /using gin/);
    assert.match(index.indexdef.toLowerCase(), /to_tsvector/);
  }
});
