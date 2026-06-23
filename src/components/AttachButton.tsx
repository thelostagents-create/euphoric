import { useRef } from "react";
import { useStore } from "../store";
import { MAX_UPLOAD, MAX_VIDEO_UPLOAD } from "../upload";
import { uploadMedia } from "../lib/storage";
import { isNsfw } from "../lib/nsfw";
import type { Attachment } from "../types";

/**
 * Paperclip that imports an image/video and sends it as a message attachment.
 * In backend (live) mode, pass `onSend` so the attachment goes to Supabase.
 */
export function AttachButton({
  channelId,
  disabled,
  onSend,
}: {
  channelId: string;
  disabled?: boolean;
  onSend?: (attachment: Attachment) => void;
}) {
  const { dispatch } = useStore();
  const ref = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const kind = file.type.startsWith("video") ? "video" : "image";
    const limit = kind === "video" ? MAX_VIDEO_UPLOAD : MAX_UPLOAD;
    const limitLabel = kind === "video" ? "20 MB" : "4 MB";
    if (file.size > limit) {
      alert(`That file is too large (max ${limitLabel} for ${kind}s).`);
      return;
    }
    if (kind === "image" && await isNsfw(file)) {
      alert("That image was flagged as explicit and can't be sent.");
      return;
    }
    const url = await uploadMedia(file);
    if (onSend) onSend({ kind, url });
    else dispatch({ type: "SEND_MESSAGE", channelId, content: "", attachment: { kind, url } });
  }

  return (
    <>
      <button
        className="btn ghost"
        disabled={disabled}
        title="Send an image or video"
        onClick={() => ref.current?.click()}
        style={{ flex: "0 0 auto" }}
      >
        📎
      </button>
      <input ref={ref} type="file" accept="image/*,video/*" hidden onChange={pick} />
    </>
  );
}
