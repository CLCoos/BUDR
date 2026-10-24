'use client';

import { initialsOfName } from '@/lib/residents/formatName';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReportSheet, { ReportActions, ReportSectionLabel } from '@/components/reports/ReportSheet';
import StatusTag from '@/components/ui/StatusTag';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import {
  composeStructuredTilsynsrapport,
  type TilsynsIndsatsRecord,
  type TilsynsResidentRow,
} from '@/lib/tilsynsrapport/composeStructuredTilsynsrapport';
import { getDemoTilsynsResidents } from '@/lib/tilsynsrapport/demoResidents';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { parseOverrapportDocument } from '@/lib/overrapport/parseOverrapportSections';
import { moodLabelFromCheckin } from '@/lib/checkinMoodLabel';
import {
  fetchIndsatsRecords,
  isMagtanvendelse,
  loadDemoIndsatsRecords,
  type IndsatsRecord,
} from '@/lib/indsatsRecords';
import FormattedNumberedReportBody from '@/app/care-portal-dashboard/components/FormattedNumberedReportBody';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Demo: brug realistiske beboerdata når Supabase er tom, og indsatslog fra browseren. */
  preferDemoWhenNoResidents?: boolean;
  /**
   * Kun /care-portal-demo: brug altid demoens borgere og indsatsnotater, også når man er
   * logget ind, og byg rapporten uden AI, så alle besøgende ser den samme rapport.
   */
  demoOnly?: boolean;
  facilityName?: string;
};

const SECTION_HINTS: Record<string, string> = {
  '5': 'Den faglige vurdering skal tilpasses, før rapporten deles.',
};

function toIndsatsLite(rows: IndsatsRecord[]): TilsynsIndsatsRecord[] {
  return rows.map((r) => ({
    paragraph: r.paragraph,
    tidspunkt: r.tidspunkt,
    type: r.type,
    beskrivelse: r.beskrivelse,
    involverede_borgere: r.involverede_borgere,
  }));
}

async function resolveReportFacilityName(explicit?: string): Promise<string> {
  if (explicit?.trim()) return explicit.trim();
  const supabase = createClient();
  if (!supabase) return 'Organisation';
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const orgId = parseStaffOrgId(session?.user?.user_metadata?.org_id);
  if (!orgId) return 'Organisation';
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle();
  const n = org?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : 'Organisation';
}

