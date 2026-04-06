import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import DailyPlanView from '@/components/lys/DailyPlanView';
import type { DailyPlan, PendingProposal } from '@/components/lys/DailyPlanView';
import { buildSimulatedStaffDailyPlan, isLysDemoResidentId } from '@/lib/lysDemoResident';

async function fetchDayData(residentId: string): Promise<{
  plan: DailyPlan | null;
  pendingProposal: PendingProposal | null;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const today = new Date().toISOString().slice(0, 10);

  const [planRes, proposalRes] = await Promise.all([
    supabase
      .from('daily_plans')
      .select('id, plan_date, plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle(),
    supabase
      .from('plan_proposals')
      .select('id, plan_date, proposed_items, ai_reasoning')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    plan: (planRes.data as DailyPlan | null) ?? null,
    pendingProposal: (proposalRes.data as PendingProposal | null) ?? null,
  };
}

export default async function DagPage() {
  const residentId = await getResidentId();
  if (!residentId) redirect('/');

  const { plan, pendingProposal } = await fetchDayData(residentId);
  const today = new Date().toISOString().slice(0, 10);
  const effectivePlan: DailyPlan | null =
    plan && Array.isArray(plan.plan_items) && plan.plan_items.length > 0
      ? plan
      : isLysDemoResidentId(residentId)
        ? buildSimulatedStaffDailyPlan(today)
        : plan;

  return (
    <DailyPlanView residentId={residentId} plan={effectivePlan} pendingProposal={pendingProposal} />
  );
}
