const CATEGORY = 'Lys journal';

export type VoiceJournalAiPayload = {
  journal_note: string;
  recovery_story: string;
};

function stripJsonFences(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  return t;
}

/** Parse Anthropic JSON for PARK voice-journal. Returns null if incomplete. */
export function parseVoiceJournalAiJson(raw: string): VoiceJournalAiPayload | null {
  try {
    const parsed = JSON.parse(stripJsonFences(raw)) as Record<string, unknown>;
    const journal_note = typeof parsed.journal_note === 'string' ? parsed.journal_note.trim() : '';
    const recovery_story =
      typeof parsed.recovery_story === 'string' ? parsed.recovery_story.trim() : '';
    if (!journal_note || !recovery_story) return null;
    return { journal_note, recovery_story };
  } catch {
    return null;
  }
}

/**
 * Response shape for Lys Journal «Lav PARK-udkast».
 * `content` is an alias of `journal_note` so the client preview is not blank.
 */
export function voiceJournalClientPayload(
  parsed: VoiceJournalAiPayload,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    journal_note: parsed.journal_note,
    recovery_story: parsed.recovery_story,
    content: parsed.journal_note,
    ...extra,
  };
}

/** Insert fields for an unreviewed PARK draft — never silently `godkendt`. */
export function lysVoiceJournalInsertFields(opts: {
  residentId: string;
  staffName: string;
  entryText: string;
  orgId: string | null;
}): Record<string, unknown> {
  return {
    resident_id: opts.residentId,
    staff_id: null,
    staff_name: opts.staffName,
    entry_text: opts.entryText,
    category: CATEGORY,
    journal_status: 'kladde',
    approved_at: null,
    approved_by: null,
    org_id: opts.orgId,
  };
}

export function missingJournalColumn(message: string | undefined, column: string): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes(column.toLowerCase()) && (m.includes('does not exist') || m.includes('schema cache'))
  );
}

export const LYS_VOICE_JOURNAL_CATEGORY = CATEGORY;
