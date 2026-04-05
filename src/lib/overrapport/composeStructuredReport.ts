/**
 * Deterministic “auto-overrapport” when AI is unavailable or returns no text.
 * Mirrors the sections we ask the LLM for, so the demo and live portal stay useful.
 */

export interface OverrapportResidentInput {
  name: string;
  initials: string;
  moodLabel: string | null;
  trafficLight: string | null;
  checkinTime: string | null;
  notePreview: string | null;
  pendingMessages: number;
}

function normalizeTraffic(t: string | null): 'rød' | 'gul' | 'grøn' | null {
  if (!t) return null;
  const x = t.trim().toLowerCase();
  if (x === 'rød' || x === 'roed') return 'rød';
  if (x === 'gul') return 'gul';
  if (x === 'grøn' || x === 'groen') return 'grøn';
  return null;
}

function trafficWord(tl: ReturnType<typeof normalizeTraffic>): string {
  if (tl === 'rød') return 'rødt';
  if (tl === 'gul') return 'gult';
  if (tl === 'grøn') return 'grønt';
  return '';
}

export function needsOverrapportAttention(r: OverrapportResidentInput): boolean {
  const tl = normalizeTraffic(r.trafficLight);
  if (tl === 'rød' || tl === 'gul') return true;
  if (r.pendingMessages > 0) return true;
  if (r.moodLabel === 'Svært' || r.moodLabel === 'Dårligt') return true;
  return false;
}

function shortResidentLine(r: OverrapportResidentInput): string {
  const bits: string[] = [r.name.replace(/\.$/, '')];
  const tl = normalizeTraffic(r.trafficLight);
  if (r.checkinTime) bits.push(`check-in ${r.checkinTime}`);
  else bits.push('ingen check-in i dag');
  if (r.moodLabel) bits.push(`stemning ${r.moodLabel.toLowerCase()}`);
  if (tl) bits.push(`${trafficWord(tl)} trafiklys`);
  if (r.pendingMessages > 0)
    bits.push(`${r.pendingMessages} åben${r.pendingMessages > 1 ? 'e' : ''} besked til personalet`);
  if (r.notePreview)
    bits.push(`notat: «${r.notePreview.slice(0, 120)}${r.notePreview.length > 120 ? '…' : ''}»`);
  return bits.join(' · ');
}

/**
 * Builds a professional Danish handover report from resident rows (no LLM).
 */
export function composeStructuredOverrapport(
  residents: OverrapportResidentInput[],
  ctx: { dateStr: string; timeStr: string }
): string {
  if (residents.length === 0) {
    return [
      `Vagtskifterapport — ${ctx.dateStr}, kl. ${ctx.timeStr}`,
      '',
      '1. Kort overblik',
      '',
      'Der er ingen beboerdata at bygge rapport på lige nu — rapporten kan ikke fylde fagligt indhold ud endnu.',
      '',
      '2. Borgere med særlig fokus',
      '',
      'Ingen — ingen data.',
      '',
      '3. Øvrige borgere',
      '',
      'Ingen — ingen data.',
      '',
      '4. Til næste vagt',
      '',
      '· Bekræft at borgerlister og dagens check-ins er synkroniseret i systemet.',
      '',
      '— Udkast genereret automatisk ud fra strukturerede data (uden AI). Teksten kan frit redigeres før den deles.',
    ].join('\n');
  }

  const attention = residents.filter(needsOverrapportAttention);
  const rest = residents.filter((r) => !attention.includes(r));
  const noCheckin = residents.filter((r) => !r.checkinTime);
  const withCheckin = residents.length - noCheckin.length;

  const lines: string[] = [];
  lines.push(`Vagtskifterapport — ${ctx.dateStr}, kl. ${ctx.timeStr}`);
  lines.push('');
  lines.push('1. Kort overblik');
  lines.push('');
  lines.push(
    [
      `Check-in: ${withCheckin}/${residents.length} borgere.`,
      noCheckin.length > 0
        ? `${noCheckin.length} mangler stadig check-in — følg op i vagten eller ved skift.`
        : null,
      attention.length > 0
        ? `${attention.length} bør have ekstra fokus i næste vagt (trafiklys, humør eller åbne beskeder).`
        : 'Ingen røde/gule trafiklys eller åbne beskeder peger ud over sædvanligt tilsyn.',
    ]
      .filter(Boolean)
      .join(' ')
  );

  lines.push('');
  lines.push('2. Borgere med særlig fokus');
  lines.push('');
  if (attention.length === 0) {
    lines.push('Ingen ud over det sædvanlige tilsyn ifølge dagens registreringer.');
  } else {
    for (const r of attention) {
      lines.push(`· ${shortResidentLine(r)}`);
    }
  }

  lines.push('');
  lines.push('3. Øvrige borgere');
  lines.push('');
  if (rest.length === 0) {
    lines.push('Alle borgere er nævnt under særlig fokus.');
  } else {
    for (const r of rest) {
      lines.push(`· ${shortResidentLine(r)}`);
    }
  }

  lines.push('');
  lines.push('4. Til næste vagt');
  lines.push('');
  const bullets: string[] = [];
  if (noCheckin.length > 0) {
    bullets.push(
      `· Sørg for check-in eller dokumenteret fravær for: ${noCheckin.map((r) => r.name.replace(/\.$/, '')).join(', ')}.`
    );
  }
  for (const r of attention.filter((x) => normalizeTraffic(x.trafficLight) === 'rød')) {
    bullets.push(
      `· ${r.name.replace(/\.$/, '')}: vedligehold tryghed og kriseplan — kort status i journal ved behov.`
    );
  }
  for (const r of attention.filter((x) => x.pendingMessages > 0)) {
    bullets.push(
      `· ${r.name.replace(/\.$/, '')}: der ligger besked(er) til personalet — læs og afvikl eller besvar i planen.`
    );
  }
  if (bullets.length === 0) {
    bullets.push('· Fortsæt det planlagte program og den pædagogiske døgnrytme.');
    bullets.push(
      '· Kort verbal overlevering mellem kolleger ved skift anbefales som supplement til denne rapport.'
    );
  }
  lines.push(...bullets);

  lines.push('');
  lines.push(
    '— Udkast genereret automatisk ud fra strukturerede data (uden AI). Teksten kan frit redigeres før den deles.'
  );

  return lines.join('\n');
}
