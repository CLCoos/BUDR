'use client';

import { useEffect, useMemo, useState } from 'react';
import { PERMISSIONS, type Permission } from '@/lib/permissions';
import { PERMISSION_LABELS } from '@/lib/permissionLabels';

type Role = {
  id: string;
  name: string;
  is_system_role: boolean;
  permissions: Permission[];
};

export default function RolesClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/portal/roles', { credentials: 'include' });
      const json = (await res.json()) as { roles?: Role[] };
      if (!json.roles) return;
      setRoles(json.roles);
      if (!activeRoleId) setActiveRoleId(json.roles[0]?.id ?? null);
    })();
  }, [activeRoleId]);

  const activeRole = useMemo(
    () => roles.find((role) => role.id === activeRoleId) ?? null,
    [roles, activeRoleId]
  );

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const res = await fetch('/api/portal/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newRoleName.trim() }),
    });
    const json = (await res.json()) as { role?: Role };
    if (json.role) {
      setRoles((prev) => [...prev, json.role!]);
      setActiveRoleId(json.role.id);
      setNewRoleName('');
    }
  };

  const saveActiveRole = async () => {
    if (!activeRole) return;
    await fetch(`/api/portal/roles/${activeRole.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: activeRole.name, permissions: activeRole.permissions }),
    });
  };

  const deleteActiveRole = async () => {
    if (!activeRole || activeRole.is_system_role) return;
    const res = await fetch(`/api/portal/roles/${activeRole.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setRoles((prev) => prev.filter((r) => r.id !== activeRole.id));
      setActiveRoleId((prev) => (prev === activeRole.id ? null : prev));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-xl border p-4" style={{ borderColor: 'var(--cp-border)' }}>
        <h1 className="text-lg font-semibold mb-3">Roller</h1>
        <div className="mb-3 flex gap-2">
          <input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Ny rolle"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={() => void createRole()}
            className="rounded-lg bg-[var(--cp-green)] px-3 text-white"
          >
            Opret
          </button>
        </div>
        <div className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleId(role.id)}
              className="w-full rounded-lg border px-3 py-2 text-left text-sm"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              {role.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor: 'var(--cp-border)' }}>
        {!activeRole ? (
          <p className="text-sm">Vælg en rolle</p>
        ) : (
          <>
            <div className="mb-3">
              <input
                value={activeRole.name}
                disabled={activeRole.is_system_role}
                onChange={(e) =>
                  setRoles((prev) =>
                    prev.map((r) => (r.id === activeRole.id ? { ...r, name: e.target.value } : r))
                  )
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {Object.values(PERMISSIONS).map((perm) => (
                <label
                  key={perm}
                  className="rounded-lg border p-2 text-xs"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={activeRole.permissions.includes(perm)}
                      onChange={(e) =>
                        setRoles((prev) =>
                          prev.map((r) =>
                            r.id !== activeRole.id
                              ? r
                              : {
                                  ...r,
                                  permissions: e.target.checked
                                    ? [...r.permissions, perm]
                                    : r.permissions.filter((p) => p !== perm),
                                }
                          )
                        )
                      }
                    />
                    <div>
                      <div>{PERMISSION_LABELS[perm].label}</div>
                      <div className="text-[11px] text-[var(--cp-muted)]">
                        {PERMISSION_LABELS[perm].description}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => void saveActiveRole()}
                className="rounded-lg bg-[var(--cp-green)] px-3 py-2 text-xs text-white"
              >
                Gem
              </button>
              <button
                onClick={() => void deleteActiveRole()}
                disabled={activeRole.is_system_role}
                className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
              >
                Slet
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
