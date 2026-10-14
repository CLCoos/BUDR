import { STATUS_REPORT_SECTIONS, type StatusReportSections } from './sections';

export type StatusReportHeader = {
  residentName: string;
  orgName: string | null;
  periodStart: string;
  periodEnd: string;
  meetingDate: string | null;
  paragraph: string | null;
  contactPerson: string | null;
  finished: boolean;
};

export function formatDanishDate(ymd: string | null): string {
  if (!ymd) return '—';
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function headerLines(h: StatusReportHeader): [string, string][] {
  return [
    ['Borger', h.residentName],
    ['Tilbud', [h.orgName, h.paragraph].filter(Boolean).join(', ') || '—'],
    ['Periode', `${formatDanishDate(h.periodStart)} – ${formatDanishDate(h.periodEnd)}`],
    ['Opfølgningsmøde', formatDanishDate(h.meetingDate)],
    ['Kontaktperson', h.contactPerson || '—'],
  ];
}

export function renderStatusReportText(
  h: StatusReportHeader,
  sections: StatusReportSections
): string {
  const lines = ['STATUSUDTALELSE', ''];
  for (const [k, v] of headerLines(h)) lines.push(`${k}: ${v}`);
  for (const s of STATUS_REPORT_SECTIONS) {
    lines.push('', s.title.toUpperCase(), (sections[s.key] ?? '').trim() || '—');
  }
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

/** Selvstændigt HTML-dokument til print / "Gem som PDF". */
export function renderStatusReportHtml(
  h: StatusReportHeader,
  sections: StatusReportSections
): string {
  const rows = headerLines(h)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');
  const body = STATUS_REPORT_SECTIONS.map((s) => {
    const text = (sections[s.key] ?? '').trim();
    return `<section><h2>${esc(s.title)}</h2>${text ? textToHtml(text) : '<p class="empty">—</p>'}</section>`;
  }).join('');
  const draft = h.finished ? '' : '<p class="draft">Kladde — ikke færdiggjort</p>';
  return `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8"/>
<title>Statusudtalelse – ${esc(h.residentName)}</title>
<style>
@page{size:A4;margin:22mm 20mm}
body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;line-height:1.55;font-size:11.5pt;max-width:720px;margin:32px auto;padding:0 16px}
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
.draft{font-family:system-ui,sans-serif;color:#b45309;font-size:9.5pt;margin:0 0 12px}
.foot{font-family:system-ui,sans-serif;color:#888;font-size:8.5pt;margin-top:28px}
@media print{body{margin:0;max-width:none;padding:0}}
</style></head><body>
<h1>Statusudtalelse</h1>
<p class="sub">Til brug ved opfølgning på indsatsen</p>
${draft}
<table>${rows}</table>
${body}
<p class="foot">Udarbejdet i BUDR. Udkast er skrevet med AI ud fra botilbuddets egen dokumentation og gennemgået af personalet.</p>
</body></html>`;
}
