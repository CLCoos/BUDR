'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Printer, ClipboardList, Pencil, LayoutList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import {
  composeStructuredTilsynsrapport,
  type TilsynsIndsatsRecord,
  type TilsynsResidentRow,
} from '@/lib/tilsynsrapport/composeStructuredTilsynsrapport';
import { getDemoTilsynsResidents } from '@/lib/tilsynsrapport/demoResidents';
import { parseOverrapportDocument } from '@/lib/overrapport/parseOverrapportSections';
import FormattedNumberedReportBody from '@/app/care-portal-dashboard/components/FormattedNumberedReportBody';

const INDSATS_STORAGE_KEY = 'budr_indsats_records_v1';

type IndsatsRecord = {
  id: string;
  created_at: string;
  type: string;
  paragraph: string;
  tidspunkt: string;
  varighed: string;
  involverede_borgere: string;
  involverede_personale: string;
  beskrivelse: string;
  forudgaaende: string;
  handling: string;
  borgerens_reaktion: string;
  opfoelgning: string;
  underskrift: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Demo: brug realistiske beboerdata når Supabase er tom. */
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

  const loadIndsatsFromStorage = (): IndsatsRecord[] => {
    try {
      const raw = localStorage.getItem(INDSATS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as IndsatsRecord[]) : [];
    } catch {
      return [];
    }
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
            .select('resident_id, mood_score, traffic_light, note, created_at')
            .in('resident_id', residentIds)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

          const MOOD_LABELS: Record<number, string> = {
            1: 'Svært',
            2: 'Dårligt',
            3: 'OK',
            4: 'Godt',
            5: 'Fantastisk',
          };

          for (const r of careResidents) {
            const checkin = checkins?.find((c) => c.resident_id === r.user_id);
            residents.push({
              name: r.display_name,
              trafficLight: checkin?.traffic_light ?? null,
              moodLabel: checkin?.mood_score ? (MOOD_LABELS[checkin.mood_score] ?? null) : null,
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

    const indsatsRecords = loadIndsatsFromStorage();
    if (mountedRef.current) {
      setResidentsSnapshot(residents);
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

    const trafficCounts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
    for (const r of residents) {
      const t = r.trafficLight?.trim().toLowerCase();
      if (t === 'grøn' || t === 'groen') trafficCounts.grøn++;
      else if (t === 'gul') trafficCounts.gul++;
      else if (t === 'rød' || t === 'roed') trafficCounts.rød++;
      else trafficCounts.ingen++;
    }

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

    const residentLines = residents
      .map(
        (r) =>
          `${r.name}: trafiklys=${r.trafficLight ?? 'ingen'}, stemning=${r.moodLabel ?? 'ikke registreret'}${r.note ? `, note: "${r.note.slice(0, 80)}"` : ''}`
      )
      .join('\n');

    const magtanvendelseLines =
      indsatsRows
        .filter(
          (r) =>
            r.paragraph === '§136' ||
            r.paragraph === '§141' ||
            r.paragraph === '§ 136' ||
            r.paragraph === '§ 141'
        )
        .map(
          (r) =>
            `${new Date(r.tidspunkt).toLocaleString('da-DK')} — ${r.type} (${r.paragraph}): ${r.beskrivelse.slice(0, 120)}`
        )
        .join('\n') || 'Ingen registrerede magtanvendelser i indlæste indsatsnotater.';

    const indsatsSummary = `${indsatsRows.length} indsatsnotat(er) i lokallager; fordeling: ${[...new Set(indsatsRows.map((x) => x.paragraph))].join(', ') || '—'}`;

    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du hjælper med udkast til tilsynsrapport på dansk (socialpsykiatri). Skriv formelt og fagligt, men læsbart.

Brug PRÆCIS disse fem overskrifter på hver sin linje (nummer + punktum + titel):
1. Generelle oplysninger om tilbuddet
2. Borgersammensætning og trivselsoverblik
3. Dokumenterede magtanvendelser
4. Handleplaner og indsatser
5. Personalets vurdering af den aktuelle periode

Under hver overskrift: korte afsnit og/eller punktlister med · foran hvert punkt. Ingen andre niveau-overskrifter.
Max ca. 450 ord. Afslut IKKE med egen disclaimer om AI.`,
            },
            {
              role: 'user',
              content: `Tilsynsrapport — ${displayFacility} · ${dateStr}

Antal borgere i datagrundlag: ${residents.length}
Trafiklysfordeling: ${trafficCounts.grøn} grøn, ${trafficCounts.gul} gul, ${trafficCounts.rød} rød, ${trafficCounts.ingen} ikke registreret

Borgerdata:
${residentLines || 'Ingen borgerdata'}

Magtanvendelser (§ 136 / § 141) i indlæste indsatsnotater:
${magtanvendelseLines}

Indsatser (resume): ${indsatsSummary}

Udarbejd tilsynsrapporten.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 900, temperature: 0.35 },
        }),
      });

      const d = (await res.json()) as {
        choices?: [{ message?: { content?: string | null } }];
        error?: string;
      };
      const text = d.choices?.[0]?.message?.content?.trim();
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

  const magtCount = loadIndsatsFromStorage().filter(
    (r) =>
      r.paragraph === '§136' ||
      r.paragraph === '§141' ||
      r.paragraph === '§ 136' ||
      r.paragraph === '§ 141'
  ).length;

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
                  : 'Struktureret udkast ud fra portaldata og indsatslog (browser)'}
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
                {loadIndsatsFromStorage().length} indsatsnotater (lokal)
              </span>
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
                const indsats = loadIndsatsFromStorage();
                void generateReport(residentsSnapshot, indsats, dataSource);
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
