import { describe, expect, it } from 'vitest';
import { extractCitations, sanitizeSectionSources } from './citations';
import { dueLabel, dueState } from './deadlines';
import {
  DOCUMENT_TYPES,
  availableDocumentTypes,
  incompleteSections,
  sanitizeMeta,
  sanitizeSections,
  validatePeriod,
} from './registry';
import { renderDocumentHtml, renderDocumentText, textToHtml } from './render';
import type { SourceRef } from './types';

const status = DOCUMENT_TYPES.statusrapport;

describe('registry', () => {
  it('har alle elleve typer og kun færdige er tilgængelige', () => {
    expect(Object.keys(DOCUMENT_TYPES)).toHaveLength(11);
    expect(availableDocumentTypes().map((t) => t.key)).toEqual(['statusrapport']);
  });

  it('sanitizeSections beholder kun kendte afsnit med tekst', () => {
    expect(sanitizeSections(status, { maal: 'a', hack: 'b', anbefalinger: 3 })).toEqual({
      maal: 'a',
    });
    expect(sanitizeSections(status, null)).toEqual({});
    expect(sanitizeSections(status, ['x'])).toEqual({});
  });

  it('sanitizeMeta kræver obligatoriske felter og validerer typer', () => {
    expect(sanitizeMeta(status, { period_start: '2026-04-01' })).toEqual({
      ok: false,
      error: 'Periode til mangler',
    });
    expect(
      sanitizeMeta(status, {
        period_start: '2026-04-01',
        period_end: '2026-09-30',
        paragraph: '§999',
      })
    ).toEqual({ ok: false, error: 'Ugyldig værdi i Paragraf' });
    expect(
      sanitizeMeta(status, {
        period_start: '2026-04-01',
        period_end: '2026-02-30',
      })
    ).toEqual({ ok: false, error: 'Ugyldig dato i Periode til' });
    const ok = sanitizeMeta(status, {
      period_start: '2026-04-01',
      period_end: '2026-09-30',
      contact_person: '  Mette  ',
      hack: 'x',
    });
    expect(ok).toEqual({
      ok: true,
      meta: { period_start: '2026-04-01', period_end: '2026-09-30', contact_person: 'Mette' },
    });
  });

  it('partial meta accepterer enkelte felter og tom tekst som null', () => {
    expect(sanitizeMeta(status, { contact_person: '' }, true)).toEqual({
      ok: true,
      meta: { contact_person: null },
    });
  });

  it('validatePeriod fanger omvendt periode', () => {
    expect(validatePeriod(status, { period_start: '2026-05-01', period_end: '2026-04-01' })).toBe(
      'Perioden slutter før den starter'
    );
    expect(validatePeriod(status, { period_start: '2026-04-01', period_end: '2026-05-01' })).toBe(
      null
    );
  });

  it('standardfrist er fem dage før mødet', () => {
    expect(status.defaultDueDate?.({ meeting_date: '2026-11-10' })).toBe('2026-11-05');
    expect(status.defaultDueDate?.({})).toBe(null);
  });

  it('incompleteSections finder tomme afsnit og markeringer', () => {
    const all = Object.fromEntries(status.sections.map((s) => [s.key, 'tekst']));
    expect(incompleteSections(status, all)).toEqual({ missing: [], placeholders: [] });
    const res = incompleteSections(status, {
      ...all,
      maal: '',
      borgerens_vurdering: 'Godt. [Gennemgås med borgeren før afsendelse]',
      anbefalinger: '[Udfyldes af personalet: mål]',
    });
    expect(res.missing).toEqual(['Status på indsatsmål og delmål']);
    expect(res.placeholders).toEqual([
      'Borgerens egen vurdering',
      'Anbefalinger til fremtidig indsats',
    ]);
  });
});

