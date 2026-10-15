import type { DocumentTypeDefinition } from './registry';
import type { DocumentMeta, DocumentSections, DocumentStatus } from './types';

export type DocumentHeader = {
  residentName: string;
  orgName: string | null;
  orgLogoUrl: string | null;
  status: DocumentStatus;
  version: number;
  approvedByName: string | null;
  approvedAt: string | null;
};

export function formatDanishDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDanishDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });
}

/** Linjerne i dokumentets hoved: borger, tilbud, periode og typens egne felter. */
export function headerLines(
  type: DocumentTypeDefinition,
  h: DocumentHeader,
  meta: DocumentMeta
): [string, string][] {
  const lines: [string, string][] = [['Borger', h.residentName]];
  const paragraph = meta.paragraph ?? null;
  lines.push(['Tilbud', [h.orgName, paragraph].filter(Boolean).join(', ') || '—']);
  if (type.period) {
    lines.push([
      'Periode',
      `${formatDanishDate(meta[type.period.start])} – ${formatDanishDate(meta[type.period.end])}`,
    ]);
  }
  for (const f of type.metaFields) {
    if (!f.inHeader) continue;
    const v = meta[f.key];
    lines.push([f.label, f.kind === 'date' ? formatDanishDate(v) : v || '—']);
  }
  lines.push(['Version', String(h.version)]);
  return lines;
}

export function approvalLine(h: DocumentHeader): string {
  if (h.status === 'godkendt' || h.status === 'erstattet') {
    const who = h.approvedByName ?? 'personalet';
    return `Godkendt af ${who} ${formatDanishDateTime(h.approvedAt)}.`;
  }
  return h.status === 'til_godkendelse'
    ? 'Afventer godkendelse. Ikke et endeligt dokument.'
    : 'Kladde. Ikke et endeligt dokument.';
}

export function renderDocumentText(
  type: DocumentTypeDefinition,
  h: DocumentHeader,
  meta: DocumentMeta,
  sections: DocumentSections
): string {
  const lines = [type.title.toUpperCase(), ''];
  for (const [k, v] of headerLines(type, h, meta)) lines.push(`${k}: ${v}`);
  for (const s of type.sections) {
    lines.push('', s.title.toUpperCase(), (sections[s.key] ?? '').trim() || '—');
  }
  lines.push('', approvalLine(h));
  return lines.join('\n');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tekst → HTML: afsnit, punktopstillinger med "- " og markeringer i [firkantede parenteser]. */
export function textToHtml(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      const isList = lines.every((l) => /^\s*-\s+/.test(l));
      const fmt = (l: string) => esc(l).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>');
      if (isList) {
        return `<ul>${lines.map((l) => `<li>${fmt(l.replace(/^\s*-\s+/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${lines.map(fmt).join('<br/>')}</p>`;
    })
    .join('');
}

/** Tekst til en CSS-streng i <style>: ingen citationstegn, backslash, linjeskift eller tags. */
function cssString(s: string): string {
  return s.replace(/[\\"'<>\n\r]/g, '');
}

function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Selvstændigt HTML-dokument til print / "Gem som PDF" med logo, sidetal og godkendelse. */
export function renderDocumentHtml(
  type: DocumentTypeDefinition,
  h: DocumentHeader,
  meta: DocumentMeta,
  sections: DocumentSections
): string {
  const rows = headerLines(type, h, meta)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');
  const body = type.sections
    .map((s) => {
      const text = (sections[s.key] ?? '').trim();
      return `<section><h2>${esc(s.title)}</h2>${text ? textToHtml(text) : '<p class="empty">—</p>'}</section>`;
    })
    .join('');
  const final = h.status === 'godkendt' || h.status === 'erstattet';
  const banner = final ? '' : `<p class="draft">${esc(approvalLine(h))}</p>`;
  const logo = safeLogoUrl(h.orgLogoUrl);
  const footerLabel = `${type.title} · ${h.residentName} · version ${h.version}`;
  return `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"/>
<title>${esc(type.title)} – ${esc(h.residentName)}</title>
<style>
@page{size:A4;margin:22mm 20mm 24mm;
  @bottom-left{content:"${cssString(footerLabel)}";font:8pt system-ui,sans-serif;color:#888}
  @bottom-right{content:"Side " counter(page) " af " counter(pages);font:8pt system-ui,sans-serif;color:#888}}
body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.55;font-size:11.5pt;max-width:720px;margin:32px auto;padding:0 16px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 14px}
.top img{max-height:48px;max-width:180px;object-fit:contain}
.org{font-family:system-ui,sans-serif;font-size:9.5pt;color:#555;text-align:right}
h1{font-family:system-ui,-apple-system,sans-serif;font-size:18pt;font-weight:600;margin:0 0 4px;letter-spacing:-0.01em}
.sub{font-family:system-ui,sans-serif;color:#666;font-size:9.5pt;margin:0 0 18px}
table{border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:10pt;margin:0 0 22px}
th{text-align:left;font-weight:500;color:#555;width:150px;padding:5px 8px 5px 0;vertical-align:top;border-bottom:1px solid #eee}
td{padding:5px 0;border-bottom:1px solid #eee}
section{margin:0 0 18px;break-inside:auto}
h2{font-family:system-ui,-apple-system,sans-serif;font-size:12pt;font-weight:600;margin:0 0 6px;padding-top:6px;border-top:2px solid #1D9E75;break-after:avoid}
p{margin:0 0 8px}
ul{margin:0 0 8px;padding-left:20px}
mark{background:#fff3c4;padding:0 2px}
.empty{color:#999}
.draft{font-family:system-ui,sans-serif;color:#b45309;font-size:9.5pt;margin:0 0 12px;padding:6px 10px;border:1px solid #f3d29b;border-radius:6px;background:#fffaf0}
.approval{font-family:system-ui,sans-serif;font-size:10pt;margin-top:26px;padding-top:10px;border-top:1px solid #ddd}
.foot{font-family:system-ui,sans-serif;color:#888;font-size:8.5pt;margin-top:10px}
@media print{body{margin:0;max-width:none;padding:0}}
</style></head><body>
<div class="top"><div>${logo ? `<img src="${esc(logo)}" alt=""/>` : ''}</div><div class="org">${esc(h.orgName ?? '')}</div></div>
<h1>${esc(type.title)}</h1>
<p class="sub">${esc(type.printSubtitle)}</p>
${banner}
<table>${rows}</table>
${body}
<p class="approval">${esc(approvalLine(h))}</p>
<p class="foot">Udarbejdet i BUDR. Udkast er skrevet med AI ud fra botilbuddets egen dokumentation og gennemgået og godkendt af personalet.</p>
</body></html>`;
}
