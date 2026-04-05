import type { ResidentExportInput } from './types';

const DISCLAIMER = [
  '',
  '—',
  'Fortroligt materiale. Må kun videregives i overensstemmelse med gældende regler om behandling af personoplysninger og evt. samtykke.',
  'Uddrag genereret fra BUDR Care. Faglig vurdering og ajourføring påhviler altid det udsende personale.',
].join('\n');

function normCat(c: string): string {
  return c.trim().toLowerCase();
}

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('da-DK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function trafficDa(tl: ResidentExportInput['resident']['trafficLight']): string {
  if (tl === 'groen') return 'Grøn';
  if (tl === 'gul') return 'Gul';
  if (tl === 'roed') return 'Rød';
  return 'Ikke registreret';
}

function isApproved(j: { journal_status: string }): boolean {
  return j.journal_status !== 'kladde';
}

/** Journal linjer relevante for lægen: medicin + helbred + observation (ofte somatisk kontekst). */
function journalForDoctor(input: ResidentExportInput) {
  const want = new Set(['medicin', 'helbred', 'observation']);
  return input.journalEntries.filter((j) => isApproved(j) && want.has(normCat(j.category)));
}

/** Journal til psykiater: stemning, samtale, hændelse (+ godkendt observation som kan understøtte). */
function journalForPsych(input: ResidentExportInput) {
  const primary = new Set(['stemning', 'samtale', 'hændelse']);
  const secondary = new Set(['observation']);
  return input.journalEntries.filter(
    (j) => isApproved(j) && (primary.has(normCat(j.category)) || secondary.has(normCat(j.category)))
  );
}

function formatJournalBlock(entries: ResidentExportInput['journalEntries']): string {
  if (entries.length === 0) return 'Ingen relevante journalnotater i valgt periode.';
  return entries
    .map(
      (e) =>
        `· [${fmtWhen(e.created_at)}] ${e.category} — ${e.staff_name}\n  ${e.entry_text.trim().replace(/\n+/g, ' ')}`
    )
    .join('\n\n');
}

function medList(input: ResidentExportInput, detailed: boolean): string {
  const rows = input.medications.filter((m) => m.status !== 'stoppet');
  if (rows.length === 0) return 'Ingen registrerede præparater (aktive/pauserede).';
  if (!detailed) {
    return rows.map((m) => `· ${m.name}${m.status === 'pauseret' ? ' (pauseret)' : ''}`).join('\n');
  }
  return rows
    .map((m) => {
      const bits = [
        `${m.name} — ${m.dose}, ${m.frequency}`,
        m.time_label ? `Tid: ${m.time_label}` : null,
        m.prescribed_by ? `Ordineret af: ${m.prescribed_by}` : null,
        m.notes ? `Noter: ${m.notes}` : null,
        m.status === 'pauseret' ? 'Status: pauseret' : null,
      ].filter(Boolean);
      return `· ${bits.join('\n  ')}`;
    })
    .join('\n\n');
}

