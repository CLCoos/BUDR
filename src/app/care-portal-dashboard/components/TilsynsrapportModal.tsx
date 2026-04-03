'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Printer, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

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

type ResidentData = {
  name: string;
  trafficLight: string | null;
  moodLabel: string | null;
  note: string | null;
};

type Props = { open: boolean; onClose: () => void };

export default function TilsynsrapportModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState('');
  const [copied, setCopied] = useState(false);
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
    void fetchAndGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchAndGenerate = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const today = new Date().toISOString().slice(0, 10);

      const { data: careResidents } = await supabase
        .from('care_residents')
        .select('user_id, display_name')
        .limit(30);

      const residents: ResidentData[] = [];

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

      // Load indsats records from localStorage
      let indsatsRecords: IndsatsRecord[] = [];
      try {
        const raw = localStorage.getItem(INDSATS_STORAGE_KEY);
        indsatsRecords = raw ? (JSON.parse(raw) as IndsatsRecord[]) : [];
      } catch {
        /* ignore */
      }

      if (mountedRef.current) {
        setLoading(false);
        void generateReport(residents, indsatsRecords);
      }
    } catch {
      if (mountedRef.current) setLoading(false);
    }
  };

  const generateReport = async (residents: ResidentData[], indsatsRecords: IndsatsRecord[]) => {
    setGenerating(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const trafficCounts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
      for (const r of residents) {
        if (r.trafficLight === 'grøn') trafficCounts.grøn++;
        else if (r.trafficLight === 'gul') trafficCounts.gul++;
        else if (r.trafficLight === 'rød') trafficCounts.rød++;
        else trafficCounts.ingen++;
      }

      const residentLines = residents
        .map(
          (r) =>
            `${r.name}: trafiklys=${r.trafficLight ?? 'ingen'}, stemning=${r.moodLabel ?? 'ikke registreret'}${r.note ? `, note: "${r.note.slice(0, 80)}"` : ''}`
        )
        .join('\n');

      const magtanvendelseLines =
        indsatsRecords
          .filter((r) => r.paragraph === '§136' || r.paragraph === '§141')
          .map(
            (r) =>
              `${new Date(r.tidspunkt).toLocaleString('da-DK')} — ${r.type} (${r.paragraph}): ${r.beskrivelse.slice(0, 120)}`
          )
          .join('\n') || 'Ingen registrerede magtanvendelser';

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en assistent der hjælper pædagoger på et botilbud med at udarbejde tilsynsrapporter i Socialtilsynets format. Skriv en professionel, struktureret tilsynsrapport på dansk med følgende fem afsnit:

1. Generelle oplysninger om tilbuddet
2. Borgersammensætning og trivselsoverblik (inkl. trafiklys-fordeling)
3. Dokumenterede magtanvendelser (fra perioden)
4. Handleplaner og indsatser
5. Personalets vurdering af den aktuelle periode

Hold sproget formelt og fagligt. Brug passende fagbegreber fra socialpædagogikken. Max 500 ord.`,
            },
            {
              role: 'user',
              content: `Tilsynsrapport — ${dateStr}

Tilbud: Bosted Nordlys
Antal borgere: ${residents.length}
Trafiklys-fordeling: ${trafficCounts.grøn} grøn, ${trafficCounts.gul} gul, ${trafficCounts.rød} rød, ${trafficCounts.ingen} ikke registreret

Borgerdata:
${residentLines || 'Ingen borgerdata tilgængeligt'}

Magtanvendelser i perioden:
${magtanvendelseLines}

Udarbejd tilsynsrapporten.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 800, temperature: 0.4 },
        }),
      });

      const d = (await res.json()) as { choices?: [{ message: { content: string } }] };
      const text = d.choices?.[0]?.message?.content?.trim();
      if (text && mountedRef.current) {
        setReport(text);
      }
    } catch {
      /* ignore */
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
  body { font-family: system-ui, sans-serif; max-width: 750px; margin: 40px auto; color: #111; line-height: 1.7; font-size: 14px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.meta { color: #666; font-size: 13px; margin-bottom: 28px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Tilsynsrapport — Bosted Nordlys</h1>
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Tilsynsrapport</h2>
              <p className="text-xs text-gray-500">Socialtilsyns-format · AI-genereret</p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {(loading || generating) && !report && (
            <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm">Henter data og genererer tilsynsrapport…</p>
            </div>
          )}

          {report && (
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={20}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm leading-relaxed resize-none outline-none focus:border-indigo-300 focus:bg-white transition-colors"
            />
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Udskriv rapport
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Kopieret!' : 'Kopiér'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
