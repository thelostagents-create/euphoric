// Helpers for importing local images/videos as data URLs.

/** Max import size. Data URLs live in state/localStorage, so keep it modest. */
export const MAX_UPLOAD = 4_000_000; // ~4 MB

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
