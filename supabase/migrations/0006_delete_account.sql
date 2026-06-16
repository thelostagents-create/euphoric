-- Euphoric — let a signed-in user delete their own account.
-- Deleting the auth.users row cascades to profiles (FK on delete cascade) and
-- from there to servers, members, messages, follows, etc. Runs SECURITY
-- DEFINER because the client can't touch auth.users directly. Run in the SQL
-- editor.

create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = uid;
end;
$$;

grant execute on function delete_account() to authenticated;
