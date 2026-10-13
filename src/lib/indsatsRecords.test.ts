import { describe, expect, it } from 'vitest';
import {
  INDSATS_TYPES,
  buildIndsatsInsertRow,
  canSaveIndsatsForm,
  escapeIndsatsHtml,
  isIndsatsType,
  paragraphForIndsatsType,
  parseIndsatsRecord,
  requiredIndsatsFieldsMissing,
} from './indsatsRecords';

const ORG = '550e8400-e29b-41d4-a716-446655440000';
const STAFF = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const validForm = {
  type: '§136_fastholdelse' as const,
  tidspunkt: '2026-08-27T14:30',
  varighed: '5 min',
  involverede_borgere: 'Sara K.',
  involverede_personale: 'LN',
  beskrivelse: 'Fastholdelse i fællesstue efter eskalering.',
  forudgaaende: 'Uro efter besøg',
  handling: 'To medarbejdere holdt arme',
  borgerens_reaktion: 'Faldt til ro efter 4 min',
  opfoelgning: 'Samtale i aften',
  underskrift: 'LN',
};

describe('indsatsRecords', () => {
  it('accepts the seven legal/clinical types used in the live form', () => {
    expect(INDSATS_TYPES).toHaveLength(7);
    expect(isIndsatsType('§136_fastholdelse')).toBe(true);
    expect(isIndsatsType('hændelse')).toBe(true);
    expect(isIndsatsType('not_a_type')).toBe(false);
  });

  it('maps coercive types to serviceloven paragraphs', () => {
    expect(paragraphForIndsatsType('§136_fastholdelse')).toBe('§136');
    expect(paragraphForIndsatsType('§141_beskyttelse')).toBe('§141');
    expect(paragraphForIndsatsType('observation')).toBe('');
  });

  it('refuses save when legally required fields are empty', () => {
    expect(canSaveIndsatsForm(validForm)).toBe(true);
    expect(
      requiredIndsatsFieldsMissing({ ...validForm, beskrivelse: '   ', underskrift: '' })
    ).toEqual(['beskrivelse', 'underskrift']);
  });

  it('builds an org-scoped insert payload from the form (not user_metadata)', () => {
    const row = buildIndsatsInsertRow(validForm, { orgId: ORG, createdBy: STAFF });
    expect(row.org_id).toBe(ORG);
    expect(row.created_by).toBe(STAFF);
    expect(row.type).toBe('§136_fastholdelse');
    expect(row.paragraph).toBe('§136');
    expect(row.beskrivelse).toBe(validForm.beskrivelse);
  });

  it('parses database rows and drops unknown types', () => {
    const ok = parseIndsatsRecord({
      id: '11111111-1111-4111-8111-111111111111',
      created_at: '2026-08-27T12:00:00.000Z',
      type: '§136_tilbageholdelse',
      paragraph: '§136',
      tidspunkt: '2026-08-27T22:10',
      involverede_borgere: 'Mikkel',
      beskrivelse: 'Tilbageholdelse ved udgang',
      underskrift: 'MR',
    });
    expect(ok?.type).toBe('§136_tilbageholdelse');
    expect(parseIndsatsRecord({ id: 'x', type: 'unknown' })).toBeNull();
  });
});

describe('escapeIndsatsHtml', () => {
  it('neutralises markup in user-entered fields', () => {
    expect(escapeIndsatsHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
    expect(escapeIndsatsHtml("Sara & Ole's")).toBe('Sara &amp; Ole&#39;s');
  });
});
