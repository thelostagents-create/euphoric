import { useStore } from "../store";
import type { Message } from "../types";

export const REACTION_EMOJIS = ["❤️", "👍", "👎", "😂", "😭", "🔥", "🎉"];

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

/**
 * Existing reaction chips under a message; tap to toggle your own. In backend
 * (live) mode, pass `meId` and `onToggle` so it reacts against Supabase rather
 * than the local store.
 */
export function ReactionChips({
  message,
  meId,
  onToggle,
}: {
  message: Message;
  meId?: string;
  onToggle?: (emoji: string) => void;
}) {
  const { state, dispatch } = useStore();
  const me = meId ?? state.currentUserId;
  const toggle = (emoji: string) =>
    onToggle ? onToggle(emoji) : dispatch({ type: "TOGGLE_REACTION", messageId: message.id, emoji });
  const entries = Object.entries(message.reactions ?? {}).filter(([, ids]) => ids.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="reactions">
      {entries.map(([emoji, ids]) => (
        <button key={emoji} className={`reaction ${ids.includes(me) ? "mine" : ""}`} onClick={() => toggle(emoji)}>
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
  onEdit,
  onReact,
  onReport,
  pinned,
}: {
  messageId: string;
  onClose: () => void;
  onReply?: () => void;
  onPin?: () => void;
  onEdit?: () => void;
  /** Live mode: react against the backend instead of dispatching locally. */
  onReact?: (emoji: string) => void;
  onReport?: () => void;
  pinned?: boolean;
}) {
  const { dispatch } = useStore();
  const react = (emoji: string) =>
    onReact ? onReact(emoji) : dispatch({ type: "TOGGLE_REACTION", messageId, emoji });
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div className="reaction-pop">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                react(emoji);
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
        {onEdit && (
          <button className="btn ghost" onClick={() => { onEdit(); onClose(); }}>
            ✎ Edit message
          </button>
        )}
        {onPin && (
          <button className="btn ghost" onClick={() => { onPin(); onClose(); }}>
            📌 {pinned ? "Unpin message" : "Pin message"}
          </button>
        )}
        {onReport && (
          <button className="btn ghost" onClick={() => { onReport(); onClose(); }}>
            ⚑ Report message
          </button>
        )}
      </div>
    </div>
  );
}
