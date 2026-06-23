// Helpers for importing local images/videos as data URLs.

/** Max image upload size (compressed to WebP before storage). */
export const MAX_UPLOAD = 4_000_000; // ~4 MB

/** Max video upload size — videos can't be compressed client-side. */
export const MAX_VIDEO_UPLOAD = 20_000_000; // 20 MB

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
