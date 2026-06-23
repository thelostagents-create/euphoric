-- Euphoric — friends feed (photo dumps & notes).
-- Posts are visible only to the author and their mutual friends (both follow
-- each other). Reactions are stored as jsonb and toggled via an RPC so anyone
-- who can see a post can react without owning the row. Run in the SQL editor.

-- Helper: are the caller and `other` mutual friends?
create or replace function is_mutual(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = other)
     and exists (select 1 from follows g where g.follower_id = other and g.followee_id = auth.uid());
$$;
grant execute on function is_mutual(uuid) to authenticated;

create table if not exists feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  text text not null default '',
  images text[] not null default '{}',
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feed_posts_author_idx on feed_posts (author_id, created_at desc);

alter table feed_posts enable row level security;

-- Read: your own posts, or a mutual friend's posts.
drop policy if exists "feed read" on feed_posts;
create policy "feed read" on feed_posts for select
  using (author_id = auth.uid() or is_mutual(author_id));

-- Insert: only as yourself.
drop policy if exists "feed insert" on feed_posts;
create policy "feed insert" on feed_posts for insert
  with check (author_id = auth.uid());

-- Delete: only your own posts.
drop policy if exists "feed delete" on feed_posts;
create policy "feed delete" on feed_posts for delete
  using (author_id = auth.uid());

-- Toggle a reaction (author or any mutual friend may react).
create or replace function toggle_feed_reaction(p_post uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_reactions jsonb;
  v_arr jsonb;
  v_uid text := auth.uid()::text;
begin
  select author_id, reactions into v_author, v_reactions from feed_posts where id = p_post;
  if v_author is null then return; end if;
  if not (v_author = auth.uid() or is_mutual(v_author)) then
    raise exception 'not allowed to react to this post';
  end if;

  v_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);
  if v_arr ? v_uid then
    -- remove my id
    v_arr := (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements_text(v_arr) e where e <> v_uid);
  else
    v_arr := v_arr || to_jsonb(v_uid);
  end if;

  if jsonb_array_length(v_arr) = 0 then
    v_reactions := v_reactions - p_emoji;
  else
    v_reactions := jsonb_set(v_reactions, array[p_emoji], v_arr, true);
  end if;

  update feed_posts set reactions = v_reactions where id = p_post;
end;
$$;
grant execute on function toggle_feed_reaction(uuid, text) to authenticated;
