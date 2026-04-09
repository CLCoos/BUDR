import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import DagbogEveningTools, { type SynthesisTarget } from './components/DagbogEveningTools';

function copenhagenYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

type JournalRow = {
  id: string;
  resident_id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
  journal_status: string | null;
  show_in_diary: boolean | null;
};

export default async function DagensDagbogPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect('/care-portal-login?err=config');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/care-portal-login');

  if (!parseStaffOrgId(user.user_metadata?.org_id)) redirect('/care-portal-dashboard/settings');

  const since = new Date(Date.now() - 40 * 3600 * 1000).toISOString();
  const { data: raw, error } = await supabase
    .from('journal_entries')
    .select(
      'id, resident_id, staff_name, entry_text, category, created_at, journal_status, show_in_diary'
    )
    .eq('show_in_diary', true)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const todayYmd = copenhagenYmd(new Date());
  const rows = ((raw ?? []) as JournalRow[]).filter(
    (r) => copenhagenYmd(new Date(r.created_at)) === todayYmd
  );

  const residentIds = [...new Set(rows.map((r) => r.resident_id))];
  const emptyResidentRows: {
    user_id: string;
    display_name: string;
    onboarding_data: Record<string, unknown> | null;
  }[] = [];
  const { data: resData } =
    residentIds.length > 0
      ? await supabase
          .from('care_residents')
          .select('user_id, display_name, onboarding_data')
          .in('user_id', residentIds)
      : { data: emptyResidentRows };

  const meta = new Map<string, { name: string; house: string; initials: string }>();
  for (const r of resData ?? []) {
    const od = (r.onboarding_data ?? {}) as Record<string, string>;
    const initials = od.avatar_initials ?? r.display_name.slice(0, 3);
    meta.set(r.user_id, {
      name: r.display_name,
      house: od.house ?? '—',
      initials,
    });
  }

  const houseOrder = ['Hus A', 'Hus B', 'Hus C', 'Hus D', 'TLS', '—'];
  const byHouse = new Map<string, JournalRow[]>();
  for (const row of rows) {
    const h = meta.get(row.resident_id)?.house ?? '—';
    if (!byHouse.has(h)) byHouse.set(h, []);
    byHouse.get(h)!.push(row);
  }

  const sortedHouses = [...byHouse.keys()].sort(
    (a, b) => houseOrder.indexOf(a) - houseOrder.indexOf(b) || a.localeCompare(b, 'da')
  );

  const draftCountByResident = new Map<string, number>();
  for (const row of rows) {
    if (row.journal_status !== 'kladde') continue;
    draftCountByResident.set(row.resident_id, (draftCountByResident.get(row.resident_id) ?? 0) + 1);
  }
  const synthesisTargets: SynthesisTarget[] = [...draftCountByResident.entries()]
    .map(([residentId, draftCount]) => ({
      residentId,
      name: meta.get(residentId)?.name ?? residentId.slice(0, 8),
      draftCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'da'));

  const dateLabel = new Date().toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Copenhagen',
  });

  return (
    <PortalShell>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <Link
            href="/resident-360-view"
            className="text-xs font-medium hover:underline mb-2 inline-block"
            style={{ color: 'var(--cp-green, #2dd4a0)' }}
          >
            ← Tilbage til beboere
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cp-text, #111827)' }}>
            Dagens dagbog
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted, #6b7280)' }}>
            Notater markeret &ldquo;Vis i dagbog&rdquo; — {dateLabel} (Europa/København). I løbet af
            dagen gemmes typisk som <strong className="font-medium">kladde</strong> (jeres egne
            stikord); om aftenen kan I samle til ét professionelt notat nedenfor.
          </p>
        </div>

        <DagbogEveningTools targets={synthesisTargets} />

        {error && (
          <p
            className="text-sm rounded-lg border px-3 py-2"
            style={{
              color: 'var(--cp-red, #f56565)',
              borderColor: 'rgba(245,101,101,0.35)',
              backgroundColor: 'rgba(245,101,101,0.1)',
            }}
          >
            Kunne ikke hente journal: {error.message}
          </p>
        )}

        {!error && rows.length === 0 && (
          <div
            className="rounded-xl border px-4 py-10 text-center text-sm"
            style={{
              borderColor: 'var(--cp-border, #e5e7eb)',
              backgroundColor: 'var(--cp-bg2, #fff)',
              color: 'var(--cp-muted, #6b7280)',
            }}
          >
            Ingen dagbogsnotater i dag endnu. Opret et journalnotat på en beboer og sæt flueben ved{' '}
            <strong className="font-medium" style={{ color: 'var(--cp-text)' }}>
              Vis i dagbog
            </strong>
            .
          </div>
        )}

        <div className="space-y-8">
          {sortedHouses.map((house) => {
            const list = byHouse.get(house) ?? [];
            return (
              <section key={house}>
                <h2
                  className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{ color: 'var(--cp-muted2, #9ca3af)' }}
                >
                  {house}
                </h2>
                <ul className="space-y-4">
                  {list.map((row) => {
                    const m = meta.get(row.resident_id);
                    const label = m?.name ?? row.resident_id.slice(0, 8);
                    const draft = row.journal_status === 'kladde';
                    return (
                      <li
                        key={row.id}
                        className="rounded-xl border p-4 text-sm"
                        style={{
                          borderColor: 'var(--cp-border, #e5e7eb)',
                          backgroundColor: 'var(--cp-bg2, #fff)',
                        }}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                          <div className="font-semibold" style={{ color: 'var(--cp-text, #111)' }}>
                            <Link
                              href={`/resident-360-view/${row.resident_id}?tab=overblik`}
                              className="hover:underline"
                              style={{ color: 'var(--cp-green, #2dd4a0)' }}
                            >
                              {label}
                            </Link>
                            {m?.initials && m.initials !== label ? (
                              <span
                                className="ml-2 font-normal text-xs"
                                style={{ color: 'var(--cp-muted, #6b7280)' }}
                              >
                                {m.initials}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span style={{ color: 'var(--cp-muted, #6b7280)' }}>
                              {new Date(row.created_at).toLocaleTimeString('da-DK', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Europe/Copenhagen',
                              })}
                              {' · '}
                              {row.staff_name}
                            </span>
                            <span
                              className="rounded px-2 py-0.5 font-medium"
                              style={{
                                backgroundColor: 'var(--cp-bg3, #f3f4f6)',
                                color: 'var(--cp-muted, #4b5563)',
                              }}
                            >
                              {row.category}
                            </span>
                            {draft && (
                              <span
                                className="rounded px-2 py-0.5 font-medium"
                                style={{
                                  backgroundColor: 'rgba(245,158,11,0.15)',
                                  color: 'var(--cp-amber, #fbbf24)',
                                }}
                              >
                                Kladde
                              </span>
                            )}
                          </div>
                        </div>
                        <pre
                          className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
                          style={{ color: 'var(--cp-muted, #374151)' }}
                        >
                          {row.entry_text}
                        </pre>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </PortalShell>
  );
}
