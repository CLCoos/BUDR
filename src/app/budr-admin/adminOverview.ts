import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type OrgAdminOverviewRow = {
  orgId: string;
  name: string;
  createdAt: string;
  deactivatedAt: string | null;
  residentCount: number;
  staffCount: number;
  latestAuditAt: string | null;
  activitySeries: OrgActivityPoint[];
};

export type IncompleteUserRow = {
  userId: string;
  email: string;
  orgId: string | null;
  issue: 'missing_org_id' | 'org_not_found' | 'no_care_staff_row';
};

export type OrgOption = { id: string; name: string };
export type RoleOption = { id: string; orgId: string; name: string };

export type OrgActivityPoint = {
  date: string;
  label: string;
  journalEntries: number;
  checkIns: number;
  logins: number;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function buildRecentDayBuckets(days: number): Array<{ key: string; label: string }> {
  const rows: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit' }).format(d);
    rows.push({ key, label });
  }
  return rows;
}

function getAuditBucket(action: string): 'journalEntries' | 'checkIns' | 'logins' | null {
  const lower = action.toLowerCase();
  if (lower.includes('journal')) return 'journalEntries';
  if (lower.includes('checkin') || lower.includes('check-in') || lower.includes('daily_checkin')) {
    return 'checkIns';
  }
  if (lower.includes('login')) return 'logins';
  return null;
}

export async function getBudrAdminOverview(): Promise<{
  rows: OrgAdminOverviewRow[];
  incompleteUsers: IncompleteUserRow[];
  orgOptions: OrgOption[];
  roleOptions: RoleOption[];
  error: string | null;
}> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      rows: [],
      incompleteUsers: [],
      orgOptions: [],
      roleOptions: [],
      error: 'Supabase service role mangler. Kan ikke hente organisations-overblik.',
    };
  }

  const { data: orgs, error: orgError } = await admin
    .from('organisations')
    .select('id,name,slug,created_at,deactivated_at')
    .order('created_at', { ascending: false });

  if (orgError) {
    return {
      rows: [],
      incompleteUsers: [],
      orgOptions: [],
      roleOptions: [],
      error: orgError.message,
    };
  }

  const orgIds = (orgs ?? []).map((org) => org.id);
  const dayBuckets = buildRecentDayBuckets(30);
  const since = `${dayBuckets[0]?.key ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const activityIndex = new Map<string, Map<string, OrgActivityPoint>>();

  if (orgIds.length > 0) {
    const { data: auditRows } = await admin
      .from('audit_logs')
      .select('actor_org_id,action,created_at')
      .in('actor_org_id', orgIds)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    for (const orgId of orgIds) {
      const perDay = new Map<string, OrgActivityPoint>();
      for (const day of dayBuckets) {
        perDay.set(day.key, {
          date: day.key,
          label: day.label,
          journalEntries: 0,
          checkIns: 0,
          logins: 0,
        });
      }
      activityIndex.set(orgId, perDay);
    }

    for (const row of auditRows ?? []) {
      if (!row.actor_org_id || !row.created_at || !row.action) continue;
      const dayKey = row.created_at.slice(0, 10);
      const bucket = getAuditBucket(row.action);
      if (!bucket) continue;
      const orgMap = activityIndex.get(row.actor_org_id);
      const dayPoint = orgMap?.get(dayKey);
      if (!dayPoint) continue;
      dayPoint[bucket] += 1;
    }
  }

  const rows = await Promise.all(
    (orgs ?? []).map(async (org) => {
      const [residentResult, staffResult, auditResult] = await Promise.all([
        admin
          .from('care_residents')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id),
        admin.from('care_staff').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
        admin
          .from('audit_logs')
          .select('created_at')
          .eq('actor_org_id', org.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        orgId: org.id,
        name: org.name,
        createdAt: org.created_at,
        deactivatedAt: org.deactivated_at ?? null,
        residentCount: residentResult.count ?? 0,
        staffCount: staffResult.count ?? 0,
        latestAuditAt: auditResult.data?.created_at ?? null,
        activitySeries: Array.from(activityIndex.get(org.id)?.values() ?? []),
      } satisfies OrgAdminOverviewRow;
    })
  );

  const orgOptions: OrgOption[] = (orgs ?? []).map((org) => ({ id: org.id, name: org.name }));
  const { data: rolesData } = await admin
    .from('org_roles')
    .select('id,org_id,name')
    .order('name', { ascending: true });
  const roleOptions: RoleOption[] = (rolesData ?? []).map((role) => ({
    id: role.id,
    orgId: role.org_id,
    name: role.name,
  }));

  const usersResult = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = usersResult.data.users ?? [];
  const userIds = users.map((u) => u.id);
  const { data: staffRows } = await admin
    .from('care_staff')
    .select('id,org_id')
    .in('id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
  const staffIndex = new Map((staffRows ?? []).map((row) => [row.id, row.org_id]));
  const orgIdSet = new Set((orgs ?? []).map((org) => org.id));

  const incompleteUsers: IncompleteUserRow[] = [];
  for (const user of users) {
    const email = user.email ?? '(ingen email)';
    const metadataOrgId =
      typeof user.user_metadata?.org_id === 'string' ? user.user_metadata.org_id : null;
    if (!metadataOrgId) {
      incompleteUsers.push({ userId: user.id, email, orgId: null, issue: 'missing_org_id' });
      continue;
    }
    if (!orgIdSet.has(metadataOrgId)) {
      incompleteUsers.push({
        userId: user.id,
        email,
        orgId: metadataOrgId,
        issue: 'org_not_found',
      });
      continue;
    }
    const staffOrgId = staffIndex.get(user.id) ?? null;
    if (staffOrgId !== metadataOrgId) {
      incompleteUsers.push({
        userId: user.id,
        email,
        orgId: metadataOrgId,
        issue: 'no_care_staff_row',
      });
    }
  }

  return { rows, incompleteUsers, orgOptions, roleOptions, error: null };
}
