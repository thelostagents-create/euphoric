import { useStore } from "../store";
import type { Message } from "../types";

export const REACTION_EMOJIS = ["❤️", "👍", "👎", "😂", "🔥", "🎉"];

let pressTimer: number | undefined;
let lastTap = 0;

/** Long-press, double-tap or right-click props that fire `onLong`. */
export function longPressProps(onLong: () => void, ms = 400) {
  const start = () => {
    pressTimer = window.setTimeout(onLong, ms);
  };
  const cancel = () => window.clearTimeout(pressTimer);
  return {
    onTouchStart: start,
    onTouchEnd: () => {
      cancel();
      const now = Date.now();
      if (now - lastTap < 300) onLong(); // double-tap
      lastTap = now;
    },
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onDoubleClick: (e: React.MouseEvent) => {
      e.preventDefault();
      onLong();
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLong();
    },
  };
}

/** Existing reaction chips under a message; tap to toggle your own. */
export function ReactionChips({ message }: { message: Message }) {
  const { state, dispatch } = useStore();
  const me = state.currentUserId;
  const entries = Object.entries(message.reactions ?? {}).filter(([, ids]) => ids.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="reactions">
      {entries.map(([emoji, ids]) => (
        <button
          key={emoji}
          className={`reaction ${ids.includes(me) ? "mine" : ""}`}
          onClick={() => dispatch({ type: "TOGGLE_REACTION", messageId: message.id, emoji })}
        >
          {emoji} {ids.length}
        </button>
      ))}
    </div>
  );
}

/** Reaction emoji row, plus an optional Reply action. */
export function ReactionPicker({
  messageId,
  onClose,
  onReply,
  onPin,
  pinned,
}: {
  messageId: string;
  onClose: () => void;
  onReply?: () => void;
  onPin?: () => void;
  pinned?: boolean;
}) {
  const { dispatch } = useStore();
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div className="reaction-pop">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                dispatch({ type: "TOGGLE_REACTION", messageId, emoji });
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        {onReply && (
          <button className="btn" onClick={() => { onReply(); onClose(); }}>
            ↩ Reply
          </button>
        )}
        {onPin && (
          <button className="btn ghost" onClick={() => { onPin(); onClose(); }}>
            📌 {pinned ? "Unpin message" : "Pin message"}
          </button>
        )}
      </div>
    </div>
  );
}
