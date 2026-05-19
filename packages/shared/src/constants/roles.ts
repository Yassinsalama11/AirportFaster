export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPERATIONS: 'operations',
  CUSTOMER_SUPPORT: 'customer_support',
  FINANCE: 'finance',
  SUPPLIER_MANAGER: 'supplier_manager',
  CONTENT_SEO: 'content_seo',
  ANALYST: 'analyst',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Users
  USERS_READ: 'users.read',
  USERS_WRITE: 'users.write',
  // Airports
  AIRPORTS_READ: 'airports.read',
  AIRPORTS_WRITE: 'airports.write',
  AIRPORTS_PUBLISH: 'airports.publish',
  // Services
  SERVICES_READ: 'services.read',
  SERVICES_WRITE: 'services.write',
  // Bookings
  BOOKINGS_READ: 'bookings.read',
  BOOKINGS_WRITE: 'bookings.write',
  BOOKINGS_CANCEL: 'bookings.cancel',
  BOOKINGS_REFUND: 'bookings.refund',
  // Suppliers
  SUPPLIERS_READ: 'suppliers.read',
  SUPPLIERS_WRITE: 'suppliers.write',
  // Finance
  FINANCE_READ: 'finance.read',
  FINANCE_WRITE: 'finance.write',
  // CMS
  CMS_READ: 'cms.read',
  CMS_WRITE: 'cms.write',
  CMS_PUBLISH: 'cms.publish',
  // Analytics
  ANALYTICS_READ: 'analytics.read',
  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  // Roles
  ROLES_READ: 'roles.read',
  ROLES_WRITE: 'roles.write',
  // Operations
  OPERATIONS_READ: 'operations.read',
  OPERATIONS_WRITE: 'operations.write',
  // Incidents
  INCIDENTS_READ: 'incidents.read',
  INCIDENTS_WRITE: 'incidents.write',
  // Notifications
  NOTIFICATIONS_READ: 'notifications.read',
  NOTIFICATIONS_WRITE: 'notifications.write',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role → Permissions mapping
export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  super_admin: Object.values(PERMISSIONS) as PermissionKey[],
  operations: [
    'bookings.read',
    'bookings.write',
    'bookings.cancel',
    'airports.read',
    'services.read',
    'suppliers.read',
    'operations.read',
    'operations.write',
    'incidents.read',
    'incidents.write',
    'notifications.read',
  ],
  customer_support: [
    'bookings.read',
    'bookings.write',
    'bookings.cancel',
    'users.read',
    'airports.read',
    'services.read',
    'incidents.read',
    'incidents.write',
    'notifications.read',
  ],
  finance: [
    'bookings.read',
    'finance.read',
    'finance.write',
    'bookings.refund',
    'analytics.read',
  ],
  supplier_manager: [
    'suppliers.read',
    'suppliers.write',
    'airports.read',
    'services.read',
    'bookings.read',
  ],
  content_seo: [
    'cms.read',
    'cms.write',
    'cms.publish',
    'airports.read',
    'services.read',
  ],
  analyst: [
    'analytics.read',
    'bookings.read',
    'airports.read',
    'services.read',
    'finance.read',
  ],
};
