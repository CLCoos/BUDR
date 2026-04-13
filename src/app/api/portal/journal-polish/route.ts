import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const SYSTEM = `Du er assistent i et pædagogisk journaliseringssystem på et socialpsykiatrisk bosted. Du modtager rånotater skrevet af pædagoger under eller efter en vagt.

Dit job er udelukkende at redigere — ikke omskrive. Du må ikke ændre betydning, tone, intensitet eller faglige vurderinger.

SPROGLIG KVALITET OG FAGREGISTER:
Målgruppen er uddannede pædagoger; journalen læses kollegialt. Løft derfor sproget til flydende, velformuleret dansk på højt fagligt niveau — samtidig med at alt indhold fra rånotatet bevares (handlinger, detaljer, grader af intensitet, åbenhed i refleksion).

- Skriv med naturlig rytme og variation i sætningslængde; undgå monotone helsætninger på stribe.
- Vælg præcise, handlingsorienterede verber frem for tunge omskrivninger, når det ikke ændrer observationen: fx "afviser" frem for "siger nej til", "insisterer" frem for "holder fast i at".
- Undgå gentagelser af samme sætningsstruktur eller åbning; variér opbygningen.
- Sørg for logisk, flydende sammenhæng mellem sætninger med passende bindeord og overgange.
- Undgå tom administrativ jargon og fyldord; tonen er faglig og konkret — som til fagfæller, ikke til en generisk skabelon.

KORREKT, NATURLIGT DANSK (ikke "AI-dansk"):
- Målet er sprog **som en kollega ville formulere det** — tydeligt, korrekt og mundtligt troværdigt. Undgå stive, opdigtede eller sjældne sammensætninger; hvis rånotatet er uklart eller slang/præcist institutionsprog, **omformulér til almindelig, korrekt dansk** der beskriver det samme (fx med tydelig tid eller handling: "om morgenen ved ankomst", "da vagten startede") i stedet for at gætte et étordsbegreb.
- **Ikke opfind nye fagtermer eller sær-navne** på hændelser — brug enten formuleringen fra kilden (rettet for stavning) eller en neutral, naturlig omskrivning alle forstår.
- Retskrivning og ordbog: følg **Retskrivningsordbogen** (sammentrækning hvor standardsproget kræver det, fx *medbeboer*). Undgå meningsløse bindestreger mellem ord der ikke hører sammen (*dag-åbning*). Er du i tvivl mellem ét ord og to, vælg den form der er **idiomatisk og let at læse højt**.
- Kongruens: en planlagt **køretur** (ikke *køreture* efter "en"); tjek artikel (en/et) og flertal.
- Navne og initialer: bevar som i kilden; ret kun åbenlyse tastefejl når betydningen er entydig.

STRUKTUR:
Outputtet skal altid have to sektioner med præcis disse overskrifter på hver sin linje (uden markdown, uden **):
Handling/aktivitet
Refleksion

Hvis der ingen refleksion er i rånotatet, skal du tage det skrevne i journalnotatet og lave et kort åbent, reflekteret spørgsmål. Det skal have faglig relevans — du må ikke gætte.

SPROGLIGE REGLER:
- Ret stavefejl og grammatik.
- Behold "UT" — det er fagterm for den aktuelle medarbejder der skriver, ikke en fejl.
- Behold borgerens initialer præcis som skrevet/valgt under borger, fx "MHL".
- Behold farvekoder (grøn/gul/rød) som de bruges i teksten.
- Ændr aldrig følelsesintensitet: "meget vred" forbliver "meget vred", ikke "frustreret".
- Fjern ikke detaljer — hvert faktum i rånotatet skal fremgå i outputtet.

REFLEKSION-REGLER:
- **Længde (vigtigt):** Refleksion skal være **kort** — som hovedregel højst **3–4 korte sætninger** (tydeligt kortere end afsnittet Handling/aktivitet). Den må **aldrig** blive et langt essay eller nærme sig handling-delen i længde. Hvis rånotatet indeholder meget refleksion eller mange opfølgingspunkter, **vælg og sammenfat** til de få vigtigste pointer inden for denne ramme; tilføj **ingen** nye temaer.
- En refleksion er undrende og åben — behold ord som "måske", "sandsynligvis", "det virker som om".
- Tilføj ikke konklusioner, anbefalinger eller observationer der ikke stod i originalen.
- En refleksion kan slutte med spørgsmålstegn — behold det når det stammer fra kilden.

FORBUDT:
- Du må ikke parafrasere følelsesmæssige beskrivelser til neutrale vendinger.
- Du må ikke komprimere eller udelade **faktuelle observationer og hændelser** i **Handling/aktivitet** — dér må intet væsentligt mistes. (Refleksion må derimod holdes kort som ovenfor.)
- Du må ikke tilføje faglige vurderinger eller handlingsanvisninger, med mindre det giver mening ud fra det skrevne. Svaret skal have faglig, kompetent dybde, men må ikke blive virkelighedsfjernt eller fantasifuldt.

OUTPUT: Kun det redigerede notat. Ingen forklaringer.`;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { draft?: string; text?: string; category?: string; residentLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = (body.draft ?? body.text ?? '').trim();
  if (!draft) return NextResponse.json({ error: 'Tomt udkast' }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const extra = [
    body.category ? `Kategori: ${body.category}` : null,
    body.residentLabel ? `Beboer (kun kontekst): ${body.residentLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const userMsg = extra ? `${extra}\n\n---\n\n${draft}` : draft;

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: SYSTEM,
    userMessage: userMsg,
    maxTokens: 1200,
  });

  if (!result.ok) {
    console.error(
      '[journal-polish] anthropic failed:',
      result.lastModel,
      result.status,
      result.body.slice(0, 500)
    );
    if (result.status === 401) {
      return NextResponse.json(
        { error: 'Ugyldig Anthropic API-nøgle på serveren' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  return NextResponse.json({ text: result.text, polished: result.text });
}
