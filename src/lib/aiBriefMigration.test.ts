import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260621110500_ai_briefs_schema_rls.sql'),
  'utf8'
);

function compactSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').toLowerCase();
}

describe('ai_briefs migration', () => {
  const sql = compactSql(migration);

  it('creates the ai_briefs table used by brief generation and Resident 360', () => {
    expect(sql).toContain('create table if not exists public.ai_briefs');
    expect(sql).toContain('resident_id uuid not null references public.care_residents(user_id)');
    expect(sql).toContain('org_id uuid not null references public.organisations(id)');
    expect(sql).toContain("brief_type text not null check (brief_type in ('daily', 'weekly'))");
    expect(sql).toContain("bullets jsonb not null default '[]'::jsonb");
    expect(sql).toContain("actions jsonb not null default '[]'::jsonb");
  });

  it('enables tenant-scoped staff RLS without broad authenticated writes', () => {
    expect(sql).toContain('alter table public.ai_briefs enable row level security');
    expect(sql).toContain('create policy ai_briefs_staff_select_org');
    expect(sql).toContain('create policy ai_briefs_staff_insert_org');
    expect(sql).toContain('public.care_staff_can_access_resident(resident_id::text)');
    expect(sql).toContain('cr.user_id = ai_briefs.resident_id');
    expect(sql).toContain('cr.org_id = ai_briefs.org_id');
    expect(sql).toContain('grant select, insert on public.ai_briefs to authenticated');
    expect(sql).not.toMatch(/grant\s+(all|update|delete)/);
    expect(sql).not.toContain('using (true)');
    expect(sql).not.toContain('with check (true)');
  });
});