describe('citations', () => {
  const refs = new Map<string, SourceRef>([
    ['J1', { ref: 'J1', kind: 'journal', date: '2026-05-02', label: 'Døgnnotat', excerpt: 'a' }],
    ['C3', { ref: 'C3', kind: 'checkin', date: '2026-04-03', label: 'Check-in', excerpt: 'b' }],
  ]);

  it('fjerner henvisninger og samler kendte kilder i rækkefølge', () => {
    const res = extractCitations(
      'Borgeren laver mad. [[J1]] Humøret steg [[C3, J1, X9]].\n- Punkt [[C3]]',
      refs
    );
    expect(res.text).toBe('Borgeren laver mad. Humøret steg.\n- Punkt');
    expect(res.sources.map((s) => s.ref)).toEqual(['J1', 'C3']);
  });

  it('rører ikke markeringer i enkelte klammer', () => {
    expect(extractCitations('[Udfyldes af personalet: x]', refs).text).toBe(
      '[Udfyldes af personalet: x]'
    );
  });

  it('sanitizeSectionSources afviser ukendte afsnit, typer og koder', () => {
    const clean = sanitizeSectionSources(['maal'], {
      maal: [
        { ref: 'J1', kind: 'journal', date: '2026-05-02', label: 'x', excerpt: 'y' },
        { ref: 'bad', kind: 'journal' },
        { ref: 'J2', kind: 'hack' },
        { ref: 'J3', kind: 'krise', date: 'i går' },
      ],
      hack: [{ ref: 'J1', kind: 'journal' }],
    });
    expect(Object.keys(clean)).toEqual(['maal']);
    expect(clean.maal.map((s) => s.ref)).toEqual(['J1', 'J3']);
    expect(clean.maal[1].date).toBe(null);
  });
});

describe('deadlines', () => {
  it('beregner tilstand og tekst', () => {
    expect(dueState(null, '2026-10-15')).toBe(null);
    expect(dueState('2026-10-14', '2026-10-15')).toBe('overskredet');
    expect(dueState('2026-10-15', '2026-10-15')).toBe('i_dag');
    expect(dueState('2026-10-20', '2026-10-15')).toBe('snart');
    expect(dueState('2026-11-20', '2026-10-15')).toBe('senere');
    expect(dueLabel('2026-10-12', '2026-10-15')).toBe('Frist overskredet med 3 dage');
    expect(dueLabel('2026-10-16', '2026-10-15')).toBe('Frist i morgen');
    expect(dueLabel('2026-10-20', '2026-10-15')).toBe('Frist om 5 dage');
  });
});

describe('render', () => {
  const header = {
    residentName: 'Anna <J>',
    orgName: 'Bostedet',
    orgLogoUrl: 'javascript:alert(1)',
    status: 'kladde' as const,
    version: 1,
    approvedByName: null,
    approvedAt: null,
  };
  const meta = { period_start: '2026-04-01', period_end: '2026-09-30', paragraph: '§108' };

  it('escaper HTML og fremhæver markeringer', () => {
    expect(textToHtml('<b>hej</b> [Udfyldes]')).toBe(
      '<p>&lt;b&gt;hej&lt;/b&gt; <mark>[Udfyldes]</mark></p>'
    );
    expect(textToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('viser kladde-banner, escaper navn og afviser usikre logo-links', () => {
    const html = renderDocumentHtml(status, header, meta, { maal: 'x' });
    expect(html).toContain('Kladde. Ikke et endeligt dokument.');
    expect(html).toContain('Anna &lt;J&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('counter(pages)');
  });

  it('viser godkendelse på et godkendt dokument', () => {
    const html = renderDocumentHtml(
      status,
      {
        ...header,
        orgLogoUrl: 'https://example.com/logo.png',
        status: 'godkendt',
        approvedByName: 'Mette Leder',
        approvedAt: '2026-10-15T08:00:00Z',
      },
      meta,
      {}
    );
    expect(html).toContain('Godkendt af Mette Leder');
    expect(html).toContain('<img src="https://example.com/logo.png"');
    expect(html).not.toContain('class="draft"');
  });

  it('tekstudgave har overskrifter og godkendelseslinje', () => {
    const text = renderDocumentText(status, header, meta, { maal: 'Mål: lave mad' });
    expect(text).toContain('STATUSRAPPORT');
    expect(text).toContain('Tilbud: Bostedet, §108');
    expect(text).toContain('Mål: lave mad');
    expect(text).toContain('Kladde. Ikke et endeligt dokument.');
  });
});
