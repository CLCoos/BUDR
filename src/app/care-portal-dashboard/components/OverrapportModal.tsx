'use client';

import { initialsOfName } from '@/lib/residents/formatName';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReportSheet, { ReportActions, ReportSectionLabel } from '@/components/reports/ReportSheet';
import StatusTag from '@/components/ui/StatusTag';
import ResidentInitials from '@/components/residents/ResidentInitials';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { createClient } from '@/lib/supabase/client';
import {
  composeStructuredOverrapport,
  needsOverrapportAttention,
  overrapportForAi,
  overrapportTag,
  type OverrapportResidentInput,
  type OverrapportTag,
} from '@/lib/overrapport/composeStructuredReport';
import { getDemoOverrapportResidents } from '@/lib/overrapport/demoResidentSummaries';
import { parseOverrapportDocument } from '@/lib/overrapport/parseOverrapportSections';
import { moodLabelFromCheckin } from '@/lib/checkinMoodLabel';
import FormattedNumberedReportBody from '@/app/care-portal-dashboard/components/FormattedNumberedReportBody';

type ResidentSummary = OverrapportResidentInput;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Kun til /care-portal-demo: fyld med realistiske beboerdata når Supabase mangler eller er tom. */
  preferDemoWhenNoResidents?: boolean;
  /**
   * Kun /care-portal-demo: brug altid demoens borgere, også når man er logget ind,
   * og byg rapporten uden AI, så alle besøgende ser den samme rapport.
   */
  demoOnly?: boolean;
};

