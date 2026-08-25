-- AI-briefs: mønstergenkendelse i borgerdata, vist i 360-view.
-- Anvendt manuelt på staging 2026-05-29 12:41:10 UTC. Denne fil sporer
-- ændringen i git, så staging og prod kan holdes i sync fremadrettet.

create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.care_residents(user_id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  brief_type text not null default 'daily' check (brief_type in ('daily','weekly')),
  lead text not null,
  bullets jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  source_window_start date,
  source_window_end date,
  model text not null default 'claude-haiku-4-5-20251001',
  created_at timestamptz not null default now()
);

alter table public.ai_briefs enable row level security;

create index if not exists ai_briefs_resident_idx on public.ai_briefs (resident_id, created_at desc);
create index if not exists ai_briefs_org_idx on public.ai_briefs (org_id);

drop policy if exists ai_briefs_staff_select_own_org on public.ai_briefs;
create policy ai_briefs_staff_select_own_org on public.ai_briefs
  for select using (org_id = (select cs.org_id from public.care_staff cs where cs.id = auth.uid()));

drop policy if exists ai_briefs_staff_insert_own_org on public.ai_briefs;
create policy ai_briefs_staff_insert_own_org on public.ai_briefs
  for insert with check (org_id = (select cs.org_id from public.care_staff cs where cs.id = auth.uid()));

drop policy if exists ai_briefs_staff_update_own_org on public.ai_briefs;
create policy ai_briefs_staff_update_own_org on public.ai_briefs
  for update using (org_id = (select cs.org_id from public.care_staff cs where cs.id = auth.uid()))
  with check (org_id = (select cs.org_id from public.care_staff cs where cs.id = auth.uid()));

drop policy if exists ai_briefs_staff_delete_own_org on public.ai_briefs;
create policy ai_briefs_staff_delete_own_org on public.ai_briefs
  for delete using (org_id = (select cs.org_id from public.care_staff cs where cs.id = auth.uid()));
