'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import {
  composeStructuredOverrapport,
  needsOverrapportAttention,
  type OverrapportResidentInput,
} from '@/lib/overrapport/composeStructuredReport';
import { getDemoOverrapportResidents } from '@/lib/overrapport/demoResidentSummaries';

type ResidentSummary = OverrapportResidentInput;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Kun til /care-portal-demo: fyld med realistiske beboerdata når Supabase mangler eller er tom. */
  preferDemoWhenNoResidents?: boolean;
};

export default function OverrapportModal({
  open,
  onClose,
  preferDemoWhenNoResidents = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [residents, setResidents] = useState<ResidentSummary[]>([]);
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState(false);
  const [reportSource, setReportSource] = useState<'ai' | 'template'>('template');
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('live');
  const mountedRef = useRef(true);

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
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
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
            .select('resident_id, mood_score, traffic_light, note, created_at')
            .in('resident_id', residentIds)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false });

          const { data: proposals } = await supabase
            .from('plan_proposals')
            .select('resident_id, status')
            .in('resident_id', residentIds)
            .eq('plan_date', today)
            .eq('status', 'pending');

          const MOOD_LABELS: Record<number, string> = {
            1: 'Svært',
            2: 'Dårligt',
            3: 'OK',
            4: 'Godt',
            5: 'Fantastisk',
          };

          summaries = careResidents.map((r) => {
            const checkin = checkins?.find((c) => c.resident_id === r.user_id);
            const pending = proposals?.filter((p) => p.resident_id === r.user_id).length ?? 0;
            return {
              name: r.display_name,
              initials: r.display_name
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
              moodLabel: checkin?.mood_score ? (MOOD_LABELS[checkin.mood_score] ?? null) : null,
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

    try {
      const residentLines = data
        .map((r) => {
          const parts = [`${r.name}:`];
          if (r.checkinTime) parts.push(`check-in kl. ${r.checkinTime}`);
          if (r.moodLabel) parts.push(`stemning: ${r.moodLabel}`);
          if (r.trafficLight) parts.push(`trafiklys: ${r.trafficLight}`);
          if (r.notePreview) parts.push(`note: "${r.notePreview.slice(0, 80)}"`);
          if (r.pendingMessages > 0) parts.push(`${r.pendingMessages} besked(er) til personalet`);
          if (!r.checkinTime) parts.push('ingen check-in i dag');
          return parts.join(', ');
        })
        .join('\n');

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en assistent der hjælper pædagoger på et botilbud med at skrive vagtskifterapporter. Skriv en professionel, struktureret mundtlig overrapport på dansk. Formatet:
1. Generelt overblik (1-2 sætninger om vagten samlet set)
2. Borgere der kræver særlig opmærksomhed (rød/gul trafiklys, beskeder, lavt humør)
3. Øvrige borgere (kort opsummering)
4. Opmærksomhedspunkter til næste vagt

Hold sproget professionelt men ikke stift. Max 300 ord.`,
            },
            {
              role: 'user',
              content: `Vagtskifterapport — ${dateStr}, kl. ${timeStr}\n\nBorgerdata for i dag:\n${residentLines}\n\nSkriv overrapporten.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 500, temperature: 0.5 },
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
  const attention = residents.filter(needsOverrapportAttention);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Auto-overrapport</h2>
              <p className="text-xs text-gray-500">
                {reportSource === 'ai'
                  ? 'Genereret med AI ud fra dagens borgerdata'
                  : 'Struktureret udkast ud fra dagens data — klar til redigering'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Data summary chips */}
          {!loading && residents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dataSource === 'demo' && (
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
                  Demo-data
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {residents.length} borgere
              </span>
              {attention.length > 0 && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                  {attention.length} kræver opmærksomhed
                </span>
              )}
              {noCheckins > 0 && (
                <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-700">
                  {noCheckins} uden check-in
                </span>
              )}
            </div>
          )}

          {/* Report textarea */}
          {(generating || loading) && !report && (
            <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm">Henter borgerdata og genererer rapport…</p>
            </div>
          )}

          {report && (
            <div className="space-y-3">
              {edited && <p className="text-xs text-blue-600 font-medium">✏️ Redigeret</p>}
              <textarea
                value={report}
                onChange={(e) => {
                  setReport(e.target.value);
                  setEdited(true);
                }}
                rows={14}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm leading-relaxed resize-none outline-none focus:border-blue-300 focus:bg-white transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {report && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => void generateReport(residents)}
              disabled={generating}
              className="rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              {generating ? 'Genererer…' : 'Regenerer'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Udskriv
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
