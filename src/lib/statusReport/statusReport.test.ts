import { describe, expect, it } from 'vitest';
import { buildSourceText, cleanSectionText, pseudonymize, thinEvenly } from './prompt';
import { renderStatusReportHtml, textToHtml } from './render';
import { sanitizeSections } from './sections';
import type { StatusReportSources } from './types';

const baseSources: StatusReportSources = {
  periodStart: '2026-04-01',
  periodEnd: '2026-09-30',
  residentNames: ['Anna', 'Jensen', 'Anna J.'],
  vum: {
    casePurpose: 'Anna skal blive mere selvhjulpen i egen bolig.',
    referralSource: null,
    themes: [
      {
        number: 5,
        title: 'Praktiske opgaver',
        categoryLabel: 'Aktivitet og deltagelse',
        level: 2,
        notes: 'Handler ind med støtte en gang om ugen.',
        answers: [],
      },
    ],
    goals: [
      { id: 'g1', title: 'Lave mad selv to gange om ugen', theme_numbers: [5], status: 'aktiv' },
    ],
  },
  nextSteps: [],
  journal: [
    { date: '2026-05-02', category: 'Døgnnotat', text: 'Anna lavede pasta med Jensen-familien.' },
  ],
  checkins: [
    { date: '2026-04-03', mood: 4, trafficLight: 'gul', text: 'Jeg er træt' },
    { date: '2026-04-20', mood: 6, trafficLight: 'grøn', text: null },
    { date: '2026-05-10', mood: 8, trafficLight: 'grøn', text: 'God dag, Anna er glad' },
  ],
  concerns: [],
  crises: [],
  medications: [],
};

describe('pseudonymize', () => {
  it('erstatter navne som hele ord, også med store/små bogstaver', () => {
    expect(pseudonymize('anna og ANNA. Annas bog. Hannah', ['Anna'])).toBe(
      'Borgeren og Borgeren. Annas bog. Hannah'
    );
  });
  it('erstatter længste navn først', () => {
    expect(pseudonymize('Anna J. kom', ['Anna', 'Anna J.'])).toBe('Borgeren kom');
  });
});

describe('buildSourceText', () => {
  const text = buildSourceText(baseSources);
  it('indeholder ikke borgerens navn', () => {
    expect(text).not.toMatch(/Anna|Jensen/);
  });
  it('har VUM-niveau, mål og månedsgennemsnit', () => {
    expect(text).toContain('Praktiske opgaver');
    expect(text).toContain('Moderate problemer');
    expect(text).toContain('Lave mad selv to gange om ugen');
    expect(text).toContain('2026-04: gennemsnit 5 (2 check-ins)');
    expect(text).toContain('2026-05: gennemsnit 8 (1 check-ins)');
  });
});

describe('thinEvenly', () => {
  it('beholder alt under budget og tynder jævnt ud over budget', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    expect(thinEvenly(items, () => 1, 200)).toHaveLength(100);
    const thinned = thinEvenly(items, () => 1, 10);
    expect(thinned).toHaveLength(10);
    expect(thinned[0]).toBe(0);
    expect(thinned[9]).toBeGreaterThan(80);
  });
});

describe('cleanSectionText', () => {
  it('fjerner gentaget overskrift og markdown', () => {
    expect(cleanSectionText('## Indsatsformål\n\n**Mål:** x\n* punkt', 'Indsatsformål')).toBe(
      'Mål: x\n- punkt'
    );
  });
});

describe('sanitizeSections', () => {
  it('beholder kun kendte afsnit med tekst', () => {
    expect(sanitizeSections({ maal: 'a', hack: 'b', anbefalinger: 3 })).toEqual({ maal: 'a' });
    expect(sanitizeSections(null)).toEqual({});
    expect(sanitizeSections(['x'])).toEqual({});
  });
});

describe('render', () => {
  it('escaper HTML og fremhæver markeringer', () => {
    expect(textToHtml('<b>hej</b> [Udfyldes]')).toBe(
      '<p>&lt;b&gt;hej&lt;/b&gt; <mark>[Udfyldes]</mark></p>'
    );
    expect(textToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
  });
  it('viser kladde-mærkat indtil udtalelsen er færdig', () => {
    const h = {
      residentName: 'Anna <J>',
      orgName: 'Bostedet',
      periodStart: '2026-04-01',
      periodEnd: '2026-09-30',
      meetingDate: null,
      paragraph: '§108',
      contactPerson: null,
      finished: false,
    };
    const html = renderStatusReportHtml(h, { maal: 'x' });
    expect(html).toContain('Kladde');
    expect(html).toContain('Anna &lt;J&gt;');
    expect(renderStatusReportHtml({ ...h, finished: true }, {})).not.toContain('Kladde —');
  });
});
