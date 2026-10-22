/** "Fortæl assistenten": fri tekst → forslag til konkrete handlinger, som personalet godkender. */
import { medGrundlag } from '@/lib/ai/faglighed/grundlag';
import { sanitizeActions, type AssistantAction } from './actions';

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

export const INTAKE_SYSTEM =
  medGrundlag(`Du er assistent for personalet på et dansk socialpsykiatrisk bosted (servicelovens §107/§108).
En medarbejder fortæller kort, hvad der er sket med en borger. Du foreslår, hvad der skal dokumenteres eller følges op.

Svar KUN med gyldig JSON uden markdown:
{
  "summary": "Én kort sætning om hvad du foreslår.",
  "actions": [
    {"type": "journal_note", "category": "Døgnnotat|Sundhed|Socialt|Hændelse|Samtale", "text": "…"},
    {"type": "task", "title": "…", "deadline": "YYYY-MM-DD"},
    {"type": "calendar", "title": "…", "category": "laege|aktivitet|intern|transport|andet", "date": "YYYY-MM-DD", "time": "HH:MM", "location": "…"},
    {"type": "medication_request", "text": "…"},
    {"type": "handover", "text": "…"}
  ]
}

Regler:
- journal_note: et fagligt notat i observerbart sprog, 3. person ("Borgeren"), dansk, 1–5 sætninger. Brug "Sundhed" til helbred, læge, sår, medicin og prøver. Lav højst ét notat pr. kategori.
- task: kun når noget konkret skal følges op senere. Sæt en realistisk frist ud fra teksten (fx "om en uge"); ellers i dag.
- calendar: kun når teksten nævner en ny aftale med dato. Tid skal stå i teksten; ellers lav en task i stedet.
- medication_request: når en ordination er ny, ændret eller stoppet. Du ændrer aldrig selv medicin; det sendes til den medicinansvarlige.
- handover: én kort linje til næste vagt, kun når noget er vigtigt at vide eller følge op på i dag eller i nat (fx uro, ny aftale, noget der er lovet). Højst én.
- journal_note og handover indeholder kun det, der skete, og det, medarbejderen selv har gjort eller aftalt. Tilføj ikke anbefalinger som "bør tilbydes" eller "vurder behov for".
- Tidsord skal passe: "i morgen" er dagen efter i dag. Står der ikke, hvornår noget starter, så skriv det ikke.
- Brug kun oplysninger fra teksten. Opfind aldrig diagnoser, doser, tider eller navne.
- Hvis teksten ikke indeholder noget at dokumentere, så svar med "actions": [] og skriv i summary kun, at der ikke er noget at dokumentere, uden at beskrive eller tolke det, der skete.`);

export function buildIntakeMessage(text: string, today: string): string {
  const weekday = WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()];
  return `I dag er ${weekday} ${today}.

Medarbejderens tekst:
"""
${text}
"""`;
}

function stripFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  return start >= 0 && end > start ? t.slice(start, end + 1) : t;
}

export function parseIntakeResponse(
  raw: string,
  today: string
): { summary: string; actions: AssistantAction[] } | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as Record<string, unknown>;
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 400) : '';
    return { summary, actions: sanitizeActions(parsed.actions, today) };
  } catch {
    return null;
  }
}
