import { supabase, isSupabaseConfigured } from "./supabase";
import { readFileAsDataURL } from "../upload";

const BUCKET = "media";

function extFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.startsWith("video") ? "mp4" : "jpg";
}

/** Resize to max 1600px on the long side and re-encode as WebP at 85% quality. */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height / width) * MAX);
          width = MAX;
        } else {
          width = Math.round((width / height) * MAX);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? file), "image/webp", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/** Extract the storage object path from a public CDN URL, or null if not ours. */
function storagePath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  return idx >= 0 ? publicUrl.slice(idx + marker.length) : null;
}

/** Delete media files from storage by their public CDN URLs. No-op for data URLs or demo mode. */
export async function deleteMedia(urls: string[]): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  const paths = urls.map(storagePath).filter((p): p is string => p !== null);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

/** Upload a file and return a URL to store. Falls back to a data URL in demo mode. */
export async function uploadMedia(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return readFileAsDataURL(file);
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? "anon";

    const isVideo = file.type.startsWith("video");
    let blob: Blob = file;
    let contentType = file.type;
    let ext = extFor(file);

    if (!isVideo) {
      blob = await compressImage(file);
      contentType = "image/webp";
      ext = "webp";
    }

    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { cacheControl: "3600", contentType, upsert: false });
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
