import { useStore } from "../store";
import { displayName } from "../social";
import { ReplyArrowIcon } from "./Icons";

function snippet(content: string, hasAttachment: boolean): string {
  if (content) return content;
  return hasAttachment ? "📎 Attachment" : "message";
}

/** Quoted preview of the message a message is replying to. */
export function ReplyPreview({ replyTo, onJump }: { replyTo: string; onJump?: () => void }) {
  const { state } = useStore();
  const target = state.messages.find((m) => m.id === replyTo);
  return (
    <div className="reply-preview" onClick={onJump}>
      <ReplyArrowIcon size={13} />
      {target ? (
        <>
          <b>{displayName(state.users[target.authorId])}</b>
          <span className="reply-snippet">{snippet(target.content, !!target.attachment)}</span>
        </>
      ) : (
        <span className="reply-snippet">original message deleted</span>
      )}
    </div>
  );
}

/** Bar above the composer while replying, with a cancel button. */
export function ReplyBar({ replyTo, onCancel }: { replyTo: string; onCancel: () => void }) {
  const { state } = useStore();
  const target = state.messages.find((m) => m.id === replyTo);
  return (
    <div className="reply-bar">
      <ReplyArrowIcon size={14} />
      <span style={{ flex: 1, minWidth: 0 }} className="reply-snippet">
        Replying to <b>{displayName(state.users[target?.authorId ?? ""])}</b>
        {target?.content ? ` · ${target.content}` : ""}
      </span>
      <button className="btn ghost sm" onClick={onCancel}>✕</button>
    </div>
  );
}
