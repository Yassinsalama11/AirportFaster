import { Fragment } from 'react';
import { adminApiCall } from '@/lib/admin-api';
import { ShieldCheck, Lock } from 'lucide-react';

export const metadata = { title: 'Roles & Permissions' };

interface Permission { key: string; displayName: string; domain: string; }
interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: Permission[];
}

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

export default async function RolesPage() {
  const [roles, allPermissions] = await Promise.all([loadRoles(), loadPermissions()]);

  // Group permissions by domain
  const permissionsByDomain = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.domain] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Roles & Permissions</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Built-in admin roles and the permissions they grant. Custom role editing coming soon.
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="bg-brand-navy border border-white/5 rounded-xl p-8 text-center">
          <Lock className="w-8 h-8 mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">Unable to load roles. Verify your account has roles.read permission.</p>
        </div>
      ) : (
        <>
          {/* Role summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-brand-navy border border-white/5 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-gold" />
                      <h3 className="text-base font-semibold text-brand-white">{role.displayName}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{role.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                    {role.permissions.length} perms
                  </span>
                </div>
                {role.description && (
                  <p className="text-sm text-gray-400 mb-3">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 6).map((p) => (
                    <span
                      key={p.key}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-400"
                    >
                      {p.key}
                    </span>
                  ))}
                  {role.permissions.length > 6 && (
                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5">
                      +{role.permissions.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Permission matrix */}
          {allPermissions.length > 0 && (
            <div className="bg-brand-navy border border-white/5 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-base font-semibold text-brand-white">Permission Matrix</h2>
                <p className="text-sm text-gray-500 mt-1">Which roles can perform which actions.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-black/40">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider sticky start-0 bg-brand-black/40 z-10">
                        Permission
                      </th>
                      {roles.map((role) => (
                        <th
                          key={role.id}
                          className="text-center px-3 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                        >
                          {role.displayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(permissionsByDomain).map(([domain, perms]) => (
                      <Fragment key={domain}>
                        <tr className="bg-white/[0.02]">
                          <td
                            colSpan={roles.length + 1}
                            className="px-4 py-2 text-xs font-semibold text-brand-gold uppercase tracking-wider"
                          >
                            {domain}
                          </td>
                        </tr>
                        {perms.map((perm) => (
                          <tr key={perm.key} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5">
                              <span className="text-xs font-mono text-gray-300">{perm.key}</span>
                              <span className="text-xs text-gray-500 ms-2">{perm.displayName}</span>
                            </td>
                            {roles.map((role) => {
                              const has = role.permissions.some((p) => p.key === perm.key);
                              return (
                                <td key={role.id} className="px-3 py-2.5 text-center">
                                  {has ? (
                                    <span className="inline-block w-4 h-4 rounded-full bg-brand-gold" />
                                  ) : (
                                    <span className="inline-block w-4 h-4 rounded-full bg-white/5" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