export function buildDoctorExport(input: ResidentExportInput): string {
  const { resident, checkinNote } = input;
  const j = journalForDoctor(input);
  const lines: string[] = [];
  lines.push('UDTRÆK TIL LÆGE');
  lines.push(`Beboer: ${resident.name} · Værelse ${resident.room}`);
  lines.push(`Udtræk genereret: ${fmtWhen(input.generatedAtIso)}`);
  lines.push('');
  lines.push('1. Formål');
  lines.push(
    'Kort helbredsmæssigt overblik: medicinliste og udvalgte journalnotater med relevans for somatik og behandling.'
  );
  lines.push('');
  lines.push('2. Medicin');
  lines.push(medList(input, true));
  lines.push('');
  lines.push('3. Borgerens egen besked i dag (Lys/check-in)');
  lines.push(checkinNote ? checkinNote : 'Ingen note registreret i dag.');
  lines.push('');
  lines.push('4. Udvalgte journalnotater (Medicin / Helbred / Observation, godkendte)');
  lines.push(formatJournalBlock(j));
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

export function buildPsychiatristExport(input: ResidentExportInput): string {
  const { resident, checkinNote, concernNotes } = input;
  const j = journalForPsych(input);
  const lines: string[] = [];
  lines.push('UDTRÆK TIL PSYKIATER');
  lines.push(`Beboer: ${resident.name} · Værelse ${resident.room}`);
  lines.push(`Udtræk genereret: ${fmtWhen(input.generatedAtIso)}`);
  lines.push('');
  lines.push('1. Formål');
  lines.push(
    'Overblik over psykisk trivsel, adfærd og samtaler — supplerende til journal og kriseplan.'
  );
  lines.push('');
  lines.push('2. Aktuel status (portal)');
  lines.push(`· Trafiklys: ${trafficDa(resident.trafficLight)}`);
  lines.push(
    `· Stemning (check-in): ${resident.moodScore !== null ? `${resident.moodScore}/10` : 'Ikke registreret'}`
  );
  lines.push(`· Seneste check-in vist i portal: ${resident.lastCheckin ?? '—'}`);
  lines.push('');
  lines.push('3. Borgerens egen besked (Lys/check-in)');
  lines.push(checkinNote ? checkinNote : 'Ingen note registreret i dag.');
  lines.push('');
  lines.push('4. Bekymringsnotater (hurtige notater fra personale)');
  if (concernNotes.length === 0) {
    lines.push('Ingen registrerede bekymringsnotater i udtrækket.');
  } else {
    lines.push(
      concernNotes
        .map(
          (c) =>
            `· [${fmtWhen(c.created_at)}] ${c.category} (alvor ${c.severity}/10) — ${c.staff_name}\n  ${c.note.trim()}`
        )
        .join('\n\n')
    );
  }
  lines.push('');
  lines.push('5. Udvalgte journalnotater (Stemning / Samtale / Hændelse / Observation)');
  lines.push(formatJournalBlock(j));
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

export function buildCaseworkerExport(input: ResidentExportInput): string {
  const { resident, checkinNote, concernNotes, todayPlanItems, pendingProposalsCount } = input;
  const approvedAll = input.journalEntries.filter(isApproved).slice(0, 25);
  const lines: string[] = [];
  lines.push('UDTRÆK TIL SAGSBEHANDLER');
  lines.push(`Beboer: ${resident.name} · Værelse ${resident.room}`);
  lines.push(`Udtræk genereret: ${fmtWhen(input.generatedAtIso)}`);
  lines.push('');
  lines.push('1. Formål');
  lines.push(
    'Samlet overblik over botilbud, netværk, plan og trivsel — til koordinering og myndighedskontakt.'
  );
  lines.push('');
  lines.push('2. Stamoplysninger');
  lines.push(`· Indflytning: ${resident.moveInDate ?? '—'}`);
  lines.push(
    `· Primær kontakt: ${resident.primaryContact ?? '—'}${resident.primaryContactRelation ? ` (${resident.primaryContactRelation})` : ''}`
  );
  lines.push(`· Telefon: ${resident.primaryContactPhone ?? '—'}`);
  lines.push('');
  lines.push('3. Aktuel trivsel (kort)');
  lines.push(`· Trafiklys: ${trafficDa(resident.trafficLight)}`);
  lines.push(
    `· Stemning (check-in): ${resident.moodScore !== null ? `${resident.moodScore}/10` : 'Ikke registreret'}`
  );
  lines.push(`· Seneste check-in: ${resident.lastCheckin ?? '—'}`);
  lines.push(`· Borgerens note i dag: ${checkinNote ? checkinNote : '—'}`);
  lines.push(
    `· Planforslag afventer godkendelse: ${pendingProposalsCount > 0 ? `${pendingProposalsCount} stk.` : 'Ingen'}`
  );
  lines.push('');
  lines.push('4. Dagsplan i dag (oversigt)');
  if (todayPlanItems.length === 0) {
    lines.push('Ingen planpunkter registreret for i dag.');
  } else {
    lines.push(
      todayPlanItems
        .map((p) => `· ${p.done ? '[✓] ' : '[ ] '}${p.title}${p.time ? ` (${p.time})` : ''}`)
        .join('\n')
    );
  }
  lines.push('');
  lines.push('5. Medicin (oversigt — ikke doseringsinstruks)');
  lines.push(medList(input, false));
  lines.push('');
  lines.push('6. Bekymringsnotater');
  if (concernNotes.length === 0) {
    lines.push('Ingen i udtrækket.');
  } else {
    lines.push(
      concernNotes
        .map(
          (c) =>
            `· [${fmtWhen(c.created_at)}] ${c.category} (${c.severity}/10) — ${c.staff_name}\n  ${c.note.trim()}`
        )
        .join('\n\n')
    );
  }
  lines.push('');
  lines.push('7. Seneste godkendte journalnotater (uddrag, op til 25)');
  lines.push(formatJournalBlock(approvedAll));
  lines.push(DISCLAIMER);
  return lines.join('\n');
}

export function buildResidentExport(
  audience: 'laege' | 'psykiater' | 'sagsbehandler',
  input: ResidentExportInput
): string {
  if (audience === 'laege') return buildDoctorExport(input);
  if (audience === 'psykiater') return buildPsychiatristExport(input);
  return buildCaseworkerExport(input);
}
