import { useStore } from "../store";
import { Modal, bannerStyle, tierBadge } from "./Modal";
import { canModerate, getMember, isTimedOut } from "../permissions";
import { areFriends, displayName } from "../social";
import { AestheticProfile } from "./AestheticProfile";
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
  const isFollowing = me.following.includes(userId);
  const followsMe = user.following.includes(me.id);
  const friends = areFriends(me, user);
  const supernova = user.tier === "supernova";

  // Premium color theming only applies to supernova profiles.
  const theme = supernova
    ? user.theme
    : { backgroundColor: "var(--bg-2)", accentColor: "var(--accent)", textColor: "var(--text)", usernameFont: "inherit" };

  const canMod = server && canModerate(server, state.currentUserId, userId);
  const member = server && getMember(server, userId);
  const timedOut = isTimedOut(member);

  const aesthetic = user.aesthetic.enabled && supernova;

  return (
    <Modal title="" onClose={onClose}>
      {aesthetic ? (
        <div style={{ marginBottom: 14 }}>
          <AestheticProfile user={user} />
          <div style={{ textAlign: "center", marginTop: 8 }}>{tierBadge(user.tier)}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {user.blurb && (
            <div className="blurb-block" style={{ color: user.blurbColor, marginBottom: 10 }}>{user.blurb}</div>
          )}
          <div
            style={{
              background: theme.backgroundColor,
              borderRadius: 16,
              overflow: "hidden",
              textAlign: "center",
              color: theme.textColor,
            }}
          >
            <div style={{ height: 110, ...bannerStyle(user) }} />
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
              {displayName(user)}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>@{user.username}</div>
            <div style={{ marginTop: 4 }}>{tierBadge(user.tier)}</div>
            {user.bio && (
              <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>{user.bio}</p>
            )}
          </div>
          </div>
        </div>
      )}

      {!isMe && !isBlocked && (
        <>
          <div className="row" style={{ gap: 8 }}>
            <button
              className={`btn full ${isFollowing ? "ghost" : ""}`}
              onClick={() => dispatch({ type: "TOGGLE_FOLLOW", userId })}
            >
              {friends ? "✓ Friends" : isFollowing ? "Following" : "Follow"}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0", textAlign: "center" }}>
            {friends
              ? "You follow each other — you're friends."
              : followsMe
                ? "Follows you. Follow back to become friends."
                : "Follow back to become friends."}
          </p>
        </>
      )}

      {!isMe && (
        <button
          className={`btn full ${isBlocked ? "ghost" : "danger"}`}
          style={{ marginTop: 10 }}
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
