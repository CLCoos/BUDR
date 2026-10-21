import { NextResponse } from 'next/server';
import { requireStaff } from '@/app/api/portal/documents/_auth';
import { residentLabel } from '@/lib/assistant/names';
import { loadResidents, loadStaffName } from '@/lib/assistant/server';
import { shiftYmd } from '@/lib/assistant/actions';
import { copenhagenStartOfDateUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { anchorHandoverShiftDate, handoverRecordDate, handoverShiftNow } from '@/lib/handoverNotes';
import { PERMISSIONS } from '@/lib/permissions';
import {
  SHIFT_NAMES,
  lysConcerns,
  previousHandovers,
  type CheckinRow,
  type HandoverRow,
} from '@/lib/vagt';

/**
 * GET /api/portal/vagt — alt hvad forsiden «Vagten» skal bruge, med medarbejderens egen
 * klient (RLS). Hver del fejler for sig: mangler en tabel, er den del bare tom.
 */
export async function GET() {
  const ctx = await requireStaff(PERMISSIONS.VIEW_DASHBOARD);
  if ('error' in ctx) return ctx.error;
  const { supabase, orgId, user } = ctx;

  const now = new Date();
  const today = copenhagenYmd(now);
  const shift = handoverShiftNow(now);
  const shiftDate = handoverRecordDate(shift, now);
  const since16h = new Date(now.getTime() - 16 * 60 * 60 * 1000).toISOString();
  const todayStart = copenhagenStartOfDateUtcIso(today);
  const tomorrowStart = copenhagenStartOfDateUtcIso(shiftYmd(today, 1));

  const [residents, staffName, handoverRes, lysRes, tasksRes, plannerRes, draftsRes] =
    await Promise.all([
      loadResidents(supabase, orgId),
      loadStaffName(supabase, user.id),
      supabase
        .from('care_handover_notes')
        .select('resident_id, shift_label, shift_date, body, flag_color, updated_at')
        .eq('org_id', orgId)
        .gte('shift_date', shiftYmd(today, -1))
        .order('updated_at', { ascending: false })
        .limit(200),
      supabase
        .from('lys_checkin')
        .select('resident_id, traffic_light, mood_score, created_at')
        .eq('org_id', orgId)
        .gte('created_at', since16h)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('care_staff_tasks')
        .select('id, resident_id, title, deadline, priority, status, assigned_to')
        .eq('org_id', orgId)
        .neq('status', 'afsluttet')
        .lte('deadline', today)
        .order('deadline', { ascending: true })
        .limit(30),
      supabase
        .from('care_planner_entries')
        .select('id, title, category, starts_at, resident_user_id, location, responsible')
        .eq('org_id', orgId)
        .gte('starts_at', todayStart)
        .lt('starts_at', tomorrowStart)
        .order('starts_at', { ascending: true })
        .limit(30),
      supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('journal_status', 'kladde')
        .gte('created_at', todayStart),
    ]);

  for (const [name, res] of Object.entries({
    handover: handoverRes,
    lys: lysRes,
    tasks: tasksRes,
    planner: plannerRes,
    drafts: draftsRes,
  })) {
    if (res.error) console.error(`[vagt] ${name}:`, res.error.message);
  }

  const nameOf = new Map(residents.map((r) => [r.user_id, residentLabel(r)]));
  const label = (id: string | null) => (id ? (nameOf.get(id) ?? 'Borger') : null);

  const handoverRows = (handoverRes.data ?? []) as HandoverRow[];
  const handovers = previousHandovers(handoverRows, { shiftDate, shiftLabel: shift });
  const writtenThisShift = new Set(
    handoverRows
      .filter(
        (r) =>
          anchorHandoverShiftDate(r.shift_date, r.shift_label, r.updated_at) === shiftDate &&
          r.shift_label === shift &&
          r.body.trim()
      )
      .map((r) => r.resident_id)
  );

  type TaskRow = {
    id: string;
    resident_id: string | null;
    title: string;
    deadline: string;
    priority: string;
    status: string;
    assigned_to: string | null;
  };
  type PlannerRow = {
    id: string;
    title: string;
    category: string;
    starts_at: string;
    resident_user_id: string | null;
    location: string | null;
    responsible: string | null;
  };

  return NextResponse.json({
    staffFirstName: staffName.split(/\s+/)[0] ?? staffName,
    shift,
    shiftName: SHIFT_NAMES[shift],
    today,
    residentsTotal: residents.length,
    handovers: handovers.slice(0, 12).map((h) => ({
      residentId: h.resident_id,
      name: label(h.resident_id),
      body: h.body.trim(),
      flag: h.flag_color,
      shiftLabel: h.shift_label,
      shiftDate: h.shift_date,
    })),
    lysConcerns: lysConcerns((lysRes.data ?? []) as CheckinRow[])
      .slice(0, 8)
      .map((c) => ({
        residentId: c.resident_id,
        name: label(c.resident_id),
        traffic: c.traffic_light,
        mood: c.mood_score,
        at: c.created_at,
      })),
    tasks: ((tasksRes.data ?? []) as TaskRow[]).map((t) => ({
      id: t.id,
      title: t.title,
      residentId: t.resident_id,
      name: label(t.resident_id),
      deadline: String(t.deadline).slice(0, 10),
      overdue: String(t.deadline).slice(0, 10) < today,
      priority: t.priority,
      assignedTo: t.assigned_to,
    })),
    appointments: ((plannerRes.data ?? []) as PlannerRow[]).map((p) => ({
      id: p.id,
      title: p.title,
      at: p.starts_at,
      residentId: p.resident_user_id,
      name: label(p.resident_user_id),
      location: p.location ?? '',
    })),
    myDraftsToday: draftsRes.count ?? 0,
    handoverWrittenCount: writtenThisShift.size,
  });
}
