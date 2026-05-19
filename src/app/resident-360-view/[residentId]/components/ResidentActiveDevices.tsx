'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type ResidentSessionRow = {
  id: string;
  created_at: string;
  expires_at: string;
  last_used_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  user_agent: string | null;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('da-DK', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function isActive(row: ResidentSessionRow): boolean {
  if (row.revoked_at) return false;
  return new Date(row.expires_at) > new Date();
}

export default function ResidentActiveDevices({ residentUserId }: { residentUserId: string }) {
  const [sessions, setSessions] = useState<ResidentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/portal/resident-sessions?resident_user_id=${encodeURIComponent(residentUserId)}`
      );
      const json = (await res.json()) as { sessions?: ResidentSessionRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke hente enheder');
      setSessions(json.sessions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke hente enheder');
    } finally {
      setLoading(false);
    }
  }, [residentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch('/api/portal/resident-sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason: 'staff_revoke' }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Tilbagekald mislykkedes');
      }
      toast.success('Enhed tilbagekaldt');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Tilbagekald mislykkedes');
    } finally {
      setRevokingId(null);
    }
  };

  const active = sessions.filter(isActive);

  return (
    <section
      className="mb-6 rounded-xl border p-4"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
        Aktive enheder
      </h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
        Lys-sessioner på borgerens telefoner. Tilbagekald ved mistanke om delt link eller tabt
        enhed.
      </p>

      {loading && (
        <p className="mt-3 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Henter…
        </p>
      )}

      {!loading && active.length === 0 && (
        <p className="mt-3 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Ingen aktive sessioner.
        </p>
      )}

      {!loading && active.length > 0 && (
        <ul className="mt-3 space-y-3">
          {active.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <div className="min-w-0 flex-1 space-y-0.5" style={{ color: 'var(--cp-text)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    Oprettet:{' '}
                  </span>
                  {formatWhen(row.created_at)}
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    Sidst brugt:{' '}
                  </span>
                  {formatWhen(row.last_used_at)}
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    Udløber:{' '}
                  </span>
                  {formatWhen(row.expires_at)}
                </div>
                {row.user_agent && (
                  <div
                    className="truncate text-xs"
                    style={{ color: 'var(--cp-muted)' }}
                    title={row.user_agent}
                  >
                    {row.user_agent}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={revokingId === row.id}
                onClick={() => void revoke(row.id)}
                className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
                style={{
                  borderColor: 'var(--cp-border)',
                  color: 'var(--cp-amber)',
                }}
              >
                {revokingId === row.id ? 'Tilbagekalder…' : 'Tilbagekald enhed'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && sessions.some((s) => s.revoked_at) && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs" style={{ color: 'var(--cp-muted)' }}>
            Tilbagekaldte sessioner ({sessions.filter((s) => s.revoked_at).length})
          </summary>
          <ul className="mt-2 space-y-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
            {sessions
              .filter((s) => s.revoked_at)
              .map((row) => (
                <li key={row.id}>
                  {formatWhen(row.created_at)} — tilbagekaldt {formatWhen(row.revoked_at!)}
                  {row.revoke_reason ? ` (${row.revoke_reason})` : ''}
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}
