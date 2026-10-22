import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIVATE_TEXT_PLACEHOLDER, checkResidentText, kriseordIRisiko } from './residentTextSafety';
import type { SafetyClassification } from './safetyClassifier';

function fakeSupabase(errors: Array<{ message: string } | null> = [null]) {
  const inserts: Record<string, unknown>[] = [];
  const supabase = {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push(row);
        return { error: errors.shift() ?? null };
      },
    }),
  } as unknown as SupabaseClient;
  return { supabase, inserts };
}

const elevated: SafetyClassification = {
  risk_level: 'elevated',
  category: 'suicidalitet',
  reasoning: 'svære tanker',
};

describe('checkResidentText', () => {
  it('opretter ingen hændelse, når der ikke er risiko', async () => {
    const { supabase, inserts } = fakeSupabase();
    const res = await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: 'o1',
      text: 'God dag i haven',
      source: 'tjek_ind',
      classify: async () => ({ risk_level: 'none', category: 'none', reasoning: '' }),
    });
    expect(res.risk_level).toBe('none');
    expect(inserts).toHaveLength(0);
  });

  it('gemmer kilde og tekst ved risiko', async () => {
    const { supabase, inserts } = fakeSupabase();
    const res = await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: 'o1',
      text: 'Jeg orker ikke mere',
      source: 'tjek_ind',
      classify: async () => elevated,
    });
    expect(res).toEqual({ risk_level: 'elevated', category: 'suicidalitet' });
    expect(inserts[0]).toMatchObject({
      source: 'tjek_ind',
      user_utterance: 'Jeg orker ikke mere',
      organisation_id: 'o1',
    });
  });

  it('skjuler teksten fra en privat dagbog', async () => {
    const { supabase, inserts } = fakeSupabase();
    await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: 'o1',
      text: 'Hemmelig tekst',
      source: 'privat_dagbog',
      classify: async () => elevated,
    });
    expect(inserts[0].user_utterance).toBe(PRIVATE_TEXT_PLACEHOLDER);
    expect(inserts[0].reasoning).toBeNull();
    expect(JSON.stringify(inserts[0])).not.toContain('Hemmelig');
  });

  it('gemmer uden kilde, hvis kolonnen mangler', async () => {
    const { supabase, inserts } = fakeSupabase([
      { message: 'column "source" does not exist' },
      null,
    ]);
    await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: null,
      text: 'Jeg orker ikke mere',
      source: 'dagbog',
      classify: async () => elevated,
    });
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).not.toHaveProperty('source');
  });

  it('springer tom tekst over uden at klassificere', async () => {
    const classify = vi.fn();
    const { supabase } = fakeSupabase();
    const res = await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: null,
      text: '   ',
      source: 'dagbog',
      classify,
    });
    expect(res.risk_level).toBe('none');
    expect(classify).not.toHaveBeenCalled();
  });
});

describe('alertStaffFrom', () => {
  it('giver borgeren svar, men opretter ingen hændelse under grænsen', async () => {
    const { supabase, inserts } = fakeSupabase();
    const res = await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: null,
      text: 'Jeg har det sort indeni',
      source: 'privat_dagbog',
      alertStaffFrom: 'acute',
      classify: async () => elevated,
    });
    expect(res.risk_level).toBe('elevated');
    expect(inserts).toHaveLength(0);
  });

  it('opretter hændelse ved akut, når grænsen er akut', async () => {
    const { supabase, inserts } = fakeSupabase();
    await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: null,
      text: 'Jeg har pillerne klar',
      source: 'privat_dagbog',
      alertStaffFrom: 'acute',
      classify: async () => ({ ...elevated, risk_level: 'acute' }),
    });
    expect(inserts).toHaveLength(1);
  });

  it('opretter aldrig hændelse med never', async () => {
    const { supabase, inserts } = fakeSupabase();
    await checkResidentText({
      supabase,
      residentId: 'r1',
      orgId: null,
      text: 'Jeg har pillerne klar',
      source: 'privat_dagbog',
      alertStaffFrom: 'never',
      classify: async () => ({ ...elevated, risk_level: 'acute' }),
    });
    expect(inserts).toHaveLength(0);
  });
});

describe('kriseordIRisiko', () => {
  it('finder tydelige kriseord', () => {
    expect(kriseordIRisiko('Jeg vil bare sove for evigt').risk_level).toBe('elevated');
    expect(kriseordIRisiko('jeg orker ikke mere').risk_level).toBe('elevated');
  });

  it('lader almindelige tekster være', () => {
    expect(kriseordIRisiko('Træt i dag, men det går').risk_level).toBe('none');
    expect(kriseordIRisiko('Planterne skal ikke dø i varmen').risk_level).toBe('none');
  });
});
