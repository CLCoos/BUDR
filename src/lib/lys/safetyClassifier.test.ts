import { describe, expect, it } from 'vitest';
import {
  FALLBACK_CLASSIFICATION,
  normalizeCategory,
  normalizeReasoning,
  normalizeRiskLevel,
  parseModelJson,
} from './safetyClassifier';

describe('normalizeRiskLevel', () => {
  it('preserves known levels', () => {
    expect(normalizeRiskLevel('none')).toBe('none');
    expect(normalizeRiskLevel('elevated')).toBe('elevated');
    expect(normalizeRiskLevel('acute')).toBe('acute');
  });

  it('defaults invalid values to elevated', () => {
    expect(normalizeRiskLevel('high')).toBe('elevated');
    expect(normalizeRiskLevel(null)).toBe('elevated');
    expect(normalizeRiskLevel(undefined)).toBe('elevated');
  });
});

describe('normalizeCategory', () => {
  it('preserves allowed categories', () => {
    expect(normalizeCategory('selvskade')).toBe('selvskade');
    expect(normalizeCategory('none')).toBe('none');
  });

  it('maps unknown categories to other', () => {
    expect(normalizeCategory('ukendt')).toBe('other');
    expect(normalizeCategory('')).toBe('other');
  });
});

describe('normalizeReasoning', () => {
  it('truncates long text to 300 characters', () => {
    const long = 'a'.repeat(400);
    expect(normalizeReasoning(long).length).toBe(300);
  });

  it('uses fallback reasoning when empty', () => {
    expect(normalizeReasoning('')).toBe(FALLBACK_CLASSIFICATION.reasoning);
    expect(normalizeReasoning(null)).toBe(FALLBACK_CLASSIFICATION.reasoning);
  });
});

describe('parseModelJson', () => {
  it('parses clean JSON', () => {
    const result = parseModelJson(
      '{"risk_level":"acute","category":"selvskade","reasoning":"Konkret plan nævnt."}'
    );
    expect(result).toEqual({
      risk_level: 'acute',
      category: 'selvskade',
      reasoning: 'Konkret plan nævnt.',
    });
  });

  it('extracts JSON wrapped in extra text', () => {
    const result = parseModelJson(
      'Her er vurderingen: {"risk_level":"none","category":"none","reasoning":"Almindelig samtale."} — færdig'
    );
    expect(result.risk_level).toBe('none');
    expect(result.category).toBe('none');
  });

  it('returns fallback classification on invalid input', () => {
    expect(parseModelJson('not json at all')).toEqual(FALLBACK_CLASSIFICATION);
    expect(parseModelJson('')).toEqual(FALLBACK_CLASSIFICATION);
  });

  it('never returns risk_level none on parse failure', () => {
    const garbage = parseModelJson('```broken```');
    expect(garbage.risk_level).toBe('elevated');
    expect(garbage.risk_level).not.toBe('none');
  });
});
