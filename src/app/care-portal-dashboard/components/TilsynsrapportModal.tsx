'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Printer, ClipboardList, Pencil, LayoutList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import {
  composeStructuredTilsynsrapport,
  type TilsynsIndsatsRecord,
  type TilsynsResidentRow,
} from '@/lib/tilsynsrapport/composeStructuredTilsynsrapport';
import { getDemoTilsynsResidents } from '@/lib/tilsynsrapport/demoResidents';
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
  facilityName?: string;
};

const SECTION_HINTS: Record<string, string> = {
  '1': 'Grunddata og datagrundlag',
  '2': 'Trafiklys og status pr. borger',
  '3': '§ 136 / § 141 fra indsatslog',
  '4': 'Indsatsnotater i perioden',
  '5': 'Faglig vurdering — tilpas før deling',
};

function toIndsatsLite(rows: IndsatsRecord[]): TilsynsIndsatsRecord[] {
  return rows.map((r) => ({
    paragraph: r.paragraph,
    tidspunkt: r.tidspunkt,
    type: r.type,
    beskrivelse: r.beskrivelse,
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
  const showFormattedView = canParseSections && viewMode === 'read' && !edited;
  const showSourceEditor = !canParseSections || viewMode === 'edit' || edited;

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

  /** Demo-ruter læser browserens indsatslog; den rigtige portal læser databasen (seneste 12 mdr.). */
  const loadIndsats = async (): Promise<{ records: IndsatsRecord[]; failed: boolean }> => {
    if (preferDemoWhenNoResidents) return { records: loadDemoIndsatsRecords(), failed: false };
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
              name: r.display_name,
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
    const displayFacility = await resolveReportFacilityName(facilityName);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-[#E8EDF5] flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-[#2c5282]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Tilsynsrapport</h2>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                {reportSource === 'ai'
                  ? 'AI-udkast til tilsynsbrug — gennemlæs og tilpas'
                  : 'Struktureret udkast ud fra portaldata og indsatslog'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {report && (
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === 'read' ? 'edit' : 'read'))}
                className="h-9 px-3 rounded-xl text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
              >
                {viewMode === 'read' ? (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    Rediger tekst
                  </>
                ) : (
                  <>
                    <LayoutList className="h-3.5 w-3.5" />
                    Vis oversigt
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!loading && (
            <div className="flex flex-wrap gap-2">
              {dataSource === 'demo' && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                  Demo-data
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {residentsSnapshot.length} borger{residentsSnapshot.length === 1 ? '' : 'e'} i
                grundlag
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
                {trafficCounts.grøn} grøn / {trafficCounts.gul} gul / {trafficCounts.rød} rød
              </span>
              <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                {indsatsSnapshot.length} indsatsnotater
                {dataSource === 'demo' ? ' (demo)' : ' (seneste 12 mdr.)'}
              </span>
              {indsatsError && (
                <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-800">
                  Indsatsloggen kunne ikke hentes. Tjek magtanvendelser, før rapporten deles.
                </span>
              )}
              {magtCount > 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                  {magtCount} § 136/141
                </span>
              )}
            </div>
          )}

          {(loading || generating) && !report && (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-[#2c5282] rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm">Henter data og bygger tilsynsudkast…</p>
            </div>
          )}

          {report && showFormattedView && (
            <div className="space-y-4">
              {parsedDoc.headline && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-3">
                  {parsedDoc.headline}
                </p>
              )}
              <div className="space-y-4">
                {parsedDoc.sections.map((sec, si) => {
                  const sub = SECTION_HINTS[sec.index] ?? null;
                  return (
                    <article
                      key={`${sec.index}-${si}-${sec.title}`}
                      className="rounded-2xl border border-gray-100 bg-gradient-to-b from-slate-50/90 to-white px-4 py-4 sm:px-5 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2c5282] text-xs font-bold text-white"
                          aria-hidden
                        >
                          {sec.index}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                            {sec.title}
                          </h3>
                          {sub ? (
                            <p className="text-[11px] text-gray-500 mt-1 leading-snug">{sub}</p>
                          ) : null}
                        </div>
                      </div>
                      <FormattedNumberedReportBody
                        body={sec.body}
                        bulletColorClass="bg-[#2c5282]"
                      />
                    </article>
                  );
                })}
              </div>
              {parsedDoc.footnote && (
                <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
                  {parsedDoc.footnote}
                </p>
              )}
            </div>
          )}

          {report && showSourceEditor && (
            <div className="space-y-3">
              {edited && canParseSections && (
                <p className="text-xs text-amber-700 font-medium">
                  Teksten er ændret — vælg &quot;Vis oversigt&quot; efter regenerering for kort
                  layout.
                </p>
              )}
              <textarea
                value={report}
                onChange={(e) => {
                  setReport(e.target.value);
                  setEdited(true);
                }}
                rows={viewMode === 'edit' ? 20 : 16}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm leading-relaxed resize-y min-h-[220px] outline-none focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]/20 focus:bg-white transition-colors"
              />
            </div>
          )}
        </div>

        {report && (
          <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEdited(false);
                setViewMode('read');
                void generateReport(residentsSnapshot, indsatsSnapshot, dataSource);
              }}
              disabled={generating}
              className="rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              {generating ? 'Genererer…' : 'Regenerer'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Udskriv
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-[#2c5282] hover:bg-[#244468] transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopieret!' : 'Kopiér rapport'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
