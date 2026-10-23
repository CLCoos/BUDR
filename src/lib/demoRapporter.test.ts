import { describe, expect, it } from 'vitest';
import { buildDemoIndsatsRecords, isMagtanvendelse } from './indsatsRecords';
import { getDemoOverrapportResidents } from './overrapport/demoResidentSummaries';
import { composeStructuredOverrapport } from './overrapport/composeStructuredReport';
import { getDemoTilsynsResidents } from './tilsynsrapport/demoResidents';
import { composeStructuredTilsynsrapport } from './tilsynsrapport/composeStructuredTilsynsrapport';
import { getForloeb } from '@/app/care-portal-demo/residents/[residentId]/forloebData';

const FULL_NAMES = /Sara|Camilla|Mikkel|Anders|Jonas F|Mette|Thomas/;

describe('demo-rapporter', () => {
  it('bruger kun initialer for demoens borgere', () => {
    for (const r of getDemoOverrapportResidents()) {
      expect(r.name).toMatch(/^[A-ZÆØÅ]{2}$/);
      expect(r.name).toBe(r.initials);
    }
  });

  it('har samme trafiklys som forløbssiderne', () => {
    const byInit = new Map(getDemoOverrapportResidents().map((r) => [r.initials, r.trafficLight]));
    const norm = (t: string) => (t === 'groen' ? 'grøn' : t === 'roed' ? 'rød' : t);
    for (const id of ['res-sara', 'res-camilla', 'res-mikkel', 'res-anders']) {
      const p = getForloeb(id)!;
      expect(byInit.get(p.initials)).toBe(norm(p.today.traffic));
    }
  });

  it('demoens indsatsnotater har ingen magtanvendelser og ingen fulde navne', () => {
    const recs = buildDemoIndsatsRecords(new Date('2026-10-23T10:00:00'));
    expect(recs).toHaveLength(3);
    expect(recs.filter(isMagtanvendelse)).toHaveLength(0);
    expect(recs.map((r) => r.involverede_borgere).sort()).toEqual(['CB', 'MT', 'SK']);
    expect(JSON.stringify(recs)).not.toMatch(FULL_NAMES);
    expect(recs.find((r) => r.involverede_borgere === 'SK')?.tidspunkt).toBe('2026-10-15T02:14');
  });

  it('tilsynsrapport siger ingen magtanvendelser og lister tre notater', () => {
    const recs = buildDemoIndsatsRecords(new Date('2026-10-23T10:00:00'));
    const text = composeStructuredTilsynsrapport(getDemoTilsynsResidents(), recs, {
      dateStr: '23. oktober 2026',
      facilityName: 'Bosted Solhaven (DEMO)',
    });
    expect(text).toContain('Ingen magtanvendelser i perioden.');
    expect(text).toContain('I alt 3 indsatsnotater');
    expect(text).toContain('3 grøn, 3 gul, 0 rød');
    expect(text).not.toMatch(FULL_NAMES);
    expect(text).not.toContain('§');
  });

  it('overrapport nævner MT’s medicin og ingen fulde navne', () => {
    const text = composeStructuredOverrapport(getDemoOverrapportResidents(), {
      dateStr: 'fredag 23. oktober',
      timeStr: '14.00',
    });
    expect(text).toContain('Morgendosis kl. 08 er ikke registreret');
    expect(text).not.toMatch(FULL_NAMES);
    expect(text).not.toContain('…');
  });

  it('viser kun initialer, når en rigtig registrering har fulde navne', () => {
    const text = composeStructuredTilsynsrapport(
      [],
      [
        {
          paragraph: '',
          tidspunkt: '2026-10-20T10:00',
          type: 'observation',
          beskrivelse: 'Test',
          involverede_borgere: 'Sara Kristensen og Mikkel T.',
        },
      ],
      { dateStr: 'x', facilityName: 'y' }
    );
    expect(text).toContain('Observationsnotat, SK, MT');
  });
});
