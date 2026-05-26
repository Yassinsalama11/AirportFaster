import { adminApiCall } from '@/lib/admin-api';
import { RolesClient, type Permission, type Role, type TeamUser } from '@/components/admin/roles/RolesClient';

export const metadata = { title: 'Roles & Permissions' };

async function loadRoles(): Promise<Role[]> {
  try {
    const res = await adminApiCall<{ roles: Role[] }>('/api/admin/roles');
    return res.success ? res.data.roles : [];
  } catch {
    return [];
  }
}

async function loadPermissions(): Promise<Permission[]> {
  try {
    const res = await adminApiCall<{ permissions: Permission[] }>('/api/admin/roles/permissions');
    return res.success ? res.data.permissions : [];
  } catch {
    return [];
  }
}

async function loadUsers(): Promise<TeamUser[]> {
  try {
    const res = await adminApiCall<{ users: TeamUser[] }>('/api/admin/roles/users');
    return res.success ? res.data.users : [];
  } catch {
    return [];
  }
}

export default async function RolesPage() {
  const [roles, permissions, users] = await Promise.all([loadRoles(), loadPermissions(), loadUsers()]);
  return <RolesClient initialRoles={roles} permissions={permissions} initialUsers={users} />;
}
