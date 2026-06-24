import { useState } from "react";
import { useStore } from "../store";
import { bannerStyle } from "./Modal";
import { displayName } from "../social";
import { getMember } from "../permissions";
import { ServerIcon } from "./ServerIcon";
import type { User } from "../types";

/** A filled box with an accent heading. */
function Box({
  title,
  body,
  a,
  empty,
}: {
  title: string;
  body: string;
  a: User["aesthetic"];
  empty: string;
}) {
  return (
    <div style={{ background: a.cardColor, border: `1px solid ${a.accentColor}`, borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ color: a.accentColor, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>
        {title}
      </div>
      <div style={{ color: a.textColor, fontSize: 13, marginTop: 3, whiteSpace: "pre-wrap" }}>
        {body || <span style={{ opacity: 0.5 }}>{empty}</span>}
      </div>
    </div>
  );
}

/** "Aesthetic avatar" profile — a clean site-window layout with 3 boxes.
 *  Free for everyone; the fuller fandom layout lives in Creative Control. */
export function AestheticProfile({ user }: { user: User }) {
  const { state, dispatch } = useStore();
  const a = user.aesthetic;
  const [joined, setJoined] = useState(false);

  const repServer = a.repServerId ? state.servers.find((s) => s.id === a.repServerId) : undefined;
  const alreadyMember = repServer ? !!getMember(repServer, state.currentUserId) : false;

  function repClick() {
    if (!repServer || alreadyMember) return;
    dispatch({ type: "JOIN_SERVER", serverId: repServer.id });
    setJoined(true);
  }

  return (
    <div style={{ background: a.bgColor, borderRadius: 16, padding: 12, color: a.textColor }}>
      {/* browser-tab title bar — a real-looking tab sitting on a toolbar edge */}
      <div style={{ display: "flex", borderBottom: `2px solid ${a.accentColor}`, marginBottom: 10 }}>
        <div
          style={{
            background: a.accentColor,
            color: a.bgColor,
            borderRadius: "9px 9px 0 0",
            padding: "5px 11px",
            fontWeight: 700,
            fontSize: 13,
            maxWidth: "88%",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {/* favicon dot */}
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.bgColor, opacity: 0.75, flex: "0 0 auto" }} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {a.title || `${displayName(user)}.net`}
          </span>
          <span style={{ opacity: 0.7, flex: "0 0 auto" }}>✕</span>
        </div>
      </div>

      {/* banner (from main profile) */}
      <div style={{ height: 120, borderRadius: 10, ...bannerStyle(user) }} />

      {/* blurb — shown right under the banner */}
      {user.blurb && (
        <div
          style={{
            background: a.cardColor,
            border: `1px solid ${a.accentColor}`,
            borderRadius: 8,
            padding: "6px 10px",
            marginTop: 10,
            fontWeight: 600,
            fontSize: 13,
            color: user.blurbColor,
          }}
        >
          {user.blurb}
        </div>
      )}

      {/* identity — avatar + status on the left, profile heading + bio on the right */}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          <img
            src={user.avatar}
            alt=""
            style={{ width: 86, height: 86, borderRadius: 8, objectFit: "cover", border: `2px solid ${a.accentColor}` }}
          />
          <div style={{ fontWeight: 800, marginTop: 6, color: a.nameColor }}>@{user.username}</div>
          <div style={{ fontSize: 11, color: a.accentColor, fontWeight: 700 }}>ON-LINE</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontStyle: "italic", color: a.nameColor }}>My Profile</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginTop: 4 }}>
            {user.bio || <span style={{ opacity: 0.5 }}>no bio yet</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <Box title={a.likesTitle || "Likes"} body={a.likes} a={a} empty="add your likes" />
        <Box title={a.dislikesTitle || "Dislikes"} body={a.dislikes} a={a} empty="add your dislikes" />
      </div>
      <div style={{ marginTop: 8 }}>
        <Box title={a.beforeTitle || "Before you follow"} body={a.beforeFollow} a={a} empty="a little intro…" />
      </div>

      {/* repped server — tap the icon to join */}
      {repServer && (
        <button
          onClick={repClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            marginTop: 10,
            background: a.cardColor,
            border: `1px solid ${a.accentColor}`,
            borderRadius: 8,
            padding: "8px 10px",
            color: a.textColor,
            textAlign: "left",
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
            <ServerIcon server={repServer} size={20} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, opacity: 0.7, display: "block" }}>repping</span>
            <b>{repServer.name}</b>
          </span>
          <span style={{ color: a.accentColor, fontWeight: 700, fontSize: 13 }}>
            {joined || alreadyMember ? "Joined ✓" : "Join →"}
          </span>
        </button>
      )}
    </div>
  );
}
