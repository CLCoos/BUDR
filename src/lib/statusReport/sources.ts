import type { SupabaseClient } from '@supabase/supabase-js';
import { VUM_THEMES } from '@/lib/vum/vumThemes';
import { parseThemePayload, themeColumnForNumber, type VumGoal } from '@/lib/vum/vumTypes';
import type { StatusReportSources } from './types';

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

/** Første og sidste øjeblik i perioden (inkl. hele slutdagen), som ISO. */
function periodBounds(periodStart: string, periodEnd: string): { from: string; to: string } {
  const to = new Date(`${periodEnd}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from: `${periodStart}T00:00:00Z`, to: to.toISOString() };
}

/**
 * Henter kildemateriale til en statusudtalelse med brugerens egen Supabase-klient (RLS gælder).
 * Kun godkendte journalnotater; aldrig kladder eller borgerens private noter.
 */
export async function collectStatusReportSources(
  supabase: SupabaseClient,
  args: { residentId: string; orgId: string; periodStart: string; periodEnd: string }
): Promise<StatusReportSources> {
  const { residentId, orgId, periodStart, periodEnd } = args;
  const { from, to } = periodBounds(periodStart, periodEnd);

  const [residentRes, vumRes, stepsRes, journalRes, checkinRes, concernRes, crisisRes, medRes] =
    await Promise.all([
      supabase
        .from('care_residents')
        .select('first_name, last_name, display_name, nickname')
        .eq('user_id', residentId)
        .maybeSingle(),
      supabase
        .from('vum_assessments')
        .select('*')
        .eq('resident_id', residentId)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('lys_next_steps')
        .select(
          'title, description, status, target_date, resident_note, staff_note, completed_at, created_at, updated_at'
        )
        .eq('resident_id', residentId)
        .or(`status.eq.aktiv,updated_at.gte.${from}`)
        .order('created_at', { ascending: true })
        .limit(40),
      supabase
        .from('journal_entries')
        .select('created_at, category, entry_text')
        .eq('resident_id', residentId)
        .eq('org_id', orgId)
        .eq('journal_status', 'godkendt')
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: true })
        .limit(600),
      supabase
        .from('lys_checkin')
        .select('created_at, mood_score, traffic_light, free_text')
        .eq('resident_id', residentId)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: true })
        .limit(1000),
      supabase
        .from('care_concern_notes')
        .select('created_at, category, severity, note')
        .eq('resident_id', residentId)
        .gte('created_at', from)
        .lt('created_at', to)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('crisis_alerts')
        .select('triggered_at, trin, status, notes')
        .eq('resident_id', residentId)
        .gte('triggered_at', from)
        .lt('triggered_at', to)
        .order('triggered_at', { ascending: true })
        .limit(50),
      supabase
        .from('resident_medications')
        .select('name, dose, frequency, status, created_at')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: true })
        .limit(60),
    ]);

  const r = (residentRes.data ?? {}) as Record<string, string | null>;
  const residentNames = [r.first_name, r.last_name, r.display_name, r.nickname].filter(
    (n): n is string => typeof n === 'string' && n.trim().length > 0
  );

  let vum: StatusReportSources['vum'] = null;
  if (vumRes.data) {
    const row = vumRes.data as Record<string, unknown>;
    const themes = VUM_THEMES.map((theme) => {
      const col = themeColumnForNumber(theme.number);
      const payload = parseThemePayload(col ? row[col] : null);
      const answers = Object.values(payload.inspiration ?? {}).filter((a) => a.trim());
      return {
        number: theme.number,
        title: theme.title,
        categoryLabel: theme.categoryLabel,
        level: payload.level,
        notes: payload.notes?.trim() || undefined,
        answers,
      };
    }).filter((t) => t.level !== undefined || t.notes || t.answers.length > 0);
    vum = {
      casePurpose: typeof row.case_purpose === 'string' ? row.case_purpose : null,
      referralSource: typeof row.referral_source === 'string' ? row.referral_source : null,
      themes,
      goals: Array.isArray(row.goals) ? (row.goals as VumGoal[]) : [],
    };
  }

  type StepRow = {
    title: string;
    description: string | null;
    status: string;
    target_date: string | null;
    resident_note: string | null;
    staff_note: string | null;
    completed_at: string | null;
  };

  return {
    periodStart,
    periodEnd,
    residentNames,
    vum,
    nextSteps: ((stepsRes.data ?? []) as StepRow[]).map((s) => ({
      title: s.title,
      description: s.description,
      status: s.status,
      targetDate: s.target_date,
      residentNote: s.resident_note,
      staffNote: s.staff_note,
      completedAt: s.completed_at,
    })),
    journal: (
      (journalRes.data ?? []) as { created_at: string; category: string; entry_text: string }[]
    ).map((j) => ({ date: ymd(j.created_at), category: j.category, text: j.entry_text })),
    checkins: (
      (checkinRes.data ?? []) as {
        created_at: string;
        mood_score: number;
        traffic_light: string | null;
        free_text: string | null;
      }[]
    ).map((c) => ({
      date: ymd(c.created_at),
      mood: c.mood_score,
      trafficLight: c.traffic_light,
      text: c.free_text,
    })),
    concerns: (
      (concernRes.data ?? []) as {
        created_at: string;
        category: string;
        severity: number;
        note: string;
      }[]
    ).map((c) => ({
      date: ymd(c.created_at),
      category: c.category,
      severity: c.severity,
      note: c.note,
    })),
    crises: (
      (crisisRes.data ?? []) as {
        triggered_at: string;
        trin: number;
        status: string;
        notes: string | null;
      }[]
    ).map((c) => ({ date: ymd(c.triggered_at), trin: c.trin, status: c.status, notes: c.notes })),
    medications: (
      (medRes.data ?? []) as {
        name: string;
        dose: string;
        frequency: string;
        status: string;
        created_at: string | null;
      }[]
    ).map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      status: m.status,
      since: m.created_at,
    })),
  };
}

/** Har vi overhovedet noget at skrive ud fra? */
export function hasAnySource(src: StatusReportSources): boolean {
  return Boolean(
    src.vum ||
    src.nextSteps.length ||
    src.journal.length ||
    src.checkins.length ||
    src.concerns.length ||
    src.crises.length
  );
}
