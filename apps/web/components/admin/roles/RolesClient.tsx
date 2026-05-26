'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, UserPlus, Users } from 'lucide-react';

export interface Permission {
  key: string;
  displayName: string;
  domain: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: Permission[];
}

export interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles: Array<{ id: string; name: string; displayName: string }>;
}

interface Props {
  initialRoles: Role[];
  permissions: Permission[];
  initialUsers: TeamUser[];
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-brand-white outline-none focus:border-brand-gold';

async function apiJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Request failed');
  }
  return json.data as T;
}

export function RolesClient({ initialRoles, permissions, initialUsers }: Props) {
  const [roles, setRoles] = useState(initialRoles);
  const [users, setUsers] = useState(initialUsers);
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoles[0]?.id ?? '');
  const [savingRole, setSavingRole] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>(initialRoles[0]?.id ? [initialRoles[0].id] : []);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];
  const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>(
    selectedRole?.permissions.map((permission) => permission.key) ?? [],
  );

  const permissionsByDomain = useMemo(
    () =>
      permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
        (acc[permission.domain] ??= []).push(permission);
        return acc;
      }, {}),
    [permissions],
  );

  function selectRole(role: Role) {
    setSelectedRoleId(role.id);
    setRolePermissionKeys(role.permissions.map((permission) => permission.key));
    setMessage(null);
    setError(null);
  }

  function toggleRolePermission(key: string) {
    setRolePermissionKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function toggleInviteRole(roleId: string) {
    setInviteRoleIds((current) =>
      current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId],
    );
  }

  async function saveSelectedRole() {
    if (!selectedRole) return;
    setSavingRole(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiJson<{ role: Role }>(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: selectedRole.displayName,
          description: selectedRole.description,
          permissionKeys: rolePermissionKeys,
        }),
      });
      setRoles((current) => current.map((role) => (role.id === data.role.id ? data.role : role)));
      setMessage('Role permissions saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save role.');
    } finally {
      setSavingRole(false);
    }
  }

  async function sendInvite() {
    setInviteSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiJson('/api/admin/roles/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          roleIds: inviteRoleIds,
        }),
      });
      const refreshed = await apiJson<{ users: TeamUser[] }>('/api/admin/roles/users', { method: 'GET' });
      setUsers(refreshed.users);
      setInviteEmail('');
      setInviteName('');
      setMessage('Invitation email sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to invite user.');
    } finally {
      setInviteSaving(false);
    }
  }

  async function updateUserRoles(user: TeamUser, roleIds: string[], isActive = user.isActive) {
    setSavingUserId(user.id);
    setError(null);
    setMessage(null);
    try {
      await apiJson(`/api/admin/roles/users/${user.id}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ roleIds, isActive }),
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive,
                roles: roles
                  .filter((role) => roleIds.includes(role.id))
                  .map((role) => ({ id: role.id, name: role.name, displayName: role.displayName })),
              }
            : item,
        ),
      );
      setMessage('User access updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user.');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-white">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage team access using real roles, permissions, and admin users.
        </p>
      </div>

      {(message || error) && (
        <div className={`rounded-xl border p-4 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>
          {error ?? message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-white/5 bg-brand-navy p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-gold" />
            <h2 className="text-base font-semibold text-brand-white">Roles</h2>
          </div>
          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles are configured.</p>
            ) : (
              roles.map((role) => (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedRole?.id === role.id
                      ? 'border-brand-gold/40 bg-brand-gold/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-brand-white">{role.displayName}</span>
                    <span className="text-xs text-gray-500">{role.permissions.length} permissions</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-500">{role.name}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 bg-brand-navy p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-brand-white">
                {selectedRole?.displayName ?? 'Select a role'}
              </h2>
              {selectedRole?.description && <p className="mt-1 text-sm text-gray-500">{selectedRole.description}</p>}
            </div>
            <button
              type="button"
              onClick={saveSelectedRole}
              disabled={!selectedRole || savingRole}
              className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-black hover:bg-brand-gold-light disabled:opacity-50"
            >
              {savingRole ? 'Saving...' : 'Save role'}
            </button>
          </div>

          <div className="space-y-5">
            {Object.entries(permissionsByDomain).map(([domain, domainPermissions]) => (
              <div key={domain}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gold">{domain}</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {domainPermissions.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-brand-black/40 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={rolePermissionKeys.includes(permission.key)}
                        onChange={() => toggleRolePermission(permission.key)}
                        className="mt-1 accent-brand-gold"
                      />
                      <span>
                        <span className="block text-sm text-brand-white">{permission.displayName}</span>
                        <span className="block font-mono text-xs text-gray-500">{permission.key}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/5 bg-brand-navy p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-brand-gold" />
          <h2 className="text-base font-semibold text-brand-white">Invite Team User</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_auto]">
          <input className={inputClass} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@airportfaster.com" />
          <input className={inputClass} value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name" />
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <label key={role.id} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={inviteRoleIds.includes(role.id)}
                  onChange={() => toggleInviteRole(role.id)}
                  className="accent-brand-gold"
                />
                {role.displayName}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={sendInvite}
            disabled={inviteSaving || !inviteEmail}
            className="rounded-lg bg-brand-gold px-5 py-2 text-sm font-semibold text-brand-black hover:bg-brand-gold-light disabled:opacity-50"
          >
            {inviteSaving ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-brand-navy">
        <div className="flex items-center gap-2 border-b border-white/5 p-5">
          <Users className="h-4 w-4 text-brand-gold" />
          <h2 className="text-base font-semibold text-brand-white">Team Users</h2>
        </div>
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No team users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-black/40 text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Roles</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const userRoleIds = user.roles.map((role) => role.id);
                  return (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium text-brand-white">{user.name ?? user.email}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <label key={role.id} className="inline-flex items-center gap-2 rounded border border-white/10 px-2 py-1 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={userRoleIds.includes(role.id)}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...userRoleIds, role.id]
                                    : userRoleIds.filter((id) => id !== role.id);
                                  void updateUserRoles(user, next);
                                }}
                                className="accent-brand-gold"
                              />
                              {role.displayName}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => updateUserRoles(user, userRoleIds, !user.isActive)}
                          disabled={savingUserId === user.id}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            user.isActive ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-gray-500">
                        {savingUserId === user.id ? 'Saving...' : user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleDateString('en-GB')}` : 'No login yet'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
