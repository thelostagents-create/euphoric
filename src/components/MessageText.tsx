import { Fragment } from "react";
import type { Attachment, Role, User } from "../types";
import { displayName } from "../social";

/** Render an image/video message attachment. */
export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "video") {
    return <video className="attachment" src={attachment.url} controls />;
  }
  return <img className="attachment" src={attachment.url} alt="attachment" />;
}

/**
 * Render message text, turning @username tokens that resolve to a real user
 * into highlighted mention chips (shown as @displayName).
 */
export function MessageText({
  content,
  users,
  meId,
  roles = [],
  myRoleIds = [],
}: {
  content: string;
  users: Record<string, User>;
  meId: string;
  /** Mentionable roles in this server (for @role highlighting). */
  roles?: Role[];
  myRoleIds?: string[];
}) {
  const byName = new Map<string, User>();
  Object.values(users).forEach((u) => byName.set(u.username.toLowerCase(), u));
  const roleByName = new Map<string, Role>();
  roles.forEach((r) => roleByName.set(r.name.toLowerCase(), r));

  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^@(\w+)$/.exec(part);
        const token = m?.[1].toLowerCase();
        if (token === "everyone") {
          return (
            <span key={i} className="mention mention-me">
              @everyone
            </span>
          );
        }
        const role = token ? roleByName.get(token) : undefined;
        if (role) {
          const mine = myRoleIds.includes(role.id);
          return (
            <span key={i} className={`mention ${mine ? "mention-me" : ""}`} style={{ color: role.color }}>
              @{role.name}
            </span>
          );
        }
        const user = token ? byName.get(token) : undefined;
        if (user) {
          return (
            <span key={i} className={`mention ${user.id === meId ? "mention-me" : ""}`}>
              @{displayName(user)}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
