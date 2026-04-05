/**
 * Deterministisk tilsynsrapport-udkast når AI ikke svarer — samme fem afsnit som vi beder modellen om.
 */

export type TilsynsResidentRow = {
  name: string;
  trafficLight: string | null;
  moodLabel: string | null;
  note: string | null;
};

export type TilsynsIndsatsRecord = {
  paragraph: string;
  tidspunkt: string;
  type: string;
  beskrivelse: string;
};

function trafficWord(tl: string | null): string {
  if (!tl) return 'ikke registreret';
  const x = tl.trim().toLowerCase();
  if (x === 'grøn' || x === 'groen') return 'grønt';
  if (x === 'gul') return 'gult';
  if (x === 'rød' || x === 'roed') return 'rødt';
  return tl;
}

function shortResidentLine(r: TilsynsResidentRow): string {
  const bits = [r.name.replace(/\.$/, '')];
  bits.push(r.moodLabel ? `stemning: ${r.moodLabel}` : 'stemning: ikke registreret');
  bits.push(`${trafficWord(r.trafficLight)} trafiklys`);
  if (r.note) bits.push(`note: «${r.note.slice(0, 100)}${r.note.length > 100 ? '…' : ''}»`);
  return bits.join(' · ');
}

export function composeStructuredTilsynsrapport(
  residents: TilsynsResidentRow[],
  indsatsRecords: TilsynsIndsatsRecord[],
  ctx: { dateStr: string; facilityName: string }
): string {
  const trafficCounts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
  for (const r of residents) {
    const t = r.trafficLight?.trim().toLowerCase();
    if (t === 'grøn' || t === 'groen') trafficCounts.grøn++;
    else if (t === 'gul') trafficCounts.gul++;
    else if (t === 'rød' || t === 'roed') trafficCounts.rød++;
    else trafficCounts.ingen++;
  }

  const magt = indsatsRecords.filter(
    (x) =>
      x.paragraph === '§136' ||
      x.paragraph === '§141' ||
      x.paragraph === '§ 136' ||
      x.paragraph === '§ 141'
  );

  const paraCounts: Record<string, number> = {};
  for (const x of indsatsRecords) {
    const p = x.paragraph || 'øvrigt';
    paraCounts[p] = (paraCounts[p] ?? 0) + 1;
  }
  const paraSummary =
    Object.keys(paraCounts).length === 0
      ? 'ingen registreringer'
      : Object.entries(paraCounts)
          .map(([p, n]) => `${n}× ${p}`)
          .join(', ');

  const lines: string[] = [];
  lines.push(`Tilsynsrapport — ${ctx.facilityName} · ${ctx.dateStr}`);
  lines.push('');
  lines.push('1. Generelle oplysninger om tilbuddet');
  lines.push('');
  lines.push(
    `Rapporten bygger på aktuelle oversigtsdata i BUDR Care (check-in og trafiklys) og eventuelle indsatsnotater gemt lokalt i browseren på denne enhed. ` +
      `Tilbud: ${ctx.facilityName}. ` +
      (residents.length > 0
        ? `Der indgår ${residents.length} borger${residents.length > 1 ? 'e' : ''} i datagrundlaget.`
        : 'Der er pt. ingen borgerdata i datagrundlaget — rapporten er et tomt skabelonudkast.')
  );

  lines.push('');
  lines.push('2. Borgersammensætning og trivselsoverblik');
  lines.push('');
  lines.push(
    `Trafiklysfordeling i oversigten: ${trafficCounts.grøn} grøn, ${trafficCounts.gul} gul, ${trafficCounts.rød} rød, ${trafficCounts.ingen} uden registreret trafiklys.`
  );
  lines.push('');
  if (residents.length === 0) {
    lines.push('· Ingen borgerlinjer — tilføj data i systemet for fuld oversigt.');
  } else {
    for (const r of residents) {
      lines.push(`· ${shortResidentLine(r)}`);
    }
  }

  lines.push('');
  lines.push('3. Dokumenterede magtanvendelser');
  lines.push('');
  if (magt.length === 0) {
    lines.push(
      'Ingen registreringer markeret som § 136 eller § 141 i de indlæste indsatsnotater på denne enhed.'
    );
  } else {
    for (const m of magt) {
      const when = m.tidspunkt
        ? new Date(m.tidspunkt).toLocaleString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'tid ikke angivet';
      const desc = (m.beskrivelse || '').slice(0, 200);
      lines.push(
        `· ${when} — ${m.type} (${m.paragraph}): ${desc}${m.beskrivelse.length > 200 ? '…' : ''}`
      );
    }
  }

  lines.push('');
  lines.push('4. Handleplaner og indsatser');
  lines.push('');
  if (indsatsRecords.length === 0) {
    lines.push(
      'Der er ikke fundet indsatsnotater i lokallageret (browser) på denne enhed. Ved live brug kan journal- og indsatsdata kobles på sigt.'
    );
  } else {
    lines.push(
      `I alt ${indsatsRecords.length} indsatsnotat${indsatsRecords.length > 1 ? 'er' : ''} i det indlæste udkast. Fordeling: ${paraSummary}.`
    );
    lines.push(
      'Detaljer kan ses under Indsats i portalen; denne rapport er et resumé til tilsyn og ledelse.'
    );
  }

  lines.push('');
  lines.push('5. Personalets vurdering af den aktuelle periode');
  lines.push('');
  lines.push(
    'Samlet vurdering bør kort fagligt underbygges af teamet ved godkendelse — fx om mål, tryghed og samarbejde med netværk. ' +
      'Dette afsnit er et udkast og skal tilpasses før indberetning eller deling med myndighed.'
  );

  lines.push('');
  lines.push(
    '— Udkast genereret automatisk ud fra strukturerede data og lokale indsatskladder (uden AI). Gennemlæs og tilpas før brug i tilsyn.'
  );

  return lines.join('\n');
}