export default function TilsynsrapportModal({
  open,
  onClose,
  preferDemoWhenNoResidents = false,
  demoOnly = false,
  facilityName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState('');
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState(false);
  const [reportSource, setReportSource] = useState<'ai' | 'template'>('template');
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('live');
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read');
  const [residentsSnapshot, setResidentsSnapshot] = useState<TilsynsResidentRow[]>([]);
  const [indsatsSnapshot, setIndsatsSnapshot] = useState<IndsatsRecord[]>([]);
  const [indsatsError, setIndsatsError] = useState(false);
  const [reportFacilityLabel, setReportFacilityLabel] = useState('Organisation');
  const mountedRef = useRef(true);

  const parsedDoc = useMemo(() => parseOverrapportDocument(report), [report]);
  const canParseSections = parsedDoc.sections.length > 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setReport('');
    setReportFacilityLabel('Organisation');
    setEdited(false);
    setReportSource('template');
    setViewMode('read');
    void fetchAndGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Demoen læser browserens indsatslog; den rigtige portal læser databasen (seneste 12 mdr.). */
  const loadIndsats = async (): Promise<{ records: IndsatsRecord[]; failed: boolean }> => {
    if (demoOnly) return { records: loadDemoIndsatsRecords(), failed: false };
    const supabase = createClient();
    if (!supabase) return { records: [], failed: true };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { records: [], failed: true };
    const { data: staffRow } = await supabase
      .from('care_staff')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();
    const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
    if (!orgId) return { records: [], failed: true };
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const { records, error } = await fetchIndsatsRecords(supabase, orgId, since.toISOString());
    return { records, failed: Boolean(error) };
  };

  const fetchAndGenerate = async () => {
    setLoading(true);
    if (demoOnly) {
      const demoResidents = getDemoTilsynsResidents();
      const { records: demoIndsats } = await loadIndsats();
      if (mountedRef.current) {
        setLoading(false);
        setResidentsSnapshot(demoResidents);
        setIndsatsSnapshot(demoIndsats);
        setIndsatsError(false);
        setDataSource('demo');
        void generateReport(demoResidents, demoIndsats, 'demo');
      }
      return;
    }
    let residents: TilsynsResidentRow[] = [];
    let source: 'live' | 'demo' = 'live';

    try {
      const supabase = createClient();
      if (!supabase) {
        if (preferDemoWhenNoResidents) {
          residents = getDemoTilsynsResidents();
          source = 'demo';
        }
      } else {
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

          for (const r of careResidents) {
            const checkin = checkins?.find((c) => c.resident_id === r.user_id);
            residents.push({
              name: initialsOfName(r.display_name),
              trafficLight: checkin?.traffic_light ?? null,
              moodLabel: moodLabelFromCheckin(checkin),
              note: checkin?.note ?? null,
            });
          }
        }

        if (residents.length === 0 && preferDemoWhenNoResidents) {
          residents = getDemoTilsynsResidents();
          source = 'demo';
        }
      }
    } catch {
      if (preferDemoWhenNoResidents && residents.length === 0) {
        residents = getDemoTilsynsResidents();
        source = 'demo';
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }

    const { records: indsatsRecords, failed } = await loadIndsats();
    if (mountedRef.current) {
      setResidentsSnapshot(residents);
      setIndsatsSnapshot(indsatsRecords);
      setIndsatsError(failed);
      setDataSource(source);
      void generateReport(residents, indsatsRecords, source);
    }
  };

  const generateReport = async (
    residents: TilsynsResidentRow[],
    indsatsRows: IndsatsRecord[],
    _source: 'live' | 'demo'
  ) => {
    const displayFacility = await resolveReportFacilityName(
      facilityName ?? (demoOnly ? `${CARE_PORTAL_DEMO_FACILITY_NAME} (DEMO)` : undefined)
    );
    if (mountedRef.current) setReportFacilityLabel(displayFacility);
    setGenerating(true);
    const now = new Date();
    const dateStr = now.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const dateShort = now.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const indsatsLite = toIndsatsLite(indsatsRows);

    const applyTemplate = () => {
      if (!mountedRef.current) return;
      setReport(
        composeStructuredTilsynsrapport(residents, indsatsLite, {
          dateStr: dateShort,
          facilityName: displayFacility,
        })
      );
      setReportSource('template');
    };

    if (demoOnly) {
      applyTemplate();
      if (mountedRef.current) setGenerating(false);
      return;
    }

    try {
      const magtanvendelser = indsatsRows.filter(isMagtanvendelse).map((r) => ({
        tidspunkt: new Date(r.tidspunkt).toLocaleString('da-DK'),
        type: r.type,
        paragraph: r.paragraph,
        beskrivelse: r.beskrivelse,
      }));
      const res = await fetch('/api/portal/ai/tilsynsrapport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityName: displayFacility,
          dateStr,
          residents,
          magtanvendelser,
          indsatsCount: indsatsRows.length,
          indsatsParagraphs: indsatsRows.map((x) => x.paragraph),
        }),
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"><title>Tilsynsrapport ${now}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 750px; margin: 40px auto; color: #111; line-height: 1.65; font-size: 14px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.meta { color: #666; font-size: 13px; margin-bottom: 28px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Tilsynsrapport — ${reportFacilityLabel}</h1>
<p class="meta">${now}</p>
<pre>${report.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const magtCount = indsatsSnapshot.filter(isMagtanvendelse).length;

  if (!open) return null;

  const trafficCounts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
  for (const r of residentsSnapshot) {
    const t = r.trafficLight?.trim().toLowerCase();
    if (t === 'grøn' || t === 'groen') trafficCounts.grøn++;
    else if (t === 'gul') trafficCounts.gul++;
    else if (t === 'rød' || t === 'roed') trafficCounts.rød++;
    else trafficCounts.ingen++;
  }

  const meta = [
    new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }),
    reportFacilityLabel !== 'Organisation' ? reportFacilityLabel : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const summary = loading
    ? null
    : [
        `${residentsSnapshot.length} borger${residentsSnapshot.length === 1 ? '' : 'e'}`,
        trafficCounts.rød > 0 ? `${trafficCounts.rød} røde` : null,
        trafficCounts.gul > 0 ? `${trafficCounts.gul} gule` : null,
        magtCount === 0
          ? 'ingen magtanvendelser'
          : `${magtCount} magtanvendelse${magtCount === 1 ? '' : 'r'}`,
        `${indsatsSnapshot.length} indsatsnotat${indsatsSnapshot.length === 1 ? '' : 'er'}`,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <ReportSheet
      open={open}
      onClose={onClose}
      title="Tilsynsrapport"
      meta={meta}
      summary={summary}
      backLabel="Tilbage"
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
                        void generateReport(residentsSnapshot, indsatsSnapshot, dataSource);
                      },
                    },
                  ]),
            ]}
          />
        ) : null
      }
    >
      {(loading || generating) && !report && (
        <p className="py-16 text-center text-[15px]" style={{ color: 'var(--cp-muted)' }}>
          Henter data og indsatsnotater og skriver udkastet …
        </p>
      )}

      {indsatsError && (
        <p
          className="m-0 mt-5 flex flex-wrap items-center gap-2 text-sm"
          style={{ color: 'var(--cp-text)' }}
        >
          <StatusTag tone="now">Nu · Tjek</StatusTag>
          Indsatsnotaterne kunne ikke hentes. Tjek magtanvendelser, før rapporten deles.
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
            rows={22}
            className="min-h-[360px] w-full resize-y rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed outline-none focus:border-[var(--cp-green)]"
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
              AI har skrevet udkastet ud fra portalens data. Læs det igennem og tilpas den faglige
              vurdering, før det deles.
            </p>
          )}
          {edited && (
            <p className="m-0 mt-5 text-sm" style={{ color: 'var(--cp-amber)' }}>
              Du har rettet teksten. Det er din version, der kopieres.
            </p>
          )}
          {canParseSections ? (
            <>
              {parsedDoc.sections.map((sec, si) => (
                <section key={`${sec.index}-${si}-${sec.title}`}>
                  <ReportSectionLabel first={si === 0}>{sec.title}</ReportSectionLabel>
                  {SECTION_HINTS[sec.index] && (
                    <p className="m-0 mb-2 text-[13px]" style={{ color: 'var(--cp-muted)' }}>
                      {SECTION_HINTS[sec.index]}
                    </p>
                  )}
                  <FormattedNumberedReportBody body={sec.body} />
                </section>
              ))}
              {parsedDoc.footnote && (
                <p
                  className="m-0 mt-8 border-t pt-4 text-[13px] leading-relaxed"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                >
                  {parsedDoc.footnote}
                </p>
              )}
            </>
          ) : (
            <div className="pt-5">
              <FormattedNumberedReportBody body={report} />
            </div>
          )}
        </>
      )}
    </ReportSheet>
  );
}
