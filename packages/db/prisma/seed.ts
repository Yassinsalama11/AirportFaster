import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'super_admin', displayName: 'Super Admin', description: 'Full system access' },
  { name: 'operations', displayName: 'Operations', description: 'Manage bookings and day-to-day operations' },
  { name: 'customer_support', displayName: 'Customer Support', description: 'Handle customer queries and booking issues' },
  { name: 'finance', displayName: 'Finance', description: 'View financials, process refunds' },
  { name: 'supplier_manager', displayName: 'Supplier Manager', description: 'Manage supplier relationships' },
  { name: 'content_seo', displayName: 'Content & SEO', description: 'Manage CMS content and SEO' },
  { name: 'analyst', displayName: 'Analyst', description: 'Read-only analytics access' },
];

const PERMISSIONS = [
  { key: 'users.read', displayName: 'Read Users', domain: 'users' },
  { key: 'users.write', displayName: 'Write Users', domain: 'users' },
  { key: 'airports.read', displayName: 'Read Airports', domain: 'airports' },
  { key: 'airports.write', displayName: 'Write Airports', domain: 'airports' },
  { key: 'airports.publish', displayName: 'Publish Airports', domain: 'airports' },
  { key: 'services.read', displayName: 'Read Services', domain: 'services' },
  { key: 'services.write', displayName: 'Write Services', domain: 'services' },
  { key: 'bookings.read', displayName: 'Read Bookings', domain: 'bookings' },
  { key: 'bookings.write', displayName: 'Write Bookings', domain: 'bookings' },
  { key: 'bookings.cancel', displayName: 'Cancel Bookings', domain: 'bookings' },
  { key: 'bookings.refund', displayName: 'Refund Bookings', domain: 'bookings' },
  { key: 'suppliers.read', displayName: 'Read Suppliers', domain: 'suppliers' },
  { key: 'suppliers.write', displayName: 'Write Suppliers', domain: 'suppliers' },
  { key: 'finance.read', displayName: 'Read Finance', domain: 'finance' },
  { key: 'finance.write', displayName: 'Write Finance', domain: 'finance' },
  { key: 'cms.read', displayName: 'Read CMS', domain: 'cms' },
  { key: 'cms.write', displayName: 'Write CMS', domain: 'cms' },
  { key: 'cms.publish', displayName: 'Publish CMS', domain: 'cms' },
  { key: 'analytics.read', displayName: 'Read Analytics', domain: 'analytics' },
  { key: 'settings.read', displayName: 'Read Settings', domain: 'settings' },
  { key: 'settings.write', displayName: 'Write Settings', domain: 'settings' },
  { key: 'roles.read', displayName: 'Read Roles', domain: 'roles' },
  { key: 'roles.write', displayName: 'Write Roles', domain: 'roles' },
  { key: 'operations.read', displayName: 'Read Operations', domain: 'operations' },
  { key: 'operations.write', displayName: 'Write Operations', domain: 'operations' },
  { key: 'incidents.read', displayName: 'Read Incidents', domain: 'incidents' },
  { key: 'incidents.write', displayName: 'Write Incidents', domain: 'incidents' },
  { key: 'notifications.read', displayName: 'Read Notifications', domain: 'notifications' },
  { key: 'notifications.write', displayName: 'Write Notifications', domain: 'notifications' },
  { key: 'pricing.read', displayName: 'Read Pricing', domain: 'pricing' },
  { key: 'pricing.write', displayName: 'Write Pricing', domain: 'pricing' },
  { key: 'availability.read', displayName: 'Read Availability', domain: 'availability' },
  { key: 'availability.write', displayName: 'Write Availability', domain: 'availability' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: PERMISSIONS.map((p) => p.key),
  operations: [
    'bookings.read', 'bookings.write', 'bookings.cancel',
    'airports.read', 'services.read', 'suppliers.read',
    'operations.read', 'operations.write',
    'incidents.read', 'incidents.write',
    'notifications.read',
  ],
  customer_support: [
    'bookings.read', 'bookings.write', 'bookings.cancel',
    'users.read', 'airports.read', 'services.read',
    'incidents.read', 'incidents.write', 'notifications.read',
  ],
  finance: [
    'bookings.read', 'finance.read', 'finance.write',
    'bookings.refund', 'analytics.read',
  ],
  supplier_manager: [
    'suppliers.read', 'suppliers.write',
    'airports.read', 'services.read', 'bookings.read',
  ],
  content_seo: [
    'cms.read', 'cms.write', 'cms.publish',
    'airports.read', 'services.read',
  ],
  analyst: [
    'analytics.read', 'bookings.read',
    'airports.read', 'services.read', 'finance.read',
  ],
};

const SERVICES = [
  {
    slug: 'fast_track',
    icon: 'zap',
    sortOrder: 1,
    translations: [
      { locale: 'en', name: 'Fast Track', description: 'Skip the security queue with dedicated fast-track lanes.' },
      { locale: 'ar', name: 'المسار السريع', description: 'تجاوز طابور الأمن بمسارات المرور السريع المخصصة.' },
    ],
  },
  {
    slug: 'meet_and_greet',
    icon: 'handshake',
    sortOrder: 2,
    translations: [
      { locale: 'en', name: 'Meet & Greet', description: 'Personal meet-and-greet service from arrival to departure gate.' },
      { locale: 'ar', name: 'الاستقبال والتوديع', description: 'خدمة استقبال وتوديع شخصية من الوصول إلى بوابة المغادرة.' },
    ],
  },
  {
    slug: 'lounge_access',
    icon: 'sofa',
    sortOrder: 3,
    translations: [
      { locale: 'en', name: 'Lounge Access', description: 'Relax in premium airport lounges with complimentary food and drinks.' },
      { locale: 'ar', name: 'دخول الصالة', description: 'استرح في صالات المطار المتميزة مع الطعام والمشروبات المجانية.' },
    ],
  },
];

const DEFAULT_SETTINGS = [
  { key: 'supported_locales', value: ['en', 'ar'], domain: 'general', isPublic: true },
  { key: 'default_locale', value: 'en', domain: 'general', isPublic: true },
  { key: 'default_currency', value: 'EUR', domain: 'general', isPublic: true },
  { key: 'supported_currencies', value: ['EUR'], domain: 'general', isPublic: true },
  { key: 'feature_flag_ai_seo', value: false, domain: 'features', isPublic: false },
  { key: 'feature_flag_ai_translation', value: false, domain: 'features', isPublic: false },
  { key: 'feature_flag_supplier_portal', value: false, domain: 'features', isPublic: false },
  { key: 'platform_commission_bps', value: 1500, domain: 'finance', isPublic: false }, // 15%
];

async function main() {
  console.info('🌱 Starting seed...');

  // Seed permissions
  console.info('  → Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { displayName: permission.displayName, domain: permission.domain },
      create: permission,
    });
  }

  // Seed roles
  console.info('  → Seeding roles...');
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }

  // Seed role_permissions
  console.info('  → Seeding role permissions...');
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const key of permKeys) {
      const permission = await prisma.permission.findUnique({ where: { key } });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // Seed services
  console.info('  → Seeding services...');
  for (const service of SERVICES) {
    const { translations, ...serviceData } = service;
    const createdService = await prisma.service.upsert({
      where: { slug: serviceData.slug },
      update: { icon: serviceData.icon, sortOrder: serviceData.sortOrder, status: 'active' },
      create: { ...serviceData, status: 'active' },
    });

    for (const translation of translations) {
      await prisma.serviceTranslation.upsert({
        where: { serviceId_locale: { serviceId: createdService.id, locale: translation.locale } },
        update: { name: translation.name, description: translation.description },
        create: { serviceId: createdService.id, ...translation },
      });
    }
  }

  // Seed settings
  console.info('  → Seeding default settings...');
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, domain: setting.domain, isPublic: setting.isPublic },
      create: setting,
    });
  }

  // Seed admin user
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@airportfaster.local';
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'AirportFaster!Dev2026';

  console.info(`  → Seeding admin user: ${adminEmail}`);
  const passwordHash = await hash(adminPassword, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isActive: true },
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Super Admin',
      isActive: true,
    },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }

  console.info('');
  console.info('✅ Seed complete!');
  console.info('');
  console.info('Admin credentials:');
  console.info(`  Email:    ${adminEmail}`);
  console.info(`  Password: ${adminPassword}`);
  console.info('');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
