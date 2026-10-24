import { initialerAfNavn } from '@/lib/ai/aliases';
import { INDSATS_TYPE_OPTIONS } from '@/lib/indsatsRecords';
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
  /** Fritekst fra registreringen; vises kun som initialer. */
  involverede_borgere?: string;
};

function typeLabel(type: string): string {
  return INDSATS_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

/** «Sara K., MT» → «SK, MT». Rapporten nævner aldrig borgere ved navn. */
function borgerInitialer(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  return raw
    .split(/[,;&]|\bog\b/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(initialerAfNavn)
    .join(', ');
}

function formatWhen(tidspunkt: string): string {
  if (!tidspunkt) return 'tid ikke angivet';
  const d = new Date(tidspunkt);
  if (Number.isNaN(d.getTime())) return tidspunkt;
  return d.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function trafficKey(tl: string | null): 'grøn' | 'gul' | 'rød' | 'ingen' {
  const t = tl?.trim().toLowerCase();
  if (t === 'grøn' || t === 'groen') return 'grøn';
  if (t === 'gul') return 'gul';
  if (t === 'rød' || t === 'roed') return 'rød';
  return 'ingen';
}

function trafficWord(tl: string | null): string {
  if (!tl) return 'ikke registreret';
  const x = tl.trim().toLowerCase();
  if (x === 'grøn' || x === 'groen') return 'grønt';
  if (x === 'gul') return 'gult';
  if (x === 'rød' || x === 'roed') return 'rødt';
  return tl;
}

/** Én kort linje pr. borger: «SK (grøn, godt): God periode …». */
function shortResidentLine(r: TilsynsResidentRow): string {
  const status = [
    r.trafficLight ? trafficWord(r.trafficLight).replace(/t$/, '') : 'intet trafiklys',
    r.moodLabel ? r.moodLabel.toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(', ');
  const note = r.note ? ` ${r.note.slice(0, 160)}${r.note.length > 160 ? '…' : ''}` : '';
  return `${initialerAfNavn(r.name)} (${status}):${note || ' ingen note.'}`;
}

export function composeStructuredTilsynsrapport(
  residents: TilsynsResidentRow[],
  indsatsRecords: TilsynsIndsatsRecord[],
  ctx: { dateStr: string; facilityName: string }
): string {
  const trafficCounts = { grøn: 0, gul: 0, rød: 0, ingen: 0 };
  for (const r of residents) trafficCounts[trafficKey(r.trafficLight)]++;

  const magt = indsatsRecords.filter(
    (x) =>
      x.paragraph === '§136' ||
      x.paragraph === '§141' ||
      x.paragraph === '§ 136' ||
      x.paragraph === '§ 141'
  );

  const typeCounts: Record<string, number> = {};
  for (const x of indsatsRecords) {
    const label = x.paragraph
      ? `${x.paragraph} ${typeLabel(x.type).toLowerCase()}`
      : typeLabel(x.type).toLowerCase();
    typeCounts[label] = (typeCounts[label] ?? 0) + 1;
  }
  const typeSummary = Object.entries(typeCounts)
    .map(([label, n]) => `${n} × ${label}`)
    .join(', ');

  const lines: string[] = [];
  lines.push(`Tilsynsrapport — ${ctx.facilityName} · ${ctx.dateStr}`);
  lines.push('');
  lines.push('1. Generelle oplysninger om tilbuddet');
  lines.push('');
  lines.push(
    `Rapporten bygger på aktuelle oversigtsdata i BUDR Care (check-in og trafiklys) og registrerede indsatsnotater. ` +
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
    lines.push('Ingen magtanvendelser i perioden.');
  } else {
    for (const m of magt) {
      const desc = (m.beskrivelse || '').slice(0, 200);
      const who = borgerInitialer(m.involverede_borgere);
      lines.push(
        `· ${formatWhen(m.tidspunkt)} — ${typeLabel(m.type)} (${m.paragraph})${who ? `, ${who}` : ''}: ${desc}${m.beskrivelse.length > 200 ? '…' : ''}`
      );
    }
  }

  lines.push('');
  lines.push('4. Handleplaner og indsatser');
  lines.push('');
  if (indsatsRecords.length === 0) {
    lines.push('Der er ikke registreret indsatsnotater i perioden.');
  } else {
    lines.push(
      `I alt ${indsatsRecords.length} indsatsnotat${indsatsRecords.length > 1 ? 'er' : ''} i perioden: ${typeSummary}.`
    );
    lines.push('');
    for (const x of indsatsRecords) {
      const who = borgerInitialer(x.involverede_borgere);
      const desc = (x.beskrivelse || '').slice(0, 160);
      lines.push(
        `· ${formatWhen(x.tidspunkt)} — ${typeLabel(x.type)}${who ? `, ${who}` : ''}: ${desc}${x.beskrivelse.length > 160 ? '…' : ''}`
      );
    }
  }

  lines.push('');
  lines.push('5. Personalets vurdering af den aktuelle periode');
  lines.push('');
  if (residents.length > 0) {
    const byTraffic = (k: 'grøn' | 'gul' | 'rød') =>
      residents.filter((r) => trafficKey(r.trafficLight) === k).map((r) => initialerAfNavn(r.name));
    const groen = byTraffic('grøn');
    const gul = byTraffic('gul');
    const roed = byTraffic('rød');
    const facts = [
      `I dag har ${groen.length} af ${residents.length} borgere grønt trafiklys${groen.length ? ` (${groen.join(', ')})` : ''}.`,
      gul.length ? `${gul.length} har gult (${gul.join(', ')}) og følges tæt i hverdagen.` : null,
      roed.length
        ? `${roed.length} har rødt (${roed.join(', ')}) og har særlig opmærksomhed.`
        : null,
      magt.length === 0
        ? 'Der er ikke brugt magt i perioden.'
        : `Der er registreret ${magt.length} magtanvendelse${magt.length > 1 ? 'r' : ''} i perioden.`,
      indsatsRecords.length
        ? `De ${indsatsRecords.length} indsatsnotater beskriver, hvordan personalet har støttet borgerne, og hvad der følges op på.`
        : null,
    ].filter(Boolean);
    lines.push(facts.join(' '));
    lines.push('');
  }
  lines.push(
    'Vurderingen ovenfor bygger kun på data i systemet. Teamet supplerer med en kort faglig vurdering af mål, tryghed og samarbejde med netværk, før rapporten deles med tilsynet.'
  );

  lines.push('');
  lines.push(
    '— Udkast genereret automatisk ud fra strukturerede data og indsatsnotater (uden AI). Gennemlæs og tilpas før brug i tilsyn.'
  );

  return lines.join('\n');
}
