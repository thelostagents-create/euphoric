import { useStore } from "../store";
import { displayName } from "../social";
import { ReplyArrowIcon } from "./Icons";
import type { Message, User } from "../types";

function snippet(content: string, hasAttachment: boolean): string {
  if (content) return content;
  return hasAttachment ? "📎 Attachment" : "message";
}

/**
 * Quoted preview of the message a message is replying to. In backend (live)
 * mode the original lives in the conversation hook, not the store, so callers
 * pass `messages`/`users` to resolve it.
 */
export function ReplyPreview({
  replyTo,
  onJump,
  messages,
  users,
}: {
  replyTo: string;
  onJump?: () => void;
  messages?: Message[];
  users?: Record<string, User>;
}) {
  const { state } = useStore();
  const list = messages ?? state.messages;
  const people = users ?? state.users;
  const target = list.find((m) => m.id === replyTo);
  return (
    <div className="reply-preview" onClick={onJump}>
      <ReplyArrowIcon size={13} />
      {target ? (
        <>
          <b>{displayName(people[target.authorId])}</b>
          <span className="reply-snippet">{snippet(target.content, !!target.attachment)}</span>
        </>
      ) : (
        <span className="reply-snippet">original message deleted</span>
      )}
    </div>
  );
}

/** Bar above the composer while replying, with a cancel button. */
export function ReplyBar({
  replyTo,
  onCancel,
  messages,
  users,
}: {
  replyTo: string;
  onCancel: () => void;
  messages?: Message[];
  users?: Record<string, User>;
}) {
  const { state } = useStore();
  const list = messages ?? state.messages;
  const people = users ?? state.users;
  const target = list.find((m) => m.id === replyTo);
  return (
    <div className="reply-bar">
      <ReplyArrowIcon size={14} />
      <span style={{ flex: 1, minWidth: 0 }} className="reply-snippet">
        Replying to <b>{displayName(people[target?.authorId ?? ""])}</b>
        {target?.content ? ` · ${target.content}` : ""}
      </span>
      <button className="btn ghost sm" onClick={onCancel}>✕</button>
    </div>
  );
}
