import { supabase } from "./supabase";
import type { Attachment, Message, User } from "../types";

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
