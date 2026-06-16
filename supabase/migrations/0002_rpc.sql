-- Euphoric — RPCs that create/join parties in a single round-trip.
-- These run SECURITY DEFINER (as the function owner), so they don't depend on
-- per-table INSERT policies all agreeing on auth.uid(). They still read
-- auth.uid() themselves, so ownership stays correct and unauthenticated calls
-- fail loudly instead of returning an opaque 403. Run in the SQL editor.

-- Create a party (server + @everyone role + #general lounge + owner member).
create or replace function create_party(p_name text, p_icon text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  srv_id uuid;
  role_id uuid;
  inv text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Make sure a profile row exists (FKs depend on it) even if the
  -- signup trigger hasn't run yet.
  insert into profiles (id, username)
  values (uid, 'user_' || substr(uid::text, 1, 6))
  on conflict (id) do nothing;

  inv := substr(md5(random()::text), 1, 6);

  insert into servers (name, icon, owner_id, invite)
  values (coalesce(nullif(trim(p_name), ''), 'New Party'), coalesce(nullif(p_icon, ''), '✨'), uid, inv)
  returning id into srv_id;

  insert into roles (server_id, name, color, position)
  values (srv_id, '@everyone', '#9aa0b4', 0)
  returning id into role_id;

  insert into channels (server_id, name, position)
  values (srv_id, 'general', 0);

  insert into members (server_id, user_id, role_ids)
  values (srv_id, uid, array[role_id]);

  return srv_id;
end;
$$;

-- Join a party by id, attaching the @everyone role.
create or replace function join_party(p_server uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into profiles (id, username)
  values (uid, 'user_' || substr(uid::text, 1, 6))
  on conflict (id) do nothing;

  select id into role_id from roles where server_id = p_server and name = '@everyone' limit 1;

  insert into members (server_id, user_id, role_ids)
  values (p_server, uid, case when role_id is null then '{}'::uuid[] else array[role_id] end)
  on conflict (server_id, user_id) do nothing;
end;
$$;

grant execute on function create_party(text, text) to authenticated;
grant execute on function join_party(uuid) to authenticated;
