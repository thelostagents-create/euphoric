import { Fragment } from "react";
import type { User } from "../types";
import { displayName } from "../social";

/**
 * Render message text, turning @username tokens that resolve to a real user
 * into highlighted mention chips (shown as @displayName).
 */
export function MessageText({
  content,
  users,
  meId,
}: {
  content: string;
  users: Record<string, User>;
  meId: string;
}) {
  const byName = new Map<string, User>();
  Object.values(users).forEach((u) => byName.set(u.username.toLowerCase(), u));

  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^@(\w+)$/.exec(part);
        const user = m ? byName.get(m[1].toLowerCase()) : undefined;
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
