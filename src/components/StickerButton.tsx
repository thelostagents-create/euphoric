import { useState } from "react";
import { useStore } from "../store";
import { availableStickers } from "../social";

const COMMON_EMOJIS = ["👍", "👎", "😄", "😢", "😭", "😂", "❤️", "🔥", "🎉", "😮", "😡", "🙏", "👀", "✨"];

/** Emoji/sticker button: send a sticker image or insert an emoji into the draft. */
export function StickerButton({
  channelId,
  serverId,
  onInsertEmoji,
}: {
  channelId: string;
  serverId?: string;
  onInsertEmoji?: (emoji: string) => void;
}) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const stickers = availableStickers(state, state.currentUserId, serverId);

  function send(url: string) {
    dispatch({ type: "SEND_MESSAGE", channelId, content: "", attachment: { kind: "image", url } });
    setOpen(false);
  }

  return (
    <>
      <button
        className="btn ghost"
        title="Stickers"
        onClick={() => setOpen(true)}
        style={{ flex: "0 0 auto" }}
      >
        😀
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2>Stickers</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {stickers.map((url, i) => (
                <button key={i} className="sticker-cell" onClick={() => send(url)}>
                  <img src={url} alt="sticker" />
                </button>
              ))}
            </div>

            {onInsertEmoji && (
              <>
                <div className="section-title">Emoji</div>
                <div className="emoji-row">
                  {COMMON_EMOJIS.map((e) => (
                    <button
                      key={e}
                      className="emoji-btn"
                      onClick={() => {
                        onInsertEmoji(e);
                        setOpen(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
