import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { clipText, createAliasMap, initialerAfNavn, namePartsFor } from '@/lib/ai/aliases';
import { requireStaffForAi } from '@/lib/ai/staffAiAuth';
import { PERMISSIONS } from '@/lib/permissions';

export const maxDuration = 60;

const MAX_RESIDENTS = 60;
const MAX_MAGT = 40;

const SYSTEM = `Du skriver et udkast til en tilsynsrapport fra et socialpsykiatrisk botilbud. Skriv formelt og fagligt, men læsbart dansk.

Borgerne hedder "Borger 1", "Borger 2" osv. Brug præcis de betegnelser, så navnene kan sættes ind bagefter.

Brug PRÆCIS disse fem overskrifter på hver sin linje (nummer + punktum + titel):
1. Generelle oplysninger om tilbuddet
2. Borgersammensætning og trivselsoverblik
3. Dokumenterede magtanvendelser
4. Handleplaner og indsatser
5. Personalets vurdering af den aktuelle periode

Under hver overskrift: korte afsnit og/eller punktlister med · foran hvert punkt. Ingen andre overskrifter.

Regler:
- Brug KUN de oplysninger, du får. Opfind aldrig tal, hændelser, målgrupper, normeringer, tilsynsfund eller vurderinger.
- Mangler der oplysninger til et afsnit, så skriv en markering i firkantede parenteser, fx "[Udfyldes af personalet: tilbuddets målgruppe og antal pladser]". Det gælder især afsnit 1 og 5.
- Afsnit 5 er personalets egen vurdering. Skriv kun markeringer med de spørgsmål, personalet bør besvare, ikke en vurdering.
- Henvis kun til lovparagraffer, der står i data.
- Ingen diagnoser. Skriv hvad der er registreret, ikke gæt om årsager.
- Højst ca. 450 ord. Afslut ikke med metatekst om AI.`;

type ResidentIn = { name?: unknown; trafficLight?: unknown; moodLabel?: unknown; note?: unknown };
type MagtIn = { tidspunkt?: unknown; type?: unknown; paragraph?: unknown; beskrivelse?: unknown };

export async function POST(req: NextRequest) {
  const auth = await requireStaffForAi(PERMISSIONS.VIEW_RESIDENTS);
  if (!auth.ok) return auth.response;

  let body: {
    facilityName?: unknown;
    dateStr?: unknown;
    residents?: ResidentIn[];
    magtanvendelser?: MagtIn[];
    indsatsCount?: unknown;
    indsatsParagraphs?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const residents = Array.isArray(body.residents) ? body.residents.slice(0, MAX_RESIDENTS) : [];
  const magt = Array.isArray(body.magtanvendelser) ? body.magtanvendelser.slice(0, MAX_MAGT) : [];
  const aliases = createAliasMap(
    residents.map((r) => {
      // Borgere står altid med initialer i rapporten (GDPR).
      const name = clipText(r.name, 80);
      const initials = initialerAfNavn(name) || 'Borger';
      return { label: initials, names: namePartsFor(name, initials) };
    })
  );

  const counts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
  const residentLines = residents.map((r, i) => {
    const light = clipText(r.trafficLight, 10).toLowerCase();
    if (light === 'grøn' || light === 'groen') counts.grøn++;
    else if (light === 'gul') counts.gul++;
    else if (light === 'rød' || light === 'roed') counts.rød++;
    else counts.ingen++;
    const note = clipText(r.note, 160);
    return `${aliases.alias(i)}: trafiklys=${light || 'ingen'}, stemning=${clipText(r.moodLabel, 40) || 'ikke registreret'}${note ? `, note: "${aliases.hide(note)}"` : ''}`;
  });

  const magtLines = magt.map(
    (m) =>
      `${clipText(m.tidspunkt, 40)}: ${clipText(m.type, 60)} (${clipText(m.paragraph, 12)}): ${aliases.hide(clipText(m.beskrivelse, 200))}`
  );
  const paragraphs = Array.isArray(body.indsatsParagraphs)
    ? body.indsatsParagraphs.map((p) => clipText(p, 12)).filter(Boolean)
    : [];
  const indsatsCount = typeof body.indsatsCount === 'number' ? body.indsatsCount : 0;

  const userMessage = `Tilsynsrapport for ${clipText(body.facilityName, 120) || 'tilbuddet'}, ${clipText(body.dateStr, 40)}

Antal borgere i datagrundlaget: ${residents.length}
Trafiklys: ${counts.grøn} grøn, ${counts.gul} gul, ${counts.rød} rød, ${counts.ingen} ikke registreret

Borgerdata:
${residentLines.join('\n') || 'Ingen borgerdata'}

Registrerede magtanvendelser:
${magtLines.join('\n') || 'Ingen registrerede magtanvendelser.'}

Indsatsnotater i alt: ${indsatsCount}${paragraphs.length ? ` (${[...new Set(paragraphs)].join(', ')})` : ''}

Udarbejd tilsynsrapporten.`;

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: SYSTEM,
    userMessage,
    maxTokens: 1200,
    temperature: 0.2,
  });
  if (!result.ok) {
    console.error('[ai/tilsynsrapport] failed:', result.lastModel, result.status);
    return NextResponse.json({ error: 'AI svarer ikke' }, { status: 502 });
  }
  return NextResponse.json({ text: aliases.restore(result.text) });
}
