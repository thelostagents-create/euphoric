import { supabase } from "./supabase";
import type { User } from "../types";

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