export default function OverrapportModal({
  open,
  onClose,
  preferDemoWhenNoResidents = false,
  demoOnly = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState<ResidentSummary[]>([]);
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState(false);
  const [reportSource, setReportSource] = useState<'ai' | 'template'>('template');
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('live');
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read');
  const mountedRef = useRef(true);

  const parsedDoc = useMemo(() => parseOverrapportDocument(report), [report]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setReport('');
    setEdited(false);
    setReportSource('template');
    setViewMode('read');
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    if (demoOnly) {
      const demo = getDemoOverrapportResidents();
      if (mountedRef.current) {
        setResidents(demo);
        setDataSource('demo');
        void generateReport(demo);
        setLoading(false);
      }
      return;
    }
    let summaries: ResidentSummary[] = [];
    let source: 'live' | 'demo' = 'live';

    try {
      const supabase = createClient();
      if (supabase) {
        const today = new Date().toISOString().slice(0, 10);

        const { data: careResidents } = await supabase
          .from('care_residents')
          .select('user_id, display_name')
          .limit(30);

        if (careResidents?.length) {
          const residentIds = careResidents.map((r) => r.user_id);
          const { data: checkins } = await supabase
            .from('park_daily_checkin')
            .select('resident_id, mood_score, mood_label, traffic_light, note, created_at')
            .in('resident_id', residentIds)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

          const { data: proposals } = await supabase
            .from('plan_proposals')
            .select('resident_id, status')
            .in('resident_id', residentIds)
            .eq('plan_date', today)
            .eq('status', 'pending');

          summaries = careResidents.map((r) => {
            const checkin = checkins?.find((c) => c.resident_id === r.user_id);
            const pending = proposals?.filter((p) => p.resident_id === r.user_id).length ?? 0;
            return {
              id: r.user_id,
              name: initialsOfName(r.display_name),
              fullName: r.display_name,
              href: `/resident-360-view/${r.user_id}`,
              initials: initialsOfName(r.display_name),
              moodLabel: moodLabelFromCheckin(checkin),
              trafficLight: checkin?.traffic_light ?? null,
              checkinTime: checkin?.created_at
                ? new Date(checkin.created_at).toLocaleTimeString('da-DK', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null,
              notePreview: checkin?.note ?? null,
              pendingMessages: pending,
            };
          });
        }
      }
    } catch {
      /* ignore */
    }

    if (summaries.length === 0 && preferDemoWhenNoResidents) {
      summaries = getDemoOverrapportResidents();
      source = 'demo';
    }

    if (mountedRef.current) {
      setResidents(summaries);
      setDataSource(source);
      void generateReport(summaries);
    }
    if (mountedRef.current) setLoading(false);
  };

  const generateReport = async (data: ResidentSummary[]) => {
    setGenerating(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const ctx = { dateStr, timeStr };

    const applyTemplate = () => {
      if (!mountedRef.current) return;
      setReport(composeStructuredOverrapport(data, ctx));
      setReportSource('template');
    };

    if (demoOnly) {
      applyTemplate();
      if (mountedRef.current) setGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/portal/ai/overrapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residents: overrapportForAi(data), dateStr, timeStr }),
      });

      const d = res.ok ? ((await res.json()) as { text?: string }) : {};
      const text = d.text?.trim();
      if (res.ok && text && mountedRef.current) {
        setReport(text);
        setReportSource('ai');
      } else {
        applyTemplate();
      }
    } catch {
      applyTemplate();
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    const now = new Date().toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"><title>Overrapport ${now}</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;color:#111;line-height:1.6}h1{font-size:18px;margin-bottom:4px}p.meta{color:#666;font-size:13px;margin-bottom:24px}pre{white-space:pre-wrap;font-family:inherit;font-size:15px}@media print{body{margin:20px}}</style>
</head><body><h1>Vagtskifterapport</h1><p class="meta">${now}</p><pre>${report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  if (!open) return null;

  const noCheckins = residents.filter((r) => !r.checkinTime).length;
  const attention = residents
    .filter((r) => needsOverrapportAttention(r) || r.tag)
    .sort((a, b) => toneRank(overrapportTag(a)) - toneRank(overrapportTag(b)));
  const calm = residents.filter((r) => !attention.includes(r));
  const nextShift = parsedDoc.sections.find((sec) => sec.index === '4');
  const now = new Date();
  const timeLabel = now
    .toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '.');
  const meta = [
    capitalize(now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' })),
    `kl. ${timeLabel}`,
    dataSource === 'demo' ? CARE_PORTAL_DEMO_FACILITY_NAME : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const summary =
    residents.length === 0
      ? null
      : [
          `${residents.length} borgere`,
          attention.length > 0
            ? `${attention.length} kræver opmærksomhed`
            : 'ingen kræver ekstra opmærksomhed',
          noCheckins > 0 ? `${noCheckins} uden check-in` : 'alle har tjekket ind',
        ].join(' · ');

  return (
    <ReportSheet
      open={open}
      onClose={onClose}
      title="Overrapport"
      meta={meta}
      metaMobile={`Kl. ${timeLabel}`}
      summary={summary}
      backLabel="Vagt"
      footer={
        report ? (
          <ReportActions
            primary={{
              label: copied ? 'Kopieret' : 'Kopiér rapport',
              icon: copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />,
              onClick: handleCopy,
            }}
            secondary={{
              label: viewMode === 'edit' ? 'Vis rapport' : 'Ret tekst',
              onClick: () => setViewMode((v) => (v === 'read' ? 'edit' : 'read')),
            }}
            tertiary={[
              { label: 'Udskriv', onClick: handlePrint },
              ...(demoOnly
                ? []
                : [
                    {
                      label: generating ? 'Skriver…' : 'Nyt udkast',
                      disabled: generating,
                      onClick: () => {
                        setEdited(false);
                        setViewMode('read');
                        void generateReport(residents);
                      },
                    },
                  ]),
            ]}
          />
        ) : null
      }
    >
      {(generating || loading) && !report && (
        <p className="py-16 text-center text-[15px]" style={{ color: 'var(--cp-muted)' }}>
          Henter dagens data og skriver rapporten …
        </p>
      )}

      {report && viewMode === 'edit' && (
        <div className="pt-5">
          <label className="mb-2 block text-sm" style={{ color: 'var(--cp-muted)' }}>
            Det er denne tekst, der kopieres og udskrives.
          </label>
          <textarea
            value={report}
            onChange={(e) => {
              setReport(e.target.value);
              setEdited(true);
            }}
            rows={20}
            className="min-h-[320px] w-full resize-y rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed outline-none focus:border-[var(--cp-green)]"
            style={{
              borderColor: 'var(--cp-border2)',
              backgroundColor: 'var(--cp-input-bg)',
              color: 'var(--cp-text)',
            }}
          />
        </div>
      )}

      {report && viewMode === 'read' && (
        <>
          {reportSource === 'ai' && (
            <p className="m-0 mt-5 text-sm" style={{ color: 'var(--cp-muted)' }}>
              AI har skrevet teksten ud fra dagens data. Læs den igennem, før du kopierer.
            </p>
          )}
          {edited && (
            <p className="m-0 mt-5 text-sm" style={{ color: 'var(--cp-amber)' }}>
              Du har rettet teksten. Det er din version, der kopieres.
            </p>
          )}
          {attention.length > 0 && (
            <>
              <ReportSectionLabel first>Kræver opmærksomhed</ReportSectionLabel>
              {attention.map((r) => (
                <ReportResidentRow key={r.id ?? r.initials} r={r} attention />
              ))}
            </>
          )}
          {calm.length > 0 && (
            <>
              <ReportSectionLabel first={attention.length === 0}>Rolig dag</ReportSectionLabel>
              {calm.map((r) => (
                <ReportResidentRow key={r.id ?? r.initials} r={r} />
              ))}
            </>
          )}
          {residents.length === 0 && (
            <p className="mt-6 text-[15px]" style={{ color: 'var(--cp-muted)' }}>
              Der er ingen borgere at skrive om endnu.
            </p>
          )}
          {nextShift && nextShift.body.trim() && (
            <>
              <ReportSectionLabel>Til næste vagt</ReportSectionLabel>
              <div className="pt-2">
                <FormattedNumberedReportBody body={nextShift.body} />
              </div>
            </>
          )}
        </>
      )}
    </ReportSheet>
  );
}

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function toneRank(tag: OverrapportTag | null): number {
  return tag?.tone === 'now' ? 0 : tag?.tone === 'today' ? 1 : 2;
}

/** Én borger = én række: initialer, mærke og ét notat. Ingen boks i boksen. */
function ReportResidentRow({ r, attention = false }: { r: ResidentSummary; attention?: boolean }) {
  const tag = overrapportTag(r);
  const note =
    r.notePreview?.trim() ||
    (r.checkinTime
      ? `Tjekkede ind kl. ${r.checkinTime.replace(':', '.')}.`
      : 'Ingen check-in i dag.');
  const avatar = (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold sm:h-10 sm:w-10 sm:text-sm"
      style={
        attention
          ? { backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }
          : { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
      }
      aria-hidden
    >
      {r.initials}
    </span>
  );
  return (
    <div
      className={`grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b last:border-b-0 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-3.5 ${
        attention ? 'py-3.5 sm:py-4' : 'items-center py-3'
      }`}
      style={{ borderColor: 'var(--cp-bg3)' }}
    >
      {avatar}
      <div className="flex min-w-0 flex-col gap-1">
        {attention && (
          <div className="flex flex-wrap items-center gap-2">
            <ResidentInitials
              initials={r.initials}
              fullName={r.fullName}
              href={r.href}
              className="text-base font-semibold"
              style={{ color: 'var(--cp-text)' }}
            />
            {tag && <StatusTag tone={tag.tone}>{tag.label}</StatusTag>}
            {r.pendingMessages > 0 && (
              <span className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
                {r.pendingMessages === 1
                  ? '1 besked til jer'
                  : `${r.pendingMessages} beskeder til jer`}
              </span>
            )}
          </div>
        )}
        <p className="m-0 text-[15px] leading-[1.5]" style={{ color: 'var(--cp-muted)' }}>
          {!attention && (
            <>
              <ResidentInitials
                initials={r.initials}
                fullName={r.fullName}
                href={r.href}
                className="font-semibold"
                style={{ color: 'var(--cp-text)' }}
              />{' '}
            </>
          )}
          {note}
        </p>
      </div>
    </div>
  );
}
