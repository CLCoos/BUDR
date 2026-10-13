/**
 * Stemningstekst til overrapport / tilsynsrapport.
 *
 * Lys gemmer `mood_score` som `selected + 1` (index 0 = Fantastisk → score 1).
 * Overrapport/tilsyn brugte en 1–5-skala hvor 1 = «Svært» og 5 = «Fantastisk».
 * Det inverterede etiketten: en god dag blev «Svært» og en svær dag «Fantastisk».
 *
 * Brug derfor den gemte `mood_label` — udled aldrig etiketten fra scoren.
 */

const ATTENTION_LABELS = new Set(['Meget svært', 'Svært', 'Lidt tungt', 'Dårligt', 'Tung']);

export function resolveCheckinMoodLabel(moodLabel: string | null | undefined): string | null {
  if (typeof moodLabel !== 'string') return null;
  const trimmed = moodLabel.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function moodLabelFromCheckin(
  row:
    | {
        mood_label?: string | null;
        mood_score?: number | null;
      }
    | null
    | undefined
): string | null {
  void row?.mood_score;
  return resolveCheckinMoodLabel(row?.mood_label);
}

export function moodLabelNeedsAttention(label: string | null | undefined): boolean {
  const resolved = resolveCheckinMoodLabel(label);
  return resolved !== null && ATTENTION_LABELS.has(resolved);
}

/** Etiket til 1–10-slideren (1 = værst). Bruges kun når UI'et selv er 1–10. */
export function moodLabelFromTenPointScore(score: number): string {
  if (score <= 2) return 'Meget svært';
  if (score <= 3) return 'Svært';
  if (score <= 4) return 'Lidt tungt';
  if (score <= 6) return 'Okay';
  if (score <= 8) return 'Godt';
  return 'Fantastisk';
}
