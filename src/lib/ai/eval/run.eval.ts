/**
 * Testsæt for AI-funktionerne. Kører rigtige AI-kald, så det kræver ANTHROPIC_API_KEY.
 *
 *   ANTHROPIC_API_KEY=… npm run eval:ai
 *   EVAL_FEATURE=journal-polish EVAL_LIMIT=5 npm run eval:ai
 *
 * Skriver en rapport i eval-results/ med faste tjek og en bedømmers karakterer pr. case.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import {
  forbudte,
  manglendeOverskrifter,
  mangler,
  medicinraad,
  navneITekst,
  nyeDiagnoser,
} from '@/lib/ai/faglighed/tjek';
import { bedoem, type Bedoemmelse } from './judge';
import { FEATURES, type EvalCase, type Feature } from './features';

type Resultat = {
  feature: string;
  id: string;
  beskrivelse: string;
  svar: string;
  fejl: string[];
  bedoemmelse: Bedoemmelse | { fejl: string } | null;
};

const apiKey = claudeApiKey();
const only = process.env.EVAL_FEATURE?.trim();
const limit = Number(process.env.EVAL_LIMIT) || Infinity;
const skipJudge = process.env.EVAL_SKIP_JUDGE === '1';

function loadCases(key: string): EvalCase[] {
  const file = path.resolve(__dirname, 'cases', `${key}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as EvalCase[]).slice(0, limit);
}

async function runCase(feature: Feature, c: EvalCase): Promise<Resultat> {
  const p = feature.prepare(c);
  const fejl: string[] = [];

  const lækkedeNavne = navneITekst(`${p.request.system}\n${p.request.userMessage}`, p.skjulteNavne);
  if (lækkedeNavne.length) fejl.push(`navne sendt til AI: ${lækkedeNavne.join(', ')}`);

  const res = await callAnthropicJournalPolish({ apiKey: apiKey!, ...p.request });
  if (!res.ok) {
    return {
      feature: feature.key,
      id: c.id,
      beskrivelse: c.beskrivelse,
      svar: '',
      fejl: [`AI-fejl ${res.status}`],
      bedoemmelse: null,
    };
  }
  const svar = p.efterbehandl(res.text);

  const manglende = manglendeOverskrifter(svar, p.overskrifter);
  if (manglende.length) fejl.push(`mangler overskrifter: ${manglende.join(', ')}`);
  const diagnoser = nyeDiagnoser(svar, p.materiale);
  if (diagnoser.length) fejl.push(`nye diagnoser: ${diagnoser.join(', ')}`);
  const raad = medicinraad(svar);
  if (raad.length) fejl.push(`medicinråd: ${raad.join(' | ')}`);
  const m = mangler(svar, c.forventet.skalIndeholde ?? []);
  if (m.length) fejl.push(`mangler: ${m.join(' | ')}`);
  const f = forbudte(svar, c.forventet.maaIkkeIndeholde ?? []);
  if (f.length) fejl.push(`må ikke stå: ${f.join(' | ')}`);

  const bedoemmelse = skipJudge
    ? null
    : await bedoem({
        apiKey: apiKey!,
        opgave: p.opgave,
        materiale: p.materiale,
        svar,
        noter: c.forventet.noter ?? '',
      });

  return { feature: feature.key, id: c.id, beskrivelse: c.beskrivelse, svar, fejl, bedoemmelse };
}

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function gennemsnit(rs: Resultat[], k: keyof Omit<Bedoemmelse, 'opfundet' | 'kommentar'>): string {
  const vals = rs
    .map((r) => (r.bedoemmelse && !('fejl' in r.bedoemmelse) ? r.bedoemmelse[k] : null))
    .filter((v): v is number => v !== null);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
}

function rapport(alle: Resultat[]): string {
  const lines = [`# AI-testsæt ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, ''];
  lines.push(
    '| Funktion | Cases | Faste tjek bestået | Sandhed | Objektivitet | Faglighed | Sprog | Format | Samlet |'
  );
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const f of FEATURES) {
    const rs = alle.filter((r) => r.feature === f.key);
    if (!rs.length) continue;
    const ok = rs.filter((r) => r.fejl.length === 0).length;
    lines.push(
      `| ${f.titel} | ${rs.length} | ${ok}/${rs.length} | ${gennemsnit(rs, 'sandhed')} | ${gennemsnit(rs, 'objektivitet')} | ${gennemsnit(rs, 'faglighed')} | ${gennemsnit(rs, 'sprog')} | ${gennemsnit(rs, 'format')} | ${gennemsnit(rs, 'samlet')} |`
    );
  }
  lines.push('');
  for (const r of alle) {
    const b = r.bedoemmelse;
    lines.push(`## ${r.id}: ${r.beskrivelse}`);
    if (r.fejl.length) lines.push(`**Faste tjek:** ${r.fejl.join('; ')}`);
    if (b && 'fejl' in b) lines.push(`**Bedømmer:** ${b.fejl}`);
    else if (b) {
      lines.push(`**Samlet ${b.samlet}/5.** ${b.kommentar}`);
      if (b.opfundet.length)
        lines.push(`**Opfundet:** ${b.opfundet.map((o) => `«${o}»`).join(', ')}`);
    }
    lines.push('', '```', r.svar.trim(), '```', '');
  }
  return lines.join('\n');
}

describe.skipIf(!apiKey)('AI-testsæt', () => {
  it(
    'kører alle cases',
    async () => {
      const alle: Resultat[] = [];
      for (const feature of FEATURES) {
        if (only && feature.key !== only) continue;
        alle.push(...(await inBatches(loadCases(feature.key), 4, (c) => runCase(feature, c))));
      }
      const dir = path.resolve(process.cwd(), 'eval-results');
      mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const md = rapport(alle);
      writeFileSync(path.join(dir, `ai-eval-${stamp}.md`), md);
      writeFileSync(path.join(dir, `ai-eval-${stamp}.json`), JSON.stringify(alle, null, 2));
      // Hele rapporten i loggen, så den kan læses uden at hente artefaktet.
      console.info(md);
      expect(alle.length).toBeGreaterThan(0);
    },
    30 * 60_000
  );
});
