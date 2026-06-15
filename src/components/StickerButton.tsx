import { useState } from "react";
import { useStore } from "../store";
import { availableStickers } from "../social";

/** Emoji/sticker button that sends a party sticker as an image attachment. */
export function StickerButton({ channelId, serverId }: { channelId: string; serverId?: string }) {
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
            {stickers.length === 0 ? (
              <p className="muted">
                No stickers available here. Parties unlock 10 sticker uploads at 6 ⭐, and Premium
                members can use stickers from all their parties.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {stickers.map((url, i) => (
                  <button key={i} className="sticker-cell" onClick={() => send(url)}>
                    <img src={url} alt="sticker" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
