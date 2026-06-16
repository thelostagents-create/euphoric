-- Euphoric — join a party by invite code.
-- Non-members can't read a private (non-discoverable) party under RLS, so they
-- can't look it up by invite from the client. This SECURITY DEFINER function
-- resolves the code server-side and adds the membership. Run in the SQL editor.

create or replace function join_party_by_invite(p_invite text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  srv uuid;
  role_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select id into srv from servers where lower(invite) = lower(trim(p_invite)) limit 1;
  if srv is null then return null; end if;

  insert into profiles (id, username)
  values (uid, 'user_' || substr(uid::text, 1, 6))
  on conflict (id) do nothing;

  select id into role_id from roles where server_id = srv and name = '@everyone' limit 1;

  insert into members (server_id, user_id, role_ids)
  values (srv, uid, case when role_id is null then '{}'::uuid[] else array[role_id] end)
  on conflict (server_id, user_id) do nothing;

  return srv;
end;
$$;

grant execute on function join_party_by_invite(text) to authenticated;
