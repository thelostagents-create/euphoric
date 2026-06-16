-- Euphoric — reports + developer server verification.
-- Adds a reports table for users to flag content, readable only by developers,
-- and lets developers update any server row (so they can toggle `verified`).
-- Run in the SQL editor. Requires is_developer() from 0008.

-- 1) Reports table.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('user', 'message', 'server')),
  target_id text not null,
  reason text not null,
  context text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reports_created_idx on reports (created_at desc);

alter table reports enable row level security;

-- Anyone signed in can file a report as themselves.
drop policy if exists "reports insert" on reports;
create policy "reports insert" on reports for insert
  with check (reporter_id = auth.uid());

-- Only developers can read/triage reports.
drop policy if exists "reports read" on reports;
create policy "reports read" on reports for select
  using (is_developer());

drop policy if exists "reports update" on reports;
create policy "reports update" on reports for update
  using (is_developer())
  with check (is_developer());

-- 2) Let developers update any server (covers verifying parties). Keeps the
-- existing manage-permission paths intact.
drop policy if exists "servers update" on servers;
create policy "servers update" on servers for update
  using (
    is_developer()
    or has_perm(id, 'MANAGE_SERVER')
    or has_perm(id, 'MANAGE_AUTOMOD')
    or has_perm(id, 'MANAGE_ONBOARDING')
  )
  with check (
    is_developer()
    or has_perm(id, 'MANAGE_SERVER')
    or has_perm(id, 'MANAGE_AUTOMOD')
    or has_perm(id, 'MANAGE_ONBOARDING')
  );

-- 3) Let developers read any server so they can find and verify parties.
drop policy if exists "servers read" on servers;
create policy "servers read" on servers for select
  using (discoverable or is_member(id) or is_developer());

-- 4) RPC: developers can set any user's subscription tier. The Patreon webhook
-- still owns automatic changes; this is a manual override / comp for staff.
create or replace function set_user_tier(p_user uuid, p_tier text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_developer() then
    raise exception 'only developers may set tiers';
  end if;
  if p_tier not in ('free', 'premium', 'supernova', 'developer') then
    raise exception 'invalid tier';
  end if;
  update profiles set tier = p_tier where id = p_user;
end;
$$;
grant execute on function set_user_tier(uuid, text) to authenticated;
