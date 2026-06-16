-- Euphoric — developer tier.
-- Developers can ban anyone from any party and automatically grant 20 boosts
-- to parties they're in (the boost is computed client-side). This migration
-- allows the new tier value, lets developers manage any member row via RLS,
-- and grants the tier to the app owner. Run in the SQL editor.

-- 1) Allow 'developer' as a tier value.
alter table profiles drop constraint if exists profiles_tier_check;
alter table profiles add constraint profiles_tier_check
  check (tier in ('free', 'premium', 'supernova', 'developer'));

-- 2) Helper: is the caller a developer?
create or replace function is_developer() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and tier = 'developer');
$$;
grant execute on function is_developer() to authenticated;

-- 3) Let developers manage any member row (kick/ban/timeout anywhere).
drop policy if exists "members self" on members;
create policy "members self" on members for all
  using (
    user_id = auth.uid()
    or is_developer()
    or has_perm(server_id, 'KICK_MEMBERS')
    or has_perm(server_id, 'BAN_MEMBERS')
    or has_perm(server_id, 'TIMEOUT_MEMBERS')
    or has_perm(server_id, 'MANAGE_ROLES')
  )
  with check (
    user_id = auth.uid()
    or is_developer()
    or has_perm(server_id, 'KICK_MEMBERS')
    or has_perm(server_id, 'BAN_MEMBERS')
    or has_perm(server_id, 'TIMEOUT_MEMBERS')
    or has_perm(server_id, 'MANAGE_ROLES')
  );

-- 4) Make the app owner a developer.
update profiles
set tier = 'developer'
where id in (select id from auth.users where email = 'thelostagents@gmail.com');
