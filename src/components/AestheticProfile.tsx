import { bannerStyle } from "./Modal";
import { displayName } from "../social";
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

/** "Aesthetic avatar" profile — a clean site-window layout with 2 boxes.
 *  Free for everyone; the fuller fandom layout lives in Creative Control. */
export function AestheticProfile({ user }: { user: User }) {
  const a = user.aesthetic;

  return (
    <div style={{ background: a.bgColor, borderRadius: 16, padding: 12, color: a.textColor }}>
      {/* window chrome title bar */}
      <div
        style={{
          background: a.accentColor,
          color: a.bgColor,
          borderRadius: 8,
          padding: "6px 12px",
          fontWeight: 800,
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.title || `${displayName(user)}.net`}
        </span>
        <span style={{ opacity: 0.8 }}>✕</span>
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
    </div>
  );
}
