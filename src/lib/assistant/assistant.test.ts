import { describe, expect, it } from 'vitest';
import { describeAction, sanitizeActions, shiftYmd } from './actions';
import { copenhagenLocalToDate } from './apply';
import {
  appointmentFollowUps,
  documentDeadlines,
  fagsystemReminders,
  isHealthAppointment,
  trafficLightStreaks,
  type GeneratorResident,
} from './generators';
import { buildIntakeMessage, parseIntakeResponse } from './intake';
import { findResidentsInText, replaceNames, restoreName } from './names';

const ORG = '00000000-0000-4000-8000-000000000001';
const LARS: GeneratorResident = {
  user_id: '10000000-0000-4000-8000-000000000001',
  org_id: ORG,
  first_name: 'Lars',
  last_name: 'Hansen',
  display_name: 'Lars Hansen',
  nickname: null,
};
const MIA: GeneratorResident = {
  user_id: '10000000-0000-4000-8000-000000000002',
  org_id: ORG,
  first_name: 'Mia',
  last_name: 'Holm',
  display_name: 'Mia Holm',
  nickname: 'Mimi',
};
const STAFF = '20000000-0000-4000-8000-000000000001';

describe('sanitizeActions', () => {
  const today = '2026-10-15';
  it('beholder gyldige handlinger og fjerner ukendte', () => {
    const out = sanitizeActions(
      [
        { type: 'journal_note', category: 'Sundhed', text: ' Ny creme. ' },
        { type: 'delete_everything' },
        { type: 'task', title: 'Ring til lægen', deadline: '2026-10-22' },
        {
          type: 'calendar',
          title: 'Kontrol',
          category: 'laege',
          date: '2026-10-29',
          time: '09:45',
        },
        { type: 'medication_request', text: 'Ny creme udskrevet' },
      ],
      today
    );
    expect(out.map((a) => a.type)).toEqual([
      'journal_note',
      'task',
      'calendar',
      'medication_request',
    ]);
    expect(out[0]).toMatchObject({ text: 'Ny creme.' });
    expect(new Set(out.map((a) => a.id)).size).toBe(4);
  });

  it('afviser kalenderaftaler uden tid og datoer langt ude', () => {
    expect(
      sanitizeActions(
        [
          { type: 'calendar', title: 'X', category: 'laege', date: '2026-10-20', time: '' },
          { type: 'calendar', title: 'Y', category: 'laege', date: '2030-01-01', time: '10:00' },
        ],
        today
      )
    ).toEqual([]);
  });

  it('retter ugyldig kategori og frist', () => {
    const [note, task] = sanitizeActions(
      [
        { type: 'journal_note', category: 'Hemmelig', text: 'Tekst' },
        { type: 'task', title: 'Opgave', deadline: 'i morgen' },
      ],
      today
    );
    expect(note).toMatchObject({ category: 'Døgnnotat' });
    expect(task).toMatchObject({ deadline: today });
  });

  it('højst 8 handlinger', () => {
    const many = Array.from({ length: 20 }, () => ({ type: 'task', title: 'x', deadline: today }));
    expect(sanitizeActions(many, today)).toHaveLength(8);
  });

  it('describeAction og shiftYmd', () => {
    expect(shiftYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(
      describeAction({
        id: 'a',
        type: 'calendar',
        title: 'Læge',
        category: 'laege',
        date: '2026-10-20',
        time: '09:45',
        location: '',
      })
    ).toBe('Læge 20. oktober 2026 kl. 09.45');
  });
});

describe('navne', () => {
  it('finder borger ud fra fuldt navn, fornavn eller kaldenavn', () => {
    expect(findResidentsInText('Lars Hansen var hos lægen', [LARS, MIA])).toEqual([LARS]);
    expect(findResidentsInText('lars fik creme', [LARS, MIA])).toEqual([LARS]);
    expect(findResidentsInText('Mimi var glad', [LARS, MIA])).toEqual([MIA]);
    expect(findResidentsInText('Larsen kom forbi', [LARS, MIA])).toEqual([]);
    expect(findResidentsInText('Lars og Mia spiste', [LARS, MIA])).toHaveLength(2);
  });

  it('erstatter og genindsætter navne', () => {
    expect(replaceNames('Lars Hansen og Lars', ['Lars Hansen', 'Lars'], 'Borgeren')).toBe(
      'Borgeren og Borgeren'
    );
    expect(restoreName('Borgeren tog Borgerens medicin.', 'Lars')).toBe("Lars tog Lars' medicin.");
    expect(restoreName('Borgerens dag', 'Mia')).toBe('Mias dag');
  });
});

describe('intake', () => {
  it('bygger besked med ugedag', () => {
    expect(buildIntakeMessage('Tekst', '2026-10-15')).toContain('torsdag 2026-10-15');
  });

  it('læser JSON, også i kodeblok, og afviser vrøvl', () => {
    const raw =
      '```json\n{"summary":"Notat og opgave","actions":[{"type":"task","title":"Følg op","deadline":"2026-10-22"}]}\n```';
    expect(parseIntakeResponse(raw, '2026-10-15')).toMatchObject({
      summary: 'Notat og opgave',
      actions: [{ type: 'task', title: 'Følg op' }],
    });
    expect(parseIntakeResponse('ikke json', '2026-10-15')).toBeNull();
  });
});

describe('copenhagenLocalToDate', () => {
  it('håndterer sommer- og vintertid', () => {
    expect(copenhagenLocalToDate('2026-07-01', '09:45').toISOString()).toBe(
      '2026-07-01T07:45:00.000Z'
    );
    expect(copenhagenLocalToDate('2026-12-01', '09:45').toISOString()).toBe(
      '2026-12-01T08:45:00.000Z'
    );
  });
});

describe('appointmentFollowUps', () => {
  const now = new Date('2026-10-15T10:30:00Z'); // 12.30 dansk tid
  const planner = [
    {
      id: 'p1',
      org_id: ORG,
      resident_user_id: LARS.user_id,
      title: 'Lægetid',
      category: 'laege',
      starts_at: '2026-10-15T07:45:00Z',
      ends_at: '2026-10-15T08:45:00Z',
      location: 'Lægehuset',
    },
    {
      id: 'p2',
      org_id: ORG,
      resident_user_id: MIA.user_id,
      title: 'Bowling',
      category: 'aktivitet',
      starts_at: '2026-10-15T07:00:00Z',
      ends_at: '2026-10-15T08:00:00Z',
      location: null,
    },
  ];

  it('foreslår et sundhedsnotat til kontaktpersonen efter en lægeaftale', () => {
    const out = appointmentFollowUps({
      now,
      residents: [LARS, MIA],
      contacts: [{ resident_id: LARS.user_id, staff_id: STAFF }],
      planner,
      journal: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'aftale_opfoelgning',
      recipient_id: STAFF,
      audience: 'personlig',
      dedupe_key: `planner:p1:${STAFF}`,
    });
    expect(out[0]!.title).toBe(
      'Lars havde lægetid i dag kl. 09.45. Skal jeg skrive det i sundhedsjournalen?'
    );
    expect(out[0]!.actions[0]).toMatchObject({ type: 'journal_note', category: 'Sundhed' });
  });

  it('går til alle uden kontaktperson, og springer over når der allerede er skrevet', () => {
    const noContact = appointmentFollowUps({
      now,
      residents: [LARS],
      contacts: [],
      planner,
      journal: [],
    });
    expect(noContact[0]).toMatchObject({ audience: 'alle', recipient_id: null });
    const documented = appointmentFollowUps({
      now,
      residents: [LARS],
      contacts: [],
      planner,
      journal: [
        { resident_id: LARS.user_id, category: 'Sundhed', created_at: '2026-10-15T09:00:00Z' },
      ],
    });
    expect(documented).toEqual([]);
  });

  it('venter til aftalen er slut', () => {
    const early = appointmentFollowUps({
      now: new Date('2026-10-15T08:00:00Z'),
      residents: [LARS],
      contacts: [],
      planner,
      journal: [],
    });
    expect(early).toEqual([]);
  });

  it('genkender sundhedsaftaler ud fra titlen', () => {
    expect(isHealthAppointment({ category: 'andet', title: 'Tandlæge' })).toBe(true);
    expect(isHealthAppointment({ category: 'andet', title: 'EKG på sygehuset' })).toBe(true);
    expect(isHealthAppointment({ category: 'aktivitet', title: 'Bowling' })).toBe(false);
  });
});

describe('documentDeadlines', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  const base = {
    org_id: ORG,
    resident_id: LARS.user_id,
    doc_type: 'statusrapport',
    title: null,
    responsible_id: STAFF,
  };

  it('minder den ansvarlige om en frist inden for en uge', () => {
    const out = documentDeadlines({
      now,
      residents: [LARS],
      documents: [
        { ...base, id: 'd1', status: 'kladde', due_date: '2026-10-20' },
        { ...base, id: 'd2', status: 'kladde', due_date: '2026-11-30' },
        { ...base, id: 'd3', status: 'godkendt', due_date: '2026-10-16' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      recipient_id: STAFF,
      audience: 'personlig',
      link: `/resident-360-view/${LARS.user_id}?tab=dokumenter&doc=d1`,
    });
  });

  it('sender til ledere når dokumentet venter på godkendelse eller mangler ansvarlig', () => {
    const out = documentDeadlines({
      now,
      residents: [LARS],
      documents: [
        { ...base, id: 'd1', status: 'til_godkendelse', due_date: '2026-10-15' },
        { ...base, id: 'd2', status: 'kladde', due_date: '2026-10-10', responsible_id: null },
      ],
    });
    expect(out.map((o) => o.audience)).toEqual(['ledere', 'ledere']);
    expect(out[0]!.title).toContain('venter på godkendelse');
    expect(out[1]!.title).toContain('over fristen');
  });
});

describe('trafficLightStreaks', () => {
  const now = new Date('2026-10-15T10:00:00Z');
  const checkin = (day: string, light: string) => ({
    resident_id: LARS.user_id,
    created_at: `${day}T08:00:00Z`,
    traffic_light: light,
  });

  it('foreslår en snak efter tre dage gul/rød', () => {
    const out = trafficLightStreaks({
      now,
      residents: [LARS],
      contacts: [],
      checkins: [
        checkin('2026-10-13', 'gul'),
        checkin('2026-10-14', 'rød'),
        checkin('2026-10-15', 'gul'),
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'trafiklys',
      dedupe_key: `trafik:${LARS.user_id}:2026-10-13:alle`,
    });
    expect(out[0]!.actions[0]).toMatchObject({ type: 'task', deadline: '2026-10-15' });
  });

  it('ingen forslag når en dag var grøn eller mangler', () => {
    expect(
      trafficLightStreaks({
        now,
        residents: [LARS],
        contacts: [],
        checkins: [
          checkin('2026-10-13', 'gul'),
          checkin('2026-10-14', 'grøn'),
          checkin('2026-10-15', 'rød'),
        ],
      })
    ).toEqual([]);
    expect(
      trafficLightStreaks({
        now,
        residents: [LARS],
        contacts: [],
        checkins: [
          checkin('2026-10-12', 'gul'),
          checkin('2026-10-13', 'rød'),
          checkin('2026-10-15', 'rød'),
        ],
      })
    ).toEqual([]);
  });
});

describe('fagsystemReminders', () => {
  const now = new Date('2026-10-15T08:00:00Z'); // 10.00 dansk tid
  const notes = [
    { id: 'a', org_id: ORG, staff_id: STAFF, created_at: '2026-10-14T10:00:00Z' },
    { id: 'b', org_id: ORG, staff_id: STAFF, created_at: '2026-10-13T10:00:00Z' },
    { id: 'c', org_id: ORG, staff_id: STAFF, created_at: '2026-10-15T07:00:00Z' },
    { id: 'd', org_id: ORG, staff_id: STAFF, created_at: '2026-10-12T10:00:00Z' },
    { id: 'e', org_id: 'andet-bosted', staff_id: STAFF, created_at: '2026-10-14T10:00:00Z' },
  ];

  it('tæller ikke-overførte notater fra tidligere dage i bosteder der bruger det', () => {
    const out = fagsystemReminders({
      now,
      notes,
      transferredIds: new Set(['d']),
      activeOrgs: new Set([ORG]),
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      recipient_id: STAFF,
      kind: 'fagsystem',
      dedupe_key: `fagsystem:${STAFF}:2026-10-15`,
      link: '/care-portal-fagsystem?mine=1',
    });
    expect(out[0]!.title).toContain('2 notater');
  });

  it('intet før kl. 7 eller når alt er overført', () => {
    expect(
      fagsystemReminders({
        now: new Date('2026-10-15T03:00:00Z'),
        notes,
        transferredIds: new Set(),
        activeOrgs: new Set([ORG]),
      })
    ).toEqual([]);
    expect(
      fagsystemReminders({
        now,
        notes,
        transferredIds: new Set(['a', 'b', 'd']),
        activeOrgs: new Set([ORG]),
      })
    ).toEqual([]);
  });
});
