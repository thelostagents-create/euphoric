// NSFW image classifier using nsfwjs + TensorFlow.js.
// nsfwjs + TensorFlow are imported dynamically so they DON'T weigh down the
// initial app bundle — the chunk only downloads the first time a user picks
// an image. The model weights (~25 MB) load once on first use and are cached
// for the session. Only images are classified; videos are not checked.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(): Promise<any> {
  if (!modelPromise) {
    modelPromise = import("nsfwjs").then((nsfwjs) => nsfwjs.load());
  }
  return modelPromise;
}

/**
 * Returns true when the image is likely explicit (Porn or Hentai > 70%).
 * Resolves quickly once the model is warm; first call loads ~25 MB model.
 * Returns false for videos and on any unexpected error (fail open).
 */
export async function isNsfw(source: File | string): Promise<boolean> {
  try {
    // Skip videos — nsfwjs only works on images.
    if (source instanceof File && source.type.startsWith("video/")) return false;

    const model = await getModel();

    // Build an HTMLImageElement from the source so nsfwjs can read pixels.
    const img = await loadImage(source);
    const predictions = await model.classify(img);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const explicit = predictions.find(
      (p: any) => p.className === "Porn" || p.className === "Hentai",
    );
    return (explicit?.probability ?? 0) > 0.7;
  } catch {
    // If classification fails for any reason, let it through rather than
    // blocking legitimate content.
    return false;
  }
}

function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (typeof source === "string") {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    }
  });
}
