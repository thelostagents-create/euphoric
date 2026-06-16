-- Euphoric — full schema for the Supabase backend.
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Naming note: the product calls servers "parties" and channels "lounges";
-- the schema keeps server/channel for clarity.

-- ─────────────────────────────────────────────────────────────
-- Profiles (one row per auth user)
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  nickname text not null default '',
  avatar text not null default '',
  bio text not null default '',
  blurb text not null default '',
  blurb_color text not null default '#9b7bff',
  tier text not null default 'free' check (tier in ('free','premium','supernova')),
  banner jsonb not null default '{"color":"#2a2440","image":"","position":50}'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  aesthetic jsonb not null default '{"enabled":false}'::jsonb,
  app_accent text not null default '#9b7bff',
  light_mode boolean not null default false,
  created_at timestamptz not null default now()
);

-- Social graph
create table if not exists follows (
  follower_id uuid references profiles on delete cascade,
  followee_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table if not exists blocks (
  blocker_id uuid references profiles on delete cascade,
  blocked_id uuid references profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);

-- ─────────────────────────────────────────────────────────────
-- Servers (parties), roles, channels (lounges), members
-- ─────────────────────────────────────────────────────────────
create table if not exists servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '✨',
  icon_image text not null default '',
  owner_id uuid not null references profiles on delete cascade,
  invite text unique not null,
  discoverable boolean not null default false,
  verified boolean not null default false,
  description text not null default '',
  keywords text[] not null default '{}',
  blocked_words text[] not null default '{}',
  onboarding jsonb not null default '{"enabled":false,"cosmeticRoleIds":[]}'::jsonb,
  stickers text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers on delete cascade,
  name text not null,
  color text not null default '#9aa0b4',
  permissions text[] not null default '{}',
  position double precision not null default 0,
  staff boolean not null default false,
  mentionable boolean not null default false
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers on delete cascade,
  name text not null,
  position double precision not null default 0,
  forum boolean not null default false,
  send_role_ids uuid[] not null default '{}',
  view_role_ids uuid[] not null default '{}'
);

