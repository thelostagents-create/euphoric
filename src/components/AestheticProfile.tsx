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

/** "Aesthetic avatars" profile card — a loose, link-free profile layout. */
export function AestheticProfile({ user }: { user: User }) {
  const a = user.aesthetic;
  return (
    <div style={{ background: a.bgColor, borderRadius: 16, padding: 12, color: a.textColor }}>
      {/* title bar */}
      <div
        style={{
          background: a.accentColor,
          color: a.bgColor,
          borderRadius: 8,
          padding: "6px 12px",
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {a.title || `${displayName(user)}'s space`}
      </div>

      {/* banner (from main profile) */}
      <div style={{ height: 96, borderRadius: 10, ...bannerStyle(user) }} />

      {/* identity + likes/dislikes */}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <div style={{ flex: "0 0 auto", textAlign: "center" }}>
          <img
            src={user.avatar}
            alt=""
            style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: `2px solid ${a.accentColor}` }}
          />
          <div style={{ fontWeight: 800, marginTop: 6, color: a.accentColor }}>@{user.username}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>
          {user.bio || <span style={{ opacity: 0.5 }}>no bio yet</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <Box title="Likes" body={a.likes} a={a} empty="add your likes" />
        <Box title="Dislikes" body={a.dislikes} a={a} empty="add your dislikes" />
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <Box title="Before you follow" body={a.beforeFollow} a={a} empty="a little intro…" />
        <Box title="Do not follow if…" body={a.doNotFollow} a={a} empty="your boundaries…" />
      </div>

      {a.gallery.some(Boolean) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
          {a.gallery.filter(Boolean).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, border: `1px solid ${a.accentColor}` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
