/**
 * Deler auto-overrapport op til visning: overskriftslinje, nummererede sektioner, fodnote (— …).
 */

export type OverrapportParsedSection = {
  index: string;
  title: string;
  body: string;
};

export type ParsedOverrapportDocument = {
  headline: string | null;
  sections: OverrapportParsedSection[];
  footnote: string | null;
};

export function parseOverrapportDocument(raw: string): ParsedOverrapportDocument {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return { headline: null, sections: [], footnote: null };

  const lines = text.split('\n');
  let headline: string | null = null;
  const first = lines[0]?.trim() ?? '';
  if (/^(vagtskifterapport|tilsynsrapport)\b/i.test(first)) {
    headline = first;
    lines.shift();
    if (lines[0] === '') lines.shift();
  }

  const sections: OverrapportParsedSection[] = [];
  let current: OverrapportParsedSection | null = null;
  let footnote: string | null = null;
  const headerRe = /^(\d+)\.\s+(.+)$/;

  const flush = () => {
    if (current) {
      current.body = current.body.replace(/\n{3,}/g, '\n\n').trim();
      sections.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(—|–)\s/.test(trimmed)) {
      flush();
      footnote = trimmed;
      continue;
    }
    const m = line.match(headerRe);
    if (m) {
      flush();
      current = { index: m[1], title: m[2].trim(), body: '' };
      continue;
    }
    if (current) current.body += (current.body ? '\n' : '') + line;
  }
  flush();

  return { headline, sections, footnote };
}
