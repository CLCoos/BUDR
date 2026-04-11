'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { X, Copy, Check, Printer, FileOutput, Stethoscope, Brain, Briefcase } from 'lucide-react';
import { buildResidentExport } from '@/lib/residentExport/buildExports';
import type { ResidentExportInput, ExportAudience } from '@/lib/residentExport/types';

type Props = {
  exportInput: ResidentExportInput;
  /** Matcher Care Portal / demo — mørk trigger og dialog */
  carePortalDark?: boolean;
  /** Controlled open state — when provided, no trigger button is rendered */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

export default function ResidentExportModule({
  exportInput,
  carePortalDark,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setUncontrolledOpen;
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
      {!isControlled && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
            carePortalDark
              ? 'shadow-sm hover:opacity-95'
              : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-[#0F1B2D]/30 hover:bg-gray-50'
          }`}
          style={
            carePortalDark
              ? {
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg2)',
                  color: 'var(--cp-text)',
                }
              : undefined
          }
        >
          <FileOutput
            size={17}
            className={carePortalDark ? 'text-[var(--cp-green)]' : 'text-[#0F1B2D]'}
            aria-hidden
          />
          Udtræk til samarbejdspartner
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Luk"
            onClick={() => setOpen(false)}
          />
          <div
            className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-2xl sm:rounded-2xl ${
              carePortalDark ? '' : 'border-gray-100 bg-white'
            }`}
            style={
              carePortalDark
                ? {
                    backgroundColor: 'var(--cp-bg2)',
                    borderColor: 'var(--cp-border)',
                  }
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-export-title"
          >
            <div
              className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 ${
                carePortalDark ? '' : 'border-gray-100 bg-gradient-to-r from-gray-50/90 to-white'
              }`}
              style={
                carePortalDark
                  ? { borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }
                  : undefined
              }
            >
              <div className="min-w-0">
                <h2
                  id="resident-export-title"
                  className={`text-lg font-semibold ${carePortalDark ? '' : 'text-gray-900'}`}
                  style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                >
                  Udtræk til samarbejdspartner
                </h2>
                <p
                  className={`mt-0.5 text-xs ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                >
                  {exportInput.resident.name} · Værelse {exportInput.resident.room}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  carePortalDark
                    ? 'text-[var(--cp-muted)] hover:bg-white/5'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                aria-label="Luk"
              >
                <X size={18} />
              </button>
            </div>

            <div className="shrink-0 px-5 pb-2 pt-4">
              <p
                className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                  carePortalDark ? '' : 'text-gray-500'
                }`}
                style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
              >
                Vælg modtager
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {AUDIENCES.map((a) => {
                  const Icon = a.icon;
                  const active = selected === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a.id)}
                      className={`rounded-xl border px-3 py-3 text-left transition-all ${
                        carePortalDark
                          ? ''
                          : active
                            ? 'border-[#0F1B2D] bg-[#0F1B2D] text-white shadow-md ring-1 ring-[#0F1B2D]/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={
                        carePortalDark
                          ? active
                            ? {
                                borderColor: 'var(--cp-green)',
                                backgroundColor: 'var(--cp-green-dim)',
                                boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                              }
                            : {
                                borderColor: 'var(--cp-border)',
                                backgroundColor: 'var(--cp-bg3)',
                              }
                          : undefined
                      }
                    >
                      <Icon
                        size={18}
                        className={
                          carePortalDark
                            ? `mb-1.5 ${active ? 'text-[var(--cp-green)]' : 'text-[var(--cp-muted)]'}`
                            : active
                              ? 'mb-1.5 text-white'
                              : 'mb-1.5 text-[#0F1B2D]'
                        }
                        aria-hidden
                      />
                      <div
                        className={`text-sm font-semibold ${carePortalDark || active ? '' : 'text-gray-900'}`}
                        style={
                          carePortalDark
                            ? { color: active ? 'var(--cp-text)' : 'var(--cp-text)' }
                            : undefined
                        }
                      >
                        {a.title}
                      </div>
                      <p
                        className={`mt-1 text-[11px] leading-snug ${
                          carePortalDark ? '' : active ? 'text-white/85' : 'text-gray-500'
                        }`}
                        style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                      >
                        {a.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3">
              <p
                className={`mb-1.5 text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
              >
                Forhåndsvisning
              </p>
              <div
                className={`min-h-[200px] max-h-[42vh] flex-1 overflow-y-auto rounded-xl border sm:max-h-[48vh] ${
                  carePortalDark ? '' : 'border-gray-200 bg-gray-50/80'
                }`}
                style={
                  carePortalDark
                    ? {
                        borderColor: 'var(--cp-border)',
                        backgroundColor: 'var(--cp-bg)',
                      }
                    : undefined
                }
              >
                <pre
                  className={`p-4 font-sans text-[12px] leading-relaxed whitespace-pre-wrap ${
                    carePortalDark ? '' : 'text-gray-800'
                  }`}
                  style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                >
                  {text}
                </pre>
              </div>
            </div>

            <div
              className={`flex shrink-0 flex-wrap gap-2 border-t px-5 py-4 ${
                carePortalDark ? '' : 'border-gray-100 bg-white'
              }`}
              style={
                carePortalDark
                  ? { borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={handlePrint}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                  carePortalDark
                    ? 'transition-opacity hover:opacity-90'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                style={
                  carePortalDark
                    ? {
                        borderColor: 'var(--cp-border)',
                        color: 'var(--cp-text)',
                      }
                    : undefined
                }
              >
                <Printer size={16} />
                Udskriv
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`ml-auto inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors sm:ml-0 ${
                  carePortalDark ? '' : 'bg-[#0F1B2D] hover:bg-[#0c1524]'
                }`}
                style={
                  carePortalDark
                    ? {
                        background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                        boxShadow: '0 2px 12px rgba(45,212,160,0.25)',
                      }
                    : undefined
                }
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
