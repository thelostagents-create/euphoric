import { supabase, isSupabaseConfigured } from "./supabase";
import { readFileAsDataURL } from "../upload";

// Uploads images/videos to a Supabase Storage bucket and returns a short public
// URL (served via CDN). This keeps the database tiny and egress low — rows hold
// a URL instead of a multi-MB base64 blob. In demo mode (no backend) we fall
// back to a data URL so offline still works.

const BUCKET = "media";

function extFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.startsWith("video") ? "mp4" : "jpg";
}

/** Upload a file and return a URL to store. Falls back to a data URL on error. */
export async function uploadMedia(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return readFileAsDataURL(file);
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? "anon";
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (error) {
      console.error("media upload failed, using data URL:", error.message);
      return readFileAsDataURL(file);
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("media upload error, using data URL:", e);
    return readFileAsDataURL(file);
  }
}
