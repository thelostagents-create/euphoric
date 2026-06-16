import { supabase } from "./supabase";
import type { Attachment, AuditEntry, GroupChat, Message, Server, User } from "../types";

/* ── Servers (parties) / membership ────────────────────────── */

// Lightweight pub/sub so writes can ask the synced server list to reload.
let reloadServers: (() => void) | null = null;
export function setServersReload(fn: (() => void) | null) {
  reloadServers = fn;
}
export function triggerServersReload() {
  reloadServers?.();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToServer(s: any): Server {
  return {
    id: s.id,
    name: s.name,
    icon: s.icon ?? "✨",
    iconImage: s.icon_image ?? "",
    ownerId: s.owner_id,
    invite: s.invite,
    discoverable: !!s.discoverable,
    verified: !!s.verified,
    description: s.description ?? "",
    keywords: s.keywords ?? [],
    blockedWords: s.blocked_words ?? [],
    auditLog: [],
    onboarding: s.onboarding ?? { enabled: false, cosmeticRoleIds: [] },
    stickers: s.stickers ?? [],
    channels: (s.channels ?? [])
      .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        sendRoleIds: c.send_role_ids ?? [],
        viewRoleIds: c.view_role_ids ?? [],
        forum: !!c.forum,
        posts: (c.posts ?? [])
          .map((p: any) => ({ id: p.id, title: p.title, authorId: p.author_id, createdAt: p.created_at }))
          .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1)),
      })),
    roles: (s.roles ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      permissions: r.permissions ?? [],
      position: r.position ?? 0,
      staff: !!r.staff,
      mentionable: !!r.mentionable,
    })),
    members: (s.members ?? []).map((m: any) => ({
      userId: m.user_id,
      roleIds: m.role_ids ?? [],
      timeoutUntil: m.timeout_until ?? undefined,
      banned: !!m.banned,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Load the user's parties + discoverable ones, with their member profiles. */
export async function loadServers(uid: string): Promise<{ servers: Server[]; profiles: Partial<User>[] }> {
  if (!supabase) return { servers: [], profiles: [] };
  const sel = "*, channels(*, posts(*)), roles(*), members(*)";
  const { data: mem } = await supabase.from("members").select("server_id").eq("user_id", uid);
  const myIds = (mem ?? []).map((m) => m.server_id as string);
  const mine = myIds.length
    ? (await supabase.from("servers").select(sel).in("id", myIds)).data ?? []
    : [];
  const disc = (await supabase.from("servers").select(sel).eq("discoverable", true)).data ?? [];
  const byId = new Map<string, unknown>();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  [...mine, ...disc].forEach((s: any) => byId.set(s.id, s));
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const servers = [...byId.values()].map(rowToServer);
  const serverIds = servers.map((s) => s.id);

  // Audit history + per-server Star totals for these parties.
  const [auditMap, starsMap] = await Promise.all([loadAudit(serverIds), loadStars(serverIds)]);
  servers.forEach((s) => (s.auditLog = auditMap[s.id] ?? []));

  const ids = [
    ...new Set(servers.flatMap((s) => s.members.map((m) => m.userId)).concat(servers.map((s) => s.ownerId))),
  ].filter(Boolean);
  const profiles = await fetchProfilesByIds(ids);
  // Attach each member's Star allocations so serverStars() totals are accurate.
  profiles.forEach((p) => {
    if (p.id && starsMap[p.id]) p.starAllocations = starsMap[p.id];
  });
  return { servers, profiles };
}

/** Per-server Star totals keyed by user id: { userId: { serverId: count } }. */
async function loadStars(serverIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (!supabase || !serverIds.length) return {};
  const { data } = await supabase.from("stars").select("user_id, server_id, count").in("server_id", serverIds);
  const map: Record<string, Record<string, number>> = {};
  (data ?? []).forEach((r) => {
    (map[r.user_id as string] ??= {})[r.server_id as string] = (r.count as number) ?? 0;
  });
  return map;
}

/** Recent audit-log entries per server. */
async function loadAudit(serverIds: string[]): Promise<Record<string, AuditEntry[]>> {
  if (!supabase || !serverIds.length) return {};
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .in("server_id", serverIds)
    .order("created_at", { ascending: false })
    .limit(100);
  const map: Record<string, AuditEntry[]> = {};
  (data ?? []).forEach((r) => {
    (map[r.server_id as string] ??= []).push({
      id: r.id as string,
      action: r.action as string,
      actorId: r.actor_id as string,
      targetId: (r.target_id as string) ?? undefined,
      detail: (r.detail as string) ?? "",
      createdAt: r.created_at as string,
    });
  });
  return map;
}

export async function allocateStarDb(uid: string, serverId: string, count: number): Promise<void> {
  if (!supabase) return;
  if (count <= 0) await supabase.from("stars").delete().eq("user_id", uid).eq("server_id", serverId);
  else await supabase.from("stars").upsert({ user_id: uid, server_id: serverId, count }, { onConflict: "user_id,server_id" });
}

export async function addAuditDb(
  serverId: string,
  action: string,
  actorId: string,
  detail: string,
  targetId?: string,
): Promise<void> {
  await supabase
    ?.from("audit_log")
    .insert({ server_id: serverId, action, actor_id: actorId, target_id: targetId ?? null, detail });
}

/** Create a forum post; returns its DB id (used as the message conversation key). */
export async function createPostDb(channelId: string, title: string, authorUid: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("posts")
    .insert({ channel_id: channelId, title: title.trim(), author_id: authorUid })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** Make sure the signed-in user has a profile row (FKs depend on it). */
export async function ensureProfile(uid: string, fallbackName: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .upsert({ id: uid, username: fallbackName }, { onConflict: "id", ignoreDuplicates: true });
}

/**
 * Create a party via the `create_party` RPC (one SECURITY DEFINER call that
 * inserts the server + @everyone role + #general lounge + owner member in a
 * single transaction). Returns null on success, or an error string to show.
 */
export async function createServerDb(_ownerId: string, name: string, icon: string): Promise<string | null> {
  if (!supabase) return "Backend not configured.";
  const { error } = await supabase.rpc("create_party", { p_name: name, p_icon: icon });
  if (error) {
    if (/not authenticated/i.test(error.message))
      return "You're not signed in (auth token invalid). Try signing out and back in.";
    return error.message || "Could not create the party.";
  }
  triggerServersReload();
  return null;
}

/** Join a party via the `join_party` RPC. */
export async function joinServerDb(serverId: string, _uid: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("join_party", { p_server: serverId });
  triggerServersReload();
}

/* ── Social graph (follows / blocks) ───────────────────────── */

/** Load the signed-in user's follows, followers and blocks (+ profiles). */
export async function loadSocial(
  uid: string,
): Promise<{ following: string[]; followers: string[]; blocked: string[]; profiles: Partial<User>[] }> {
  if (!supabase) return { following: [], followers: [], blocked: [], profiles: [] };
  const [f1, f2, b] = await Promise.all([
    supabase.from("follows").select("followee_id").eq("follower_id", uid),
    supabase.from("follows").select("follower_id").eq("followee_id", uid),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", uid),
  ]);
  const following = (f1.data ?? []).map((r) => r.followee_id as string);
  const followers = (f2.data ?? []).map((r) => r.follower_id as string);
  const blocked = (b.data ?? []).map((r) => r.blocked_id as string);
  const ids = [...new Set([...following, ...followers, ...blocked])];
  const profiles = await fetchProfilesByIds(ids);
  return { following, followers, blocked, profiles };
}

export async function followDb(uid: string, target: string): Promise<void> {
  await supabase
    ?.from("follows")
    .upsert({ follower_id: uid, followee_id: target }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true });
}
export async function unfollowDb(uid: string, target: string): Promise<void> {
  await supabase?.from("follows").delete().eq("follower_id", uid).eq("followee_id", target);
}
export async function blockDb(uid: string, target: string): Promise<void> {
  await supabase
    ?.from("blocks")
    .upsert({ blocker_id: uid, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
}
export async function unblockDb(uid: string, target: string): Promise<void> {
  await supabase?.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", target);
}

/* ── Group chats ───────────────────────────────────────────── */

/** Create a group chat; returns its DB id (used as the conversation key). */
export async function createGroupDb(uid: string, name: string, memberIds: string[]): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: name.trim() || "New Group", created_by: uid })
    .select("id")
    .single();
  if (error || !data) return null;
  const rows = [...new Set([uid, ...memberIds])].map((u) => ({ group_id: data.id, user_id: u }));
  await supabase.from("group_members").insert(rows);
  return data.id as string;
}

/** Load the groups the user belongs to, with their member profiles. */
export async function loadGroups(uid: string): Promise<{ groups: GroupChat[]; profiles: Partial<User>[] }> {
  if (!supabase) return { groups: [], profiles: [] };
  const { data: mine } = await supabase.from("group_members").select("group_id").eq("user_id", uid);
  const ids = (mine ?? []).map((m) => m.group_id as string);
  if (!ids.length) return { groups: [], profiles: [] };
  const { data } = await supabase.from("groups").select("*, group_members(user_id)").in("id", ids);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const groups: GroupChat[] = (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    iconImage: g.icon_image ?? "",
    createdBy: g.created_by,
    memberIds: (g.group_members ?? []).map((m: any) => m.user_id),
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const memberIds = [...new Set(groups.flatMap((g) => g.memberIds))];
  const profiles = await fetchProfilesByIds(memberIds);
  return { groups, profiles };
}

export async function addGroupMemberDb(groupId: string, userId: string): Promise<void> {
  await supabase
    ?.from("group_members")
    .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
}
export async function removeGroupMemberDb(groupId: string, userId: string): Promise<void> {
  await supabase?.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}
export async function renameGroupDb(groupId: string, name: string): Promise<void> {
  await supabase?.from("groups").update({ name }).eq("id", groupId);
}
export async function setGroupIconDb(groupId: string, iconImage: string): Promise<void> {
  await supabase?.from("groups").update({ icon_image: iconImage }).eq("id", groupId);
}

/* ── Messages (live conversations) ─────────────────────────── */

function rowToMessage(r: Record<string, unknown>): Message {
  return {
    id: r.id as string,
    channelId: r.conversation as string,
    authorId: r.author_id as string,
    content: (r.content as string) ?? "",
    createdAt: r.created_at as string,
    attachment: (r.attachment as Attachment) ?? undefined,
    reactions: (r.reactions as Record<string, string[]>) ?? undefined,
    replyTo: (r.reply_to as string) ?? undefined,
    pinned: (r.pinned as boolean) ?? undefined,
    editedAt: (r.edited_at as string) ?? undefined,
  };
}

export async function fetchConversation(conv: string): Promise<Message[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation", conv)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []).map(rowToMessage);
}

export async function fetchProfilesByIds(ids: string[]): Promise<Partial<User>[]> {
  if (!supabase || ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  return (data ?? []).map((d) => ({
    id: d.id,
    username: d.username,
    nickname: d.nickname ?? "",
    avatar: d.avatar ?? "",
    bio: d.bio ?? "",
    blurb: d.blurb ?? "",
    blurbColor: d.blurb_color ?? "#9b7bff",
    tier: d.tier ?? "free",
  }));
}

export async function sendMessageDb(
  authorId: string,
  conv: string,
  content: string,
  attachment?: Attachment,
  replyTo?: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from("messages").insert({
    conversation: conv,
    author_id: authorId,
    content,
    attachment: attachment ?? null,
    reply_to: replyTo ?? null,
  });
}

export async function editMessageDb(id: string, content: string): Promise<void> {
  await supabase?.from("messages").update({ content, edited_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteMessageDb(id: string): Promise<void> {
  await supabase?.from("messages").delete().eq("id", id);
}

export async function setReactionsDb(id: string, reactions: Record<string, string[]>): Promise<void> {
  await supabase?.from("messages").update({ reactions }).eq("id", id);
}

/** Subscribe to changes for one conversation; returns an unsubscribe fn. */
export function subscribeConversation(conv: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`conv:${conv}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `conversation=eq.${conv}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase?.removeChannel(ch);
  };
}

/** Load a profile row from Supabase, mapped to the local User shape. */
export async function loadProfile(id: string): Promise<Partial<User> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const p: Partial<User> = {
    username: data.username,
    nickname: data.nickname ?? "",
    avatar: data.avatar ?? "",
    bio: data.bio ?? "",
    blurb: data.blurb ?? "",
    blurbColor: data.blurb_color ?? "#9b7bff",
    tier: data.tier ?? "free",
    appAccent: data.app_accent ?? "#9b7bff",
    lightMode: data.light_mode ?? false,
  };
  // Nested objects only override locals when the DB has a full shape.
  if (data.banner && data.banner.color) p.banner = data.banner;
  if (data.theme && data.theme.accentColor) p.theme = data.theme;
  if (data.aesthetic && data.aesthetic.bgColor) p.aesthetic = data.aesthetic;
  return p;
}

/** Persist the local user's profile fields to Supabase (keyed by auth id). */
export async function saveProfile(id: string, u: User): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .update({
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      bio: u.bio,
      blurb: u.blurb,
      blurb_color: u.blurbColor,
      tier: u.tier,
      banner: u.banner,
      theme: u.theme,
      aesthetic: u.aesthetic,
      app_accent: u.appAccent,
      light_mode: u.lightMode,
    })
    .eq("id", id);
}
