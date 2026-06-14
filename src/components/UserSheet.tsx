import { useStore } from "../store";
import { Modal, bannerStyle, tierBadge } from "./Modal";
import { canModerate, getMember, isTimedOut } from "../permissions";
import type { Server } from "../types";

export function UserSheet({
  userId,
  server,
  onClose,
}: {
  userId: string;
  server?: Server;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const user = state.users[userId];
  const me = state.users[state.currentUserId];
  if (!user) return null;

  const isMe = userId === state.currentUserId;
  const isBlocked = me.blockedUserIds.includes(userId);
  const supernova = user.tier === "supernova";

  // MySpace-style theming only applies to supernova profiles.
  const theme = supernova
    ? user.theme
    : { backgroundColor: "var(--bg-2)", accentColor: "var(--accent)", textColor: "var(--text)", usernameFont: "inherit" };

  const canMod = server && canModerate(server, state.currentUserId, userId);
  const member = server && getMember(server, userId);
  const timedOut = isTimedOut(member);

  return (
    <Modal title="" onClose={onClose}>
      <div
        style={{
          background: theme.backgroundColor,
          borderRadius: 16,
          overflow: "hidden",
          textAlign: "center",
          marginBottom: 14,
          color: theme.textColor,
        }}
      >
        <div style={{ height: 84, ...bannerStyle(user) }} />
        <div style={{ padding: "0 20px 20px" }}>
        <img
          src={user.avatar}
          alt=""
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            objectFit: "cover",
            border: `3px solid ${theme.accentColor}`,
            marginTop: -44,
          }}
        />
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginTop: 10,
            fontFamily: supernova ? user.theme.usernameFont : "inherit",
            color: theme.accentColor,
          }}
        >
          {user.username}
        </div>
        <div style={{ marginTop: 4 }}>{tierBadge(user.tier)}</div>
        {user.bio && (
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>{user.bio}</p>
        )}
        </div>
      </div>

      {!isMe && (
        <button
          className={`btn full ${isBlocked ? "ghost" : "danger"}`}
          onClick={() => dispatch({ type: "TOGGLE_BLOCK", userId })}
        >
          {isBlocked ? "Unblock" : "Block"}
        </button>
      )}
      {isBlocked && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
          Their messages are blurred and they can no longer contact you.
        </p>
      )}

      {canMod && member && (
        <>
          <div className="section-title">Moderation</div>
          {timedOut ? (
            <button
              className="btn ghost full"
              onClick={() => dispatch({ type: "CLEAR_TIMEOUT", serverId: server!.id, userId })}
            >
              Clear timeout
            </button>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn ghost sm"
                onClick={() => dispatch({ type: "TIMEOUT", serverId: server!.id, userId, minutes: 5 })}
              >
                Timeout 5m
              </button>
              <button
                className="btn ghost sm"
                onClick={() => dispatch({ type: "TIMEOUT", serverId: server!.id, userId, minutes: 60 })}
              >
                Timeout 1h
              </button>
            </div>
          )}
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button
              className="btn danger sm"
              onClick={() => {
                dispatch({ type: "KICK", serverId: server!.id, userId });
                onClose();
              }}
            >
              Kick
            </button>
            <button
              className="btn danger sm"
              onClick={() => {
                dispatch({ type: "BAN", serverId: server!.id, userId });
                onClose();
              }}
            >
              Ban
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
