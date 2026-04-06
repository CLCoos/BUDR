'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { X, Copy, Check, Printer, FileOutput, Stethoscope, Brain, Briefcase } from 'lucide-react';
import { buildResidentExport } from '@/lib/residentExport/buildExports';
import type { ResidentExportInput, ExportAudience } from '@/lib/residentExport/types';

type Props = {
  exportInput: ResidentExportInput;
};

const AUDIENCES: {
  id: ExportAudience;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}[] = [
  {
    id: 'laege',
    title: 'Læge',
    subtitle: 'Medicin, helbred-relaterede notater og borgerens egen besked.',
    icon: Stethoscope,
  },
  {
    id: 'psykiater',
    title: 'Psykiater',
    subtitle: 'Trivsel, stemning, samtaler, hændelser og bekymringsnotater.',
    icon: Brain,
  },
  {
    id: 'sagsbehandler',
    title: 'Sagsbehandler',
    subtitle: 'Netværk, plan, overordnet status og journaluddrag.',
    icon: Briefcase,
  },
];

export default function ResidentExportModule({ exportInput }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ExportAudience>('laege');
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => buildResidentExport(selected, exportInput), [selected, exportInput]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  const handlePrint = useCallback(() => {
    const title =
      selected === 'laege'
        ? 'Udtræk til læge'
        : selected === 'psykiater'
          ? 'Udtræk til psykiater'
          : 'Udtræk til sagsbehandler';
    const safe = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"/><title>${title}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:32px auto;color:#111;line-height:1.55;font-size:13px}
h1{font-size:17px;margin:0 0 8px}
p.meta{color:#555;font-size:12px;margin:0 0 20px}
pre{white-space:pre-wrap;font-family:inherit;font-size:12.5px;margin:0}
@media print{body{margin:16px}}
</style></head><body>
<h1>${title}</h1>
<p class="meta">${exportInput.resident.name} · Værelse ${exportInput.resident.room}</p>
<pre>${safe}</pre>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }, [text, selected, exportInput.resident.name, exportInput.resident.room]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-[#0F1B2D]/30 hover:bg-gray-50 transition-colors"
      >
        <FileOutput size={17} className="text-[#0F1B2D]" aria-hidden />
        Udtræk til samarbejdspartner
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Luk"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative w-full sm:max-w-2xl max-h-[94dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-export-title"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-white shrink-0">
              <div className="min-w-0">
                <h2 id="resident-export-title" className="text-lg font-semibold text-gray-900">
                  Udtræk til samarbejdspartner
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {exportInput.resident.name} · Værelse {exportInput.resident.room}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 shrink-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Vælg modtager
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {AUDIENCES.map((a) => {
                  const Icon = a.icon;
                  const active = selected === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a.id)}
                      className={`text-left rounded-xl border px-3 py-3 transition-all ${
                        active
                          ? 'border-[#0F1B2D] bg-[#0F1B2D] text-white shadow-md ring-1 ring-[#0F1B2D]/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        size={18}
                        className={active ? 'text-white mb-1.5' : 'text-[#0F1B2D] mb-1.5'}
                        aria-hidden
                      />
                      <div className={`text-sm font-semibold ${active ? '' : 'text-gray-900'}`}>
                        {a.title}
                      </div>
                      <p
                        className={`text-[11px] mt-1 leading-snug ${active ? 'text-white/85' : 'text-gray-500'}`}
                      >
                        {a.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 px-5 py-3 overflow-hidden flex flex-col">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Forhåndsvisning</p>
              <div className="flex-1 min-h-[200px] max-h-[42vh] sm:max-h-[48vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/80">
                <pre className="p-4 text-[12px] leading-relaxed text-gray-800 whitespace-pre-wrap font-sans">
                  {text}
                </pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Printer size={16} />
                Udskriv
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="ml-auto sm:ml-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-[#0F1B2D] hover:bg-[#0c1524] transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Kopieret' : 'Kopiér tekst'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
