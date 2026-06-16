-- Euphoric — reactions & pins via RPC.
-- Reacting to or pinning a message updates a row the caller usually doesn't
-- own, which the author-only "messages update" policy forbids. These
-- SECURITY DEFINER functions perform just those edits safely. Run in the SQL
-- editor.

-- Toggle the caller's id inside reactions[emoji] (a jsonb array of user ids).
create or replace function toggle_reaction(p_msg uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur jsonb;
  arr jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select reactions into cur from messages where id = p_msg;
  if cur is null then return; end if;
  arr := coalesce(cur -> p_emoji, '[]'::jsonb);
  if arr ? uid::text then
    arr := (
      select coalesce(jsonb_agg(e), '[]'::jsonb)
      from jsonb_array_elements_text(arr) e
      where e <> uid::text
    );
  else
    arr := arr || to_jsonb(uid::text);
  end if;
  if jsonb_array_length(arr) = 0 then
    cur := cur - p_emoji;
  else
    cur := jsonb_set(cur, array[p_emoji], arr);
  end if;
  update messages set reactions = cur where id = p_msg;
end;
$$;

-- Pin / unpin a message (the app gates this to PIN_MESSAGES holders).
create or replace function set_pinned(p_msg uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update messages set pinned = p_pinned where id = p_msg;
end;
$$;

grant execute on function toggle_reaction(uuid, text) to authenticated;
grant execute on function set_pinned(uuid, boolean) to authenticated;
