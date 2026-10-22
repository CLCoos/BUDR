import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { FAGLIGT_GRUNDLAG } from '@/lib/ai/faglighed/grundlag';

export type Bedoemmelse = {
  /** Påstande i svaret, der ikke kan føres tilbage til materialet. */
  opfundet: string[];
  /** 1-5 for hvert kriterium. */
  sandhed: number;
  objektivitet: number;
  faglighed: number;
  sprog: number;
  format: number;
  samlet: number;
  kommentar: string;
};

const JUDGE_SYSTEM = `Du er en erfaren faglig leder på et socialpsykiatrisk botilbud og bedømmer tekst, som en AI har skrevet for personalet. Du er streng og konkret.

Bedøm svaret ud fra dette faglige grundlag:

${FAGLIGT_GRUNDLAG}

Giv hvert kriterium 1-5 (5 = som den bedste kollega ville skrive det):
- sandhed: intet opfundet, intet vigtigt udeladt, mangler markeret med [ ].
- objektivitet: observation adskilt fra tolkning, ingen diagnoser, ingen gæt på årsager, intensitet bevaret.
- faglighed: recovery-orienteret, respektfuldt, borgerens egne ord brugt, alvorlige forhold tydelige.
- sprog: klart, korrekt og naturligt dansk.
- format: følger opgavens krævede struktur.
- samlet: din helhedsvurdering.

Det, opgaven udtrykkeligt beder om (fx faste markeringer eller punkter til næste vagt, der følger af data), er ikke opfundet. Borgerens initialer er korrekte, også når materialet har fulde navne.

List under "opfundet" hver påstand i svaret, der ikke kan føres tilbage til materialet (ordret uddrag, højst 8).

Svar KUN med JSON:
{"opfundet": [], "sandhed": 1, "objektivitet": 1, "faglighed": 1, "sprog": 1, "format": 1, "samlet": 1, "kommentar": "1-2 sætninger om det vigtigste at forbedre"}`;

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 1;
}

export async function bedoem(params: {
  apiKey: string;
  opgave: string;
  materiale: string;
  svar: string;
  noter: string;
}): Promise<Bedoemmelse | { fejl: string }> {
  const res = await callAnthropicJournalPolish({
    apiKey: params.apiKey,
    system: JUDGE_SYSTEM,
    userMessage: `<opgave>\n${params.opgave}\n</opgave>\n\n<materiale>\n${params.materiale}\n</materiale>\n\n<svar>\n${params.svar}\n</svar>\n\n<hvad_et_godt_svar_goer>\n${params.noter}\n</hvad_et_godt_svar_goer>`,
    maxTokens: 800,
    temperature: 0,
    preferredModels: [process.env.EVAL_JUDGE_MODEL?.trim() || 'claude-sonnet-4-5'],
  });
  if (!res.ok) return { fejl: `bedømmer svarede ikke (${res.status})` };
  const json = res.text.slice(res.text.indexOf('{'), res.text.lastIndexOf('}') + 1);
  try {
    const d = JSON.parse(json) as Record<string, unknown>;
    return {
      opfundet: Array.isArray(d.opfundet) ? d.opfundet.map(String).slice(0, 8) : [],
      sandhed: clampScore(d.sandhed),
      objektivitet: clampScore(d.objektivitet),
      faglighed: clampScore(d.faglighed),
      sprog: clampScore(d.sprog),
      format: clampScore(d.format),
      samlet: clampScore(d.samlet),
      kommentar: typeof d.kommentar === 'string' ? d.kommentar : '',
    };
  } catch {
    return { fejl: 'bedømmerens svar var ikke JSON' };
  }
}