create table if not exists members (
  server_id uuid not null references servers on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role_ids uuid[] not null default '{}',
  timeout_until timestamptz,
  banned boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references servers on delete cascade,
  action text not null,
  actor_id uuid references profiles on delete set null,
  target_id uuid references profiles on delete set null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Stars (boosts)
-- ─────────────────────────────────────────────────────────────
create table if not exists stars (
  user_id uuid references profiles on delete cascade,
  server_id uuid references servers on delete cascade,
  count int not null default 0,
  primary key (user_id, server_id)
);

-- ─────────────────────────────────────────────────────────────
-- Direct messages & group chats
-- ─────────────────────────────────────────────────────────────
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_image text not null default '',
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid references groups on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (group_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- Forum posts (threads inside forum channels)
-- ─────────────────────────────────────────────────────────────
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels on delete cascade,
  title text not null,
  author_id uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Messages — one stream, keyed by a polymorphic conversation id:
--   channel:<uuid> | post:<uuid> | dm:<userA>_<userB> | group:<uuid>
-- ─────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation text not null,
  author_id uuid references profiles on delete set null,
  content text not null default '',
  attachment jsonb,
  reactions jsonb not null default '{}'::jsonb,
  reply_to uuid references messages on delete set null,
  pinned boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages (conversation, created_at);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table follows enable row level security;
alter table blocks enable row level security;
alter table servers enable row level security;
alter table roles enable row level security;
alter table channels enable row level security;
alter table members enable row level security;
alter table audit_log enable row level security;
alter table stars enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table posts enable row level security;
alter table messages enable row level security;

-- Helper: is the current user a member of a server?
create or replace function is_member(srv uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from members m where m.server_id = srv and m.user_id = auth.uid() and not m.banned);
$$;

-- (Policies are dropped first so this migration can be re-run safely.)

-- Profiles: readable by everyone; writable only by the owner.
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (true);
drop policy if exists "profiles upsert" on profiles;
create policy "profiles upsert" on profiles for insert with check (id = auth.uid());
drop policy if exists "profiles update" on profiles;
create policy "profiles update" on profiles for update using (id = auth.uid());

-- Follows / blocks: managed by the acting user.
drop policy if exists "follows read" on follows;
create policy "follows read" on follows for select using (true);
drop policy if exists "follows write" on follows;
create policy "follows write" on follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());
drop policy if exists "blocks rw" on blocks;
create policy "blocks rw" on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Servers / roles / channels: discoverable or member can read; owner writes.
drop policy if exists "servers read" on servers;
create policy "servers read" on servers for select using (discoverable or is_member(id));
drop policy if exists "servers insert" on servers;
create policy "servers insert" on servers for insert with check (owner_id = auth.uid());
drop policy if exists "servers update" on servers;
create policy "servers update" on servers for update using (owner_id = auth.uid());
drop policy if exists "servers delete" on servers;
create policy "servers delete" on servers for delete using (owner_id = auth.uid());

drop policy if exists "roles read" on roles;
create policy "roles read" on roles for select using (is_member(server_id) or exists (select 1 from servers s where s.id = server_id and s.discoverable));
drop policy if exists "roles write" on roles;
create policy "roles write" on roles for all using (exists (select 1 from servers s where s.id = server_id and s.owner_id = auth.uid()));

drop policy if exists "channels read" on channels;
create policy "channels read" on channels for select using (is_member(server_id));
drop policy if exists "channels write" on channels;
create policy "channels write" on channels for all using (exists (select 1 from servers s where s.id = server_id and s.owner_id = auth.uid()));

-- Members: readable by members; you can join/leave yourself, owner manages all.
drop policy if exists "members read" on members;
create policy "members read" on members for select using (is_member(server_id) or user_id = auth.uid());
drop policy if exists "members self" on members;
create policy "members self" on members for all using (user_id = auth.uid() or exists (select 1 from servers s where s.id = server_id and s.owner_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from servers s where s.id = server_id and s.owner_id = auth.uid()));

drop policy if exists "audit read" on audit_log;
create policy "audit read" on audit_log for select using (is_member(server_id));
drop policy if exists "audit insert" on audit_log;
create policy "audit insert" on audit_log for insert with check (is_member(server_id));

drop policy if exists "stars rw" on stars;
create policy "stars rw" on stars for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "stars read" on stars;
create policy "stars read" on stars for select using (true);

-- Groups: members read & post.
drop policy if exists "groups read" on groups;
create policy "groups read" on groups for select using (exists (select 1 from group_members g where g.group_id = id and g.user_id = auth.uid()));
drop policy if exists "groups insert" on groups;
create policy "groups insert" on groups for insert with check (created_by = auth.uid());
drop policy if exists "group_members read" on group_members;
create policy "group_members read" on group_members for select using (exists (select 1 from group_members g where g.group_id = group_id and g.user_id = auth.uid()));
drop policy if exists "group_members write" on group_members;
create policy "group_members write" on group_members for all using (true) with check (true);

drop policy if exists "posts read" on posts;
create policy "posts read" on posts for select using (exists (select 1 from channels c where c.id = channel_id and is_member(c.server_id)));
drop policy if exists "posts write" on posts;
create policy "posts write" on posts for all using (exists (select 1 from channels c where c.id = channel_id and is_member(c.server_id)));

-- Messages: anyone authenticated can read/write (RLS by conversation is
-- enforced at the app layer for the MVP; tighten per-conversation later).
drop policy if exists "messages read" on messages;
create policy "messages read" on messages for select using (auth.role() = 'authenticated');
drop policy if exists "messages insert" on messages;
create policy "messages insert" on messages for insert with check (author_id = auth.uid());
drop policy if exists "messages update" on messages;
create policy "messages update" on messages for update using (author_id = auth.uid());
drop policy if exists "messages delete" on messages;
create policy "messages delete" on messages for delete using (author_id = auth.uid());

-- Create a profile row automatically when a user signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 6)),
    'https://api.dicebear.com/9.x/thumbs/svg?seed=' || new.id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
