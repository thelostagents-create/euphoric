import { useRef } from "react";
import { useStore } from "../store";
import { MAX_UPLOAD, readFileAsDataURL } from "../upload";
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
    if (file.size > MAX_UPLOAD) {
      alert("That file is too large (max 4 MB).");
      return;
    }
    const url = await readFileAsDataURL(file);
    const kind = file.type.startsWith("video") ? "video" : "image";
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
