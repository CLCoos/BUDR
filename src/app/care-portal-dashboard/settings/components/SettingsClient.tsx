'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus, CheckCircle2, Copy } from 'lucide-react';
import { PERMISSIONS, type Permission } from '@/lib/permissions';
import MarketingCopyCmsCard from './MarketingCopyCmsCard';
import MarketingSectionsCmsCard from './MarketingSectionsCmsCard';
import type { NameDisplayMode } from '@/lib/residents/formatName';

type OrgRole = {
  id: string;
  name: string;
  is_system_role: boolean;
  permissions?: string[];
};

type Props = {
  staffEmail: string;
  orgId: string | null;
  initialRoles: OrgRole[];
  canManageRoles: boolean;
  canInviteStaff: boolean;
  initialResidentNameDisplayMode: NameDisplayMode;
};

type InviteState = 'idle' | 'submitting' | 'success' | 'error';

export default function SettingsClient({
  staffEmail,
  orgId,
  initialRoles,
  canManageRoles,
  canInviteStaff,
  initialResidentNameDisplayMode,
}: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRoles[0]?.id ?? '');
  const [inviteState, setInviteState] = useState<InviteState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [orgIdCopied, setOrgIdCopied] = useState(false);
  const [roles, setRoles] = useState<OrgRole[]>(initialRoles);
  const [roleName, setRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Permission[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [residentNameDisplayMode, setResidentNameDisplayMode] = useState<NameDisplayMode>(
    initialResidentNameDisplayMode
  );
  const [savingNameMode, setSavingNameMode] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/portal/roles', { credentials: 'include' });
      const json = (await res.json()) as { roles?: OrgRole[] };
      if (!res.ok || !json.roles) return;
      setRoles(json.roles);
      if (!selectedRoleId && json.roles[0]?.id) setSelectedRoleId(json.roles[0].id);
    })();
  }, [selectedRoleId]);

  const handleCopyOrgId = async () => {
    if (!orgId) return;
    try {
      await navigator.clipboard.writeText(orgId);
      setOrgIdCopied(true);
      setTimeout(() => setOrgIdCopied(false), 2000);
    } catch {
      /* ignore — clipboard may be blocked */
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || inviteState === 'submitting') return;

    setInviteState('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/portal/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim(), roleId: selectedRoleId }),
        credentials: 'include',
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Ukendt fejl — prøv igen');
        setInviteState('error');
        return;
      }

      setSentTo(trimmedEmail);
      setInviteState('success');
      setEmail('');
      setName('');
    } catch {
      setErrorMsg('Netværksfejl — tjek forbindelsen og prøv igen');
      setInviteState('error');
    }
  };

  const resetInvite = () => {
    setInviteState('idle');
    setErrorMsg(null);
    setSentTo(null);
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    setCreatingRole(true);
    setRoleError(null);
    const res = await fetch('/api/portal/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: roleName.trim(), permissions: [] }),
    });
    const json = (await res.json()) as { role?: OrgRole; error?: string };
    setCreatingRole(false);
    if (!res.ok || !json.role) {
      setRoleError(json.error ?? 'Kunne ikke oprette rolle');
      return;
    }
    setRoles((prev) => [...prev, json.role!]);
    setSelectedRoleId(json.role.id);
    setRoleName('');
  };

  const startEditPermissions = (role: OrgRole) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingPermissions((role.permissions ?? []) as Permission[]);
  };

  const savePermissions = async (roleId: string) => {
    setSavingRoleId(roleId);
    const res = await fetch(`/api/portal/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: editingRoleName.trim(), permissions: editingPermissions }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSavingRoleId(null);
    if (!res.ok || !json.ok) {
      setRoleError(json.error ?? 'Kunne ikke gemme rettigheder');
      return;
    }
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, name: editingRoleName.trim() || r.name, permissions: [...editingPermissions] }
          : r
      )
    );
    setEditingRoleId(null);
  };

  const deleteRole = async (role: OrgRole) => {
    if (role.is_system_role) return;
    if (!confirm(`Slet rollen "${role.name}"?`)) return;
    const res = await fetch(`/api/portal/roles/${role.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setRoleError(json.error ?? 'Kunne ikke slette rolle');
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    setSelectedRoleId((prev) => (prev === role.id ? (initialRoles[0]?.id ?? '') : prev));
  };

  const saveResidentNameMode = async (mode: NameDisplayMode) => {
    setResidentNameDisplayMode(mode);
    setSavingNameMode(true);
    try {
      const res = await fetch('/api/portal/resident-name-display-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        setRoleError('Kunne ikke gemme visning af beboernavne.');
        setResidentNameDisplayMode(initialResidentNameDisplayMode);
      }
    } finally {
      setSavingNameMode(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1
          className="font-bold"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: 'var(--cp-text)',
            lineHeight: 1.2,
          }}
        >
          Indstillinger
        </h1>
        <p className="mt-1" style={{ fontSize: 13, color: 'var(--cp-muted)' }}>
          Profil og invitation af kolleger
        </p>
      </div>

      {/* Staff profile — read-only */}
      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Min profil
        </h2>

        <div className="space-y-3">
          <div>
            <p
              className="text-xs mb-1"
              style={{
                color: 'var(--cp-muted)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Email
            </p>
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
                fontSize: 13,
              }}
            >
              {staffEmail || '—'}
            </div>
          </div>

          <div>
            <p
              className="text-xs mb-1"
              style={{
                color: 'var(--cp-muted)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Organisation (org_id)
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-lg px-3 py-2.5 font-mono text-xs truncate"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: orgId ? 'var(--cp-text)' : 'var(--cp-muted)',
                  fontSize: 12,
                }}
              >
                {orgId ?? 'Ikke sat — kontakt administrator'}
              </div>
              {orgId && (
                <button
                  type="button"
                  onClick={() => void handleCopyOrgId()}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs transition-colors shrink-0"
                  style={{
                    border: '1px solid var(--cp-border)',
                    color: orgIdCopied ? 'var(--cp-green)' : 'var(--cp-muted)',
                    backgroundColor: orgIdCopied ? 'var(--cp-green-dim)' : 'transparent',
                  }}
                  aria-label="Kopiér org_id"
                >
                  {orgIdCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  {orgIdCopied ? 'Kopieret' : 'Kopiér'}
                </button>
              )}
            </div>
            {!orgId && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--cp-amber)', fontSize: 11 }}>
                Din konto er ikke fuldt koblet til en organisation endnu, saa du kan ikke invitere
                kolleger endnu.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Invite staff */}
      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <UserPlus size={15} style={{ color: 'var(--cp-green)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Invitér kollega
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
          Kollegaen modtager en invitation på email og sættes automatisk i din organisation.
        </p>
        {!canInviteStaff && (
          <p className="text-xs" style={{ color: 'var(--cp-amber)' }}>
            Du har ikke rettighed til at invitere medarbejdere.
          </p>
        )}

        {inviteState === 'success' && sentTo ? (
          <div className="space-y-3">
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-3"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                border: '1px solid rgba(45,212,160,0.25)',
              }}
            >
              <CheckCircle2
                size={15}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--cp-green)' }}
              />
              <p className="text-sm" style={{ color: 'var(--cp-green)', fontSize: 13 }}>
                Invitation sendt til <strong>{sentTo}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={resetInvite}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--cp-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)';
              }}
            >
              Invitér endnu en kollega →
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleInvite(e)} className="space-y-3">
            <div>
              <label
                htmlFor="invite-email"
                className="mb-1.5 block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--cp-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Email *
              </label>
              <input
                id="invite-email"
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kollega@bosted.dk"
                disabled={!orgId || inviteState === 'submitting'}
                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: 'var(--cp-text)',
                  fontSize: 13,
                  opacity: !orgId ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-green)';
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                }}
              />
            </div>

            <div>
              <label
                htmlFor="invite-role"
                className="mb-1.5 block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--cp-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Rolle
              </label>
              <select
                id="invite-role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={!orgId || inviteState === 'submitting' || !canInviteStaff}
                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: 'var(--cp-text)',
                  fontSize: 13,
                  opacity: !orgId ? 0.5 : 1,
                }}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-name"
                className="mb-1.5 block"
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--cp-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Navn (valgfrit)
              </label>
              <input
                id="invite-name"
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fornavn Efternavn"
                disabled={!orgId || inviteState === 'submitting'}
                className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  color: 'var(--cp-text)',
                  fontSize: 13,
                  opacity: !orgId ? 0.5 : 1,
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-green)';
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                }}
              />
            </div>

            {inviteState === 'error' && errorMsg && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--cp-red-dim)',
                  color: 'var(--cp-red)',
                  fontSize: 12,
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={
                !orgId ||
                !email.trim() ||
                !selectedRoleId ||
                inviteState === 'submitting' ||
                !canInviteStaff
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-green)' }}
              onMouseEnter={(e) => {
                if (!(e.currentTarget as HTMLButtonElement).disabled) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#18886a';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-green)';
              }}
            >
              {inviteState === 'submitting' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sender invitation…
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Send invitation
                </>
              )}
            </button>
          </form>
        )}
      </section>

      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Visning af beboere
        </h2>
        {!canManageRoles ? (
          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            Kun ledelse kan ændre navneformat.
          </p>
        ) : (
          <div className="space-y-2">
            {(
              [
                ['first_name_initial', 'Fornavn + initial (Christian C.)'],
                ['full_name', 'Fulde navne (Christian Cloos)'],
                ['initials_only', 'Kun initialer (CJT)'],
              ] as Array<[NameDisplayMode, string]>
            ).map(([mode, label]) => (
              <label
                key={mode}
                className="flex cursor-pointer items-center gap-2 text-sm"
                style={{ color: 'var(--cp-text)' }}
              >
                <input
                  type="radio"
                  name="resident_name_mode"
                  checked={residentNameDisplayMode === mode}
                  disabled={savingNameMode}
                  onChange={() => void saveResidentNameMode(mode)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section
        className="rounded-xl p-5 space-y-4"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border)',
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Roller og rettigheder
        </h2>
        {!canManageRoles ? (
          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            Du har ikke rettighed til at administrere roller.
          </p>
        ) : (
          <>
            <form onSubmit={(e) => void createRole(e)} className="flex gap-2">
              <input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="Ny rolle, fx Praktikant"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  borderColor: 'var(--cp-border)',
                  color: 'var(--cp-text)',
                }}
              />
              <button
                type="submit"
                disabled={creatingRole || !roleName.trim()}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                {creatingRole ? 'Opretter…' : 'Opret rolle'}
              </button>
            </form>
            {roleError && (
              <p className="text-xs" style={{ color: 'var(--cp-red)' }}>
                {roleError}
              </p>
            )}

            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {role.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditPermissions(role)}
                        className="text-xs"
                        style={{ color: 'var(--cp-green)' }}
                      >
                        Rediger rettigheder
                      </button>
                      {!role.is_system_role && (
                        <button
                          type="button"
                          onClick={() => void deleteRole(role)}
                          className="text-xs"
                          style={{ color: 'var(--cp-red)' }}
                        >
                          Slet
                        </button>
                      )}
                    </div>
                  </div>
                  {editingRoleId === role.id && (
                    <div className="space-y-2">
                      <input
                        value={editingRoleName}
                        onChange={(e) => setEditingRoleName(e.target.value)}
                        disabled={role.is_system_role}
                        className="w-full rounded-md border px-2 py-1.5 text-xs"
                        style={{
                          borderColor: 'var(--cp-border)',
                          backgroundColor: 'var(--cp-bg2)',
                          color: 'var(--cp-text)',
                          opacity: role.is_system_role ? 0.6 : 1,
                        }}
                      />
                      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                        {Object.values(PERMISSIONS).map((perm) => (
                          <label key={perm} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={editingPermissions.includes(perm)}
                              onChange={(e) =>
                                setEditingPermissions((prev) =>
                                  e.target.checked
                                    ? [...prev, perm]
                                    : prev.filter((x) => x !== perm)
                                )
                              }
                            />
                            <span style={{ color: 'var(--cp-text)' }}>{perm}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void savePermissions(role.id)}
                          disabled={savingRoleId === role.id}
                          className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          style={{ backgroundColor: 'var(--cp-green)' }}
                        >
                          {savingRoleId === role.id ? 'Gemmer…' : 'Gem'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRoleId(null)}
                          className="rounded-md px-3 py-1.5 text-xs font-semibold"
                          style={{ color: 'var(--cp-muted)', border: '1px solid var(--cp-border)' }}
                        >
                          Annuller
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <MarketingCopyCmsCard />
      <MarketingSectionsCmsCard />
    </div>
  );
}
