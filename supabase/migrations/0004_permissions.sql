-- Euphoric — make server writes permission-based instead of owner-only.
-- Adds SECURITY DEFINER helpers that check the caller's effective permissions
-- (owner, or a role that grants the permission) and rewrites the roles /
-- channels / servers / members policies to use them. Run in the SQL editor.

create or replace function is_owner(srv uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from servers s where s.id = srv and s.owner_id = auth.uid());
$$;

-- Does the caller hold a role in `srv` granting permission `perm`? Owner always does.
create or replace function has_perm(srv uuid, perm text) returns boolean
language sql security definer stable set search_path = public as $$
  select is_owner(srv) or exists (
    select 1
    from members m
    join roles r on r.server_id = m.server_id and r.id = any (m.role_ids)
    where m.server_id = srv and m.user_id = auth.uid() and not m.banned
      and perm = any (r.permissions)
  );
$$;

grant execute on function is_owner(uuid) to authenticated;
grant execute on function has_perm(uuid, text) to authenticated;

-- Roles: manage with MANAGE_ROLES (or owner).
drop policy if exists "roles write" on roles;
create policy "roles write" on roles for all
  using (has_perm(server_id, 'MANAGE_ROLES'))
  with check (has_perm(server_id, 'MANAGE_ROLES'));

-- Channels: manage with MANAGE_CHANNELS (or owner).
drop policy if exists "channels write" on channels;
create policy "channels write" on channels for all
  using (has_perm(server_id, 'MANAGE_CHANNELS'))
  with check (has_perm(server_id, 'MANAGE_CHANNELS'));

-- Servers: settings/automod/onboarding with MANAGE_SERVER (or owner). Delete
-- stays owner-only.
drop policy if exists "servers update" on servers;
create policy "servers update" on servers for update
  using (has_perm(id, 'MANAGE_SERVER') or has_perm(id, 'MANAGE_AUTOMOD') or has_perm(id, 'MANAGE_ONBOARDING'))
  with check (has_perm(id, 'MANAGE_SERVER') or has_perm(id, 'MANAGE_AUTOMOD') or has_perm(id, 'MANAGE_ONBOARDING'));

-- Members: you can always manage your own row (join/leave); moderators with
-- kick/ban/timeout or MANAGE_ROLES can manage other members' rows.
drop policy if exists "members self" on members;
create policy "members self" on members for all
  using (
    user_id = auth.uid()
    or has_perm(server_id, 'KICK_MEMBERS')
    or has_perm(server_id, 'BAN_MEMBERS')
    or has_perm(server_id, 'TIMEOUT_MEMBERS')
    or has_perm(server_id, 'MANAGE_ROLES')
  )
  with check (
    user_id = auth.uid()
    or has_perm(server_id, 'KICK_MEMBERS')
    or has_perm(server_id, 'BAN_MEMBERS')
    or has_perm(server_id, 'TIMEOUT_MEMBERS')
    or has_perm(server_id, 'MANAGE_ROLES')
  );
