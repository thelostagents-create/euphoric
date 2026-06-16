-- Euphoric — fix group-chat RLS so membership checks don't recurse.
-- The original "groups read" / "group_members read" policies queried
-- group_members from within a group_members policy, which Postgres rejects as
-- infinite recursion. Route the check through a SECURITY DEFINER helper (which
-- bypasses RLS inside the function) instead. Run in the SQL editor.

create or replace function is_group_member(g uuid) returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (select 1 from group_members gm where gm.group_id = g and gm.user_id = auth.uid());
$$;

drop policy if exists "groups read" on groups;
create policy "groups read" on groups for select using (is_group_member(id) or created_by = auth.uid());

drop policy if exists "group_members read" on group_members;
create policy "group_members read" on group_members for select using (is_group_member(group_id) or user_id = auth.uid());

grant execute on function is_group_member(uuid) to authenticated;
