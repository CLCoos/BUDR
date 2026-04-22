'use client';

import React, { useActionState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { createOrganisationAction, type CreateOrgResult } from './actions';

type OrgActivityPoint = {
  date: string;
  label: string;
  journalEntries: number;
  checkIns: number;
  logins: number;
};

type OrgAdminOverviewRow = {
  orgId: string;
  name: string;
  createdAt: string;
  deactivatedAt: string | null;
  residentCount: number;
  staffCount: number;
  latestAuditAt: string | null;
  activitySeries: OrgActivityPoint[];
};

type HealthFilter = 'all' | 'critical' | 'warning' | 'healthy';

function parseHealthFilter(value: string | null | undefined): HealthFilter {
  if (value === 'critical' || value === 'warning' || value === 'healthy' || value === 'all') {
    return value;
  }
  return 'all';
}

function formatDate(value: string | null): string {
  if (!value) return 'Ingen aktivitet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ukendt';
  return date.toLocaleString('da-DK');
}

function getOrgHealthSignals(row: OrgAdminOverviewRow): Array<{
  key: string;
  label: string;
  tone: 'red' | 'amber' | 'green';
}> {
  const signals: Array<{ key: string; label: string; tone: 'red' | 'amber' | 'green' }> = [];
  if (row.staffCount === 0) {
    signals.push({ key: 'no-staff', label: 'Ingen staff', tone: 'red' });
  }
  if (row.deactivatedAt) {
    signals.push({ key: 'deactivated', label: 'Deaktiveret', tone: 'red' });
  }
  if (row.residentCount === 0) {
    signals.push({ key: 'no-residents', label: 'Ingen beboere', tone: 'amber' });
  }
  if (!row.latestAuditAt) {
    signals.push({ key: 'no-audit', label: 'Ingen audit endnu', tone: 'amber' });
  } else {
    const ageMs = Date.now() - new Date(row.latestAuditAt).getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    if (ageMs > fourteenDaysMs) {
      signals.push({ key: 'inactive', label: 'Ingen aktivitet > 14 dage', tone: 'amber' });
    }
  }
  if (signals.length === 0) {
    signals.push({ key: 'healthy', label: 'Ser sund ud', tone: 'green' });
  }
  return signals;
}

function getOrgSeverityScore(row: OrgAdminOverviewRow): number {
  const signals = getOrgHealthSignals(row);
  if (signals.some((signal) => signal.tone === 'red')) return 0;
  if (signals.some((signal) => signal.tone === 'amber')) return 1;
  return 2;
}

function ActivityTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string> & { label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const journal = payload.find((p) => p.dataKey === 'journalEntries')?.value ?? 0;
  const checkIns = payload.find((p) => p.dataKey === 'checkIns')?.value ?? 0;
  const logins = payload.find((p) => p.dataKey === 'logins')?.value ?? 0;
  return (
    <div
      className="rounded-lg border px-2 py-1 text-xs"
      style={{
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(15,23,42,0.92)',
        color: '#e2e8f0',
      }}
    >
      <p className="font-semibold">{label}</p>
      <p>Journal: {journal}</p>
      <p>Check-ins: {checkIns}</p>
      <p>Logins: {logins}</p>
    </div>
  );
}

export default function BudrAdminClient({
  overviewRows,
  overviewError,
  initialHealthFilter,
}: {
  overviewRows: OrgAdminOverviewRow[];
  overviewError: string | null;
  initialHealthFilter: HealthFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState<CreateOrgResult | null, FormData>(
    createOrganisationAction,
    null
  );
  const [busyOrgId, setBusyOrgId] = React.useState<string | null>(null);
  const [opsError, setOpsError] = React.useState<string | null>(null);
  const [healthFilter, setHealthFilter] = React.useState<HealthFilter>(initialHealthFilter);
  React.useEffect(() => {
    setHealthFilter(parseHealthFilter(searchParams.get('health')));
  }, [searchParams]);
  const sortedRows = [...overviewRows].sort((a, b) => {
    const severityDiff = getOrgSeverityScore(a) - getOrgSeverityScore(b);
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const visibleRows = sortedRows.filter((row) => {
    const severity = getOrgSeverityScore(row);
    if (healthFilter === 'critical') return severity === 0;
    if (healthFilter === 'warning') return severity === 1;
    if (healthFilter === 'healthy') return severity === 2;
    return true;
  });
  const filterCounts = sortedRows.reduce(
    (acc, row) => {
      const severity = getOrgSeverityScore(row);
      acc.all += 1;
      if (severity === 0) acc.critical += 1;
      else if (severity === 1) acc.warning += 1;
      else acc.healthy += 1;
      return acc;
    },
    { all: 0, critical: 0, warning: 0, healthy: 0 }
  );

  async function deactivateOrganisation(orgId: string, orgName: string) {
    const confirmed = window.confirm(
      `Deaktivere ${orgName}? Alle logins i organisationen bliver blokeret, indtil I manuelt reaktiverer i databasen.`
    );
    if (!confirmed) return;
    setOpsError(null);
    setBusyOrgId(orgId);
    try {
      const res = await fetch('/budr-admin/deactivate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setOpsError(payload.error ?? 'Kunne ikke deaktivere organisationen.');
        return;
      }
      router.refresh();
    } catch {
      setOpsError('Netværksfejl under deaktivering.');
    } finally {
      setBusyOrgId(null);
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-10 sm:px-6"
      style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)' }}
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header>
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--cp-muted)' }}
          >
            Internal
          </p>
          <h1
            className="mt-1 text-3xl"
            style={{ fontFamily: "'DM Serif Display', serif", lineHeight: 1.15 }}
          >
            BUDR Admin
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
            Opret organisation og få invite-link til lederen.
          </p>
        </header>

        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="admin_secret" className="mb-1.5 block text-xs font-semibold">
                Admin secret
              </label>
              <input
                id="admin_secret"
                name="admin_secret"
                type="password"
                required
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
                placeholder="BUDR_ADMIN_SECRET"
              />
            </div>

            <div>
              <label htmlFor="org_name" className="mb-1.5 block text-xs font-semibold">
                Organisationsnavn
              </label>
              <input
                id="org_name"
                name="org_name"
                type="text"
                required
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
                placeholder="Fx Solsiden Botilbud"
              />
            </div>

            <div>
              <label htmlFor="slug" className="mb-1.5 block text-xs font-semibold">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
                placeholder="fx-solsiden"
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                Brug små bogstaver, tal og bindestreg.
              </p>
            </div>

            {state && !state.ok && (
              <p
                className="rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: 'rgba(239,68,68,0.35)',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  color: '#fca5a5',
                }}
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {pending ? 'Opretter…' : 'Opret organisation'}
            </button>
          </form>
        </section>

        {state && state.ok && (
          <section
            className="space-y-3 rounded-2xl border p-5 sm:p-6"
            style={{
              borderColor: 'rgba(16,185,129,0.35)',
              backgroundColor: 'rgba(16,185,129,0.08)',
            }}
          >
            <h2 className="text-lg font-semibold" style={{ color: '#86efac' }}>
              Organisation oprettet
            </h2>
            <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
              <strong>{state.orgName}</strong> ({state.slug})
            </p>
            <div className="space-y-2 text-sm">
              <p style={{ color: 'var(--cp-muted)' }}>Invite code</p>
              <code
                className="block overflow-x-auto rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: 'rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(15,23,42,0.35)',
                  color: '#e2e8f0',
                }}
              >
                {state.inviteCode}
              </code>
            </div>
            <div className="space-y-2 text-sm">
              <p style={{ color: 'var(--cp-muted)' }}>Invite-link til leder</p>
              <code
                className="block overflow-x-auto rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: 'rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(15,23,42,0.35)',
                  color: '#e2e8f0',
                }}
              >
                {state.inviteLink}
              </code>
            </div>
          </section>
        )}

        <section
          className="rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Organisationsoverblik</h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              Tværgående sundhedstjek: beboere, personale og seneste aktivitet i audit-log.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Alle' },
                { id: 'critical', label: 'Kritiske' },
                { id: 'warning', label: 'Advarsler' },
                { id: 'healthy', label: 'Sunde' },
              ].map((option) => {
                const active = healthFilter === option.id;
                const count = filterCounts[option.id as HealthFilter];
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      const nextFilter = option.id as HealthFilter;
                      setHealthFilter(nextFilter);
                      const params = new URLSearchParams(searchParams.toString());
                      if (nextFilter === 'all') params.delete('health');
                      else params.set('health', nextFilter);
                      const query = params.toString();
                      router.replace(query ? `${pathname}?${query}` : pathname);
                    }}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: active ? 'var(--cp-green)' : 'var(--cp-border)',
                      backgroundColor: active ? 'rgba(29,158,117,0.16)' : 'var(--cp-bg3)',
                      color: active ? '#86efac' : 'var(--cp-text)',
                    }}
                  >
                    {option.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {overviewError && (
            <p
              className="mb-4 rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: 'rgba(239,68,68,0.35)',
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#fca5a5',
              }}
            >
              {overviewError}
            </p>
          )}
          {opsError && (
            <p
              className="mb-4 rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: 'rgba(239,68,68,0.35)',
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#fca5a5',
              }}
            >
              {opsError}
            </p>
          )}

          <div
            className="overflow-x-auto rounded-xl border"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <table className="min-w-full text-left text-sm">
              <thead style={{ backgroundColor: 'var(--cp-bg3)' }}>
                <tr>
                  <th className="px-3 py-2 font-semibold">Organisation</th>
                  <th className="px-3 py-2 font-semibold">Oprettet</th>
                  <th className="px-3 py-2 font-semibold">Beboere</th>
                  <th className="px-3 py-2 font-semibold">Staff</th>
                  <th className="px-3 py-2 font-semibold">Seneste audit-log</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-sm"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      {sortedRows.length === 0
                        ? 'Ingen organisationer fundet endnu.'
                        : 'Ingen organisationer matcher det valgte filter.'}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr
                      key={row.orgId}
                      className="border-t"
                      style={{ borderColor: 'var(--cp-border)' }}
                    >
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <p>{row.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {getOrgHealthSignals(row).map((signal) => {
                              const styles =
                                signal.tone === 'red'
                                  ? {
                                      borderColor: 'rgba(239,68,68,0.4)',
                                      backgroundColor: 'rgba(239,68,68,0.12)',
                                      color: '#fca5a5',
                                    }
                                  : signal.tone === 'amber'
                                    ? {
                                        borderColor: 'rgba(245,158,11,0.38)',
                                        backgroundColor: 'rgba(245,158,11,0.12)',
                                        color: '#fcd34d',
                                      }
                                    : {
                                        borderColor: 'rgba(16,185,129,0.4)',
                                        backgroundColor: 'rgba(16,185,129,0.12)',
                                        color: '#86efac',
                                      };

                              return (
                                <span
                                  key={signal.key}
                                  className="rounded-full border px-2 py-0.5 text-xs font-medium"
                                  style={styles}
                                >
                                  {signal.label}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <a
                              href={`/budr-admin/export/${row.orgId}`}
                              className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                              style={{
                                borderColor: 'var(--cp-border)',
                                backgroundColor: 'var(--cp-bg3)',
                                color: 'var(--cp-text)',
                              }}
                            >
                              Eksportér data (ZIP)
                            </a>
                            {!row.deactivatedAt && (
                              <button
                                type="button"
                                onClick={() => void deactivateOrganisation(row.orgId, row.name)}
                                disabled={busyOrgId === row.orgId}
                                className="rounded-md border px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                                style={{
                                  borderColor: 'rgba(239,68,68,0.45)',
                                  backgroundColor: 'rgba(239,68,68,0.12)',
                                  color: '#fca5a5',
                                }}
                              >
                                {busyOrgId === row.orgId
                                  ? 'Deaktiverer…'
                                  : 'Deaktivér organisation'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">{formatDate(row.createdAt)}</td>
                      <td className="px-3 py-2">{row.residentCount}</td>
                      <td className="px-3 py-2">{row.staffCount}</td>
                      <td className="px-3 py-2">{formatDate(row.latestAuditAt)}</td>
                    </tr>
                  ))
                )}
                {visibleRows.map((row) => (
                  <tr key={`${row.orgId}-activity`} style={{ borderColor: 'var(--cp-border)' }}>
                    <td
                      className="px-3 pb-4"
                      colSpan={5}
                      style={{ borderTop: '1px dashed var(--cp-border)' }}
                    >
                      <div className="mt-2">
                        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
                          <span style={{ color: 'var(--cp-muted)' }}>
                            Daglig aktivitet (30 dage)
                          </span>
                          <span style={{ color: '#7dd3fc' }}>● Journal</span>
                          <span style={{ color: '#fbbf24' }}>● Check-ins</span>
                          <span style={{ color: '#86efac' }}>● Logins</span>
                        </div>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={row.activitySeries}>
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                minTickGap={20}
                              />
                              <YAxis
                                allowDecimals={false}
                                width={30}
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                              />
                              <Tooltip content={<ActivityTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="journalEntries"
                                stroke="#7dd3fc"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="checkIns"
                                stroke="#fbbf24"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="logins"
                                stroke="#86efac"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
