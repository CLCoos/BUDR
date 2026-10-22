import { clipText, createAliasMap, initialerAfNavn, namePartsFor } from '@/lib/ai/aliases';
import { medGrundlag } from '@/lib/ai/faglighed/grundlag';

export const OVERRAPPORT_HEADINGS = [
  '1. Kort overblik',
  '2. Borgere med særlig fokus',
  '3. Øvrige borgere',
  '4. Til næste vagt',
] as const;

const MAX_RESIDENTS = 40;

const REGLER = `Du hjælper pædagoger på et socialpsykiatrisk botilbud med at skrive vagtskifterapporten. Skriv kort og præcist, så den er let at læse højt ved vagtskifte.

Borgerne hedder "Borger 1", "Borger 2" osv. Brug præcis de betegnelser, så navnene kan sættes ind bagefter.

Brug PRÆCIS disse fire overskrifter på egne linjer (nummer + punktum + titel):
1. Kort overblik
2. Borgere med særlig fokus
3. Øvrige borgere
4. Til næste vagt

Under hver overskrift: højst 2 korte afsnit eller en punktliste med · foran hvert punkt. Ingen andre overskrifter.
Afsnit 1: hvor mange har tjekket ind, og om nogen kræver ekstra fokus (én eller to sætninger).
Afsnit 2: alle borgere med rød eller gul, svær stemning, bekymrende ord i noten eller åbne beskeder. Nævn hver af dem. Er der ingen, så skriv én sætning om det.
Afsnit 3: resten i meget korte linjer.
Afsnit 4: konkrete punkter til næste vagt med ·, kun ud fra data (fx "Svar på Borger 3's besked", "Tal med Borger 5, der ikke har tjekket ind").

Ekstra regler:
- Skriv hvad der er registreret, ikke gæt om hvorfor.
- Citér borgerens note ordret i anførselstegn, hvis du gengiver den.
- Højst ca. 280 ord.`;

const SYSTEM = medGrundlag(REGLER);

export type OverrapportResidentIn = {
  name?: unknown;
  initials?: unknown;
  moodLabel?: unknown;
  trafficLight?: unknown;
  checkinTime?: unknown;
  notePreview?: unknown;
  pendingMessages?: unknown;
};

/** Instruks og data til overrapporten med navne skiftet ud. `restore` sætter initialerne ind. */
export function buildOverrapportRequest(
  residentsIn: OverrapportResidentIn[],
  dateStrIn: unknown,
  timeStrIn: unknown
) {
  const residents = residentsIn.slice(0, MAX_RESIDENTS);
  const aliases = createAliasMap(
    residents.map((r) => {
      // Borgere står altid med initialer i teksten (GDPR); navnet bruges kun til at skjule det.
      const name = clipText(r.name, 80);
      const initials = clipText(r.initials, 4) || initialerAfNavn(name) || 'Borger';
      return { label: initials, names: namePartsFor(name, initials) };
    })
  );

  const lines = residents.map((r, i) => {
    const parts = [`${aliases.alias(i)}:`];
    const checkinTime = clipText(r.checkinTime, 10);
    const mood = clipText(r.moodLabel, 40);
    const light = clipText(r.trafficLight, 10);
    const note = clipText(r.notePreview, 160);
    const pending = typeof r.pendingMessages === 'number' ? r.pendingMessages : 0;
    if (checkinTime) parts.push(`check-in kl. ${checkinTime}`);
    if (mood) parts.push(`stemning: ${mood}`);
    if (light) parts.push(`trafiklys: ${light}`);
    if (note) parts.push(`note: "${aliases.hide(note)}"`);
    if (pending > 0) parts.push(`${pending} besked(er) til personalet`);
    if (!checkinTime) parts.push('ingen check-in i dag');
    return parts.join(', ');
  });

  const dateStr = clipText(dateStrIn, 40);
  const timeStr = clipText(timeStrIn, 10);
  return {
    system: SYSTEM,
    userMessage: `Vagtskifterapport, ${dateStr}, kl. ${timeStr}\n\nBorgerdata for i dag:\n${lines.join('\n')}\n\nSkriv overrapporten.`,
    maxTokens: 700,
    temperature: 0.2,
    restore: aliases.restore,
  };
}
