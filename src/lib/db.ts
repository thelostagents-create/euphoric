import { supabase } from "./supabase";
import type { Attachment, Message, Server, User } from "../types";

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
        posts: [],
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
  const sel = "*, channels(*), roles(*), members(*)";
  const { data: mem } = await supabase.from("members").select("server_id").eq("user_id", uid);
  const myIds = (mem ?? []).map((m) => m.server_id as string);
  const mine = myIds.length
    ? (await supabase.from("servers").select(sel).in("id", myIds)).data ?? []
    : [];
  const disc = (await supabase.from("servers").select(sel).eq("discoverable", true)).data ?? [];
  const byId = new Map<string, unknown>();
  [...mine, ...disc].forEach((s: any) => byId.set(s.id, s));
  const servers = [...byId.values()].map(rowToServer);
  const ids = [
    ...new Set(servers.flatMap((s) => s.members.map((m) => m.userId)).concat(servers.map((s) => s.ownerId))),
  ].filter(Boolean);
  const profiles = await fetchProfilesByIds(ids);
  return { servers, profiles };
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
