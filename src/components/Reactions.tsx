import { useStore } from "../store";
import type { Message } from "../types";

export const REACTION_EMOJIS = ["❤️", "👍", "👎", "😂", "🔥", "🎉"];

let pressTimer: number | undefined;

/** Touch/mouse long-press props that fire `onLong` after a short hold. */
export function longPressProps(onLong: () => void, ms = 400) {
  const start = () => {
    pressTimer = window.setTimeout(onLong, ms);
  };
  const cancel = () => window.clearTimeout(pressTimer);
  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
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

/** Emoji picker shown after long-pressing a message. */
export function ReactionPicker({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const { dispatch } = useStore();
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "center" }}>
      <div className="reaction-pop" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
