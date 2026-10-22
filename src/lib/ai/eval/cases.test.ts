import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { navneITekst } from '@/lib/ai/faglighed/tjek';
import { FEATURES, type EvalCase } from './features';

/** Testsættets cases kan bygges, og ingen borgernavne sendes til AI. Kører uden AI-nøgle. */
describe('AI-testsættets cases', () => {
  for (const feature of FEATURES) {
    const cases = JSON.parse(
      readFileSync(path.resolve(__dirname, 'cases', `${feature.key}.json`), 'utf8')
    ) as EvalCase[];

    it(`${feature.key}: har unikke id'er og kan bygges`, () => {
      expect(cases.length).toBeGreaterThan(0);
      expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
      for (const c of cases) {
        const p = feature.prepare(c);
        expect(p.request.userMessage.length).toBeGreaterThan(0);
        const leaked = navneITekst(p.request.userMessage, p.skjulteNavne);
        expect(leaked, `${c.id} sender navne til AI`).toEqual([]);
      }
    });
  }
});
