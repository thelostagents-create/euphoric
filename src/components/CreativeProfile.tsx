import { bannerStyle } from "./Modal";
import { displayName } from "../social";
import type { CreativeControl, User } from "../types";

/** A bordered box with an accent heading, used across all three layouts. */
function Box({ title, body, c, empty }: { title: string; body: string; c: CreativeControl; empty: string }) {
  return (
    <div style={{ background: c.cardColor, border: `1px solid ${c.borderColor}`, borderRadius: 6, padding: "7px 9px" }}>
      <div style={{ color: c.accentColor, fontWeight: 800, fontSize: 12 }}>{title}</div>
      <div style={{ color: c.textColor, fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap" }}>
        {body || <span style={{ opacity: 0.5 }}>{empty}</span>}
      </div>
    </div>
  );
}

function Banner({ user, h = 110 }: { user: User; h?: number }) {
  return <div style={{ height: h, borderRadius: 8, ...bannerStyle(user) }} />;
}

function Avatar({ user, c, size = 86 }: { user: User; c: CreativeControl; size?: number }) {
  return (
    <img
      src={user.avatar}
      alt=""
      style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", border: `2px solid ${c.accentColor}` }}
    />
  );
}

/** A fake window chrome bar with the user's title. */
function Chrome({ c, label }: { c: CreativeControl; label: string }) {
  return (
    <div
      style={{
        background: c.accentColor,
        color: c.bgColor,
        borderRadius: 6,
        padding: "5px 10px",
        fontWeight: 800,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ opacity: 0.8 }}>✕</span>
    </div>
  );
}

function Blurb({ user, c }: { user: User; c: CreativeControl }) {
  if (!user.blurb) return null;
  return (
    <div
      style={{
        background: c.cardColor,
        border: `1px solid ${c.borderColor}`,
        borderRadius: 6,
        padding: "5px 9px",
        fontWeight: 600,
        fontSize: 13,
        color: user.blurbColor,
      }}
    >
      {user.blurb}
    </div>
  );
}

/** Renders the user's Creative Control card in their chosen style. */
export function CreativeProfile({ user }: { user: User }) {
  const c = user.creative;
  const name = displayName(user);
  const wrap = (children: React.ReactNode) => (
    <div style={{ background: c.bgColor, borderRadius: 14, padding: 12, color: c.textColor, display: "grid", gap: 10 }}>
      {children}
    </div>
  );

  // ── Style 1: site window, banner at top, no social widgets ───────────
  if (c.style === 1) {
    return wrap(
      <>
        <Chrome c={c} label={c.title || `${name}.net`} />
        <Banner user={user} />
        <Blurb user={user} c={c} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <Avatar user={user} c={c} />
            <div style={{ fontWeight: 800, marginTop: 6, color: c.nameColor }}>@{user.username}</div>
            <div style={{ fontSize: 11, color: c.accentColor, fontWeight: 700 }}>ON-LINE</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontStyle: "italic", color: c.nameColor }}>My Profile</div>
            <div style={{ fontSize: 13, color: c.accentColor, marginBottom: 6 }}>{c.details || name}</div>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {user.bio || <span style={{ opacity: 0.5 }}>no bio yet</span>}
            </div>
          </div>
        </div>
        <Box title={c.box1Title} body={c.box1Body} c={c} empty="this user loves…" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Box title={c.box2Title} body={c.box2Body} c={c} empty="…" />
          <Box title={c.box3Title} body={c.box3Body} c={c} empty="…" />
        </div>
        <Box title={c.box4Title} body={c.box4Body} c={c} empty="…" />
      </>,
    );
  }

  // ── Style 2: browser window, banner at the bottom ────────────────────
  if (c.style === 2) {
    return wrap(
      <>
        <div style={{ display: "flex", gap: 6, alignItems: "center", color: c.accentColor, fontWeight: 700 }}>
          <span>←</span><span>→</span><span>⟳</span>
          <div style={{ flex: 1, background: c.cardColor, border: `1px solid ${c.borderColor}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, color: c.textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.title || `${user.username}.carrd.co`}
          </div>
        </div>
        <Blurb user={user} c={c} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.nameColor }}>{name}!</div>
            <div style={{ fontSize: 13, color: c.accentColor, marginBottom: 6 }}>{c.details || "your details"}</div>
            <Box title={c.box1Title} body={c.box1Body} c={c} empty="do not interact if…" />
            <div style={{ marginTop: 8 }}>
              <Box title={c.box2Title} body={c.box2Body} c={c} empty="before you follow…" />
            </div>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <Avatar user={user} c={c} size={96} />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Box title={c.box3Title} body={c.box3Body} c={c} empty="yes…" />
          <Box title={c.box4Title} body={c.box4Body} c={c} empty="no…" />
        </div>
        <Banner user={user} />
      </>,
    );
  }

  // ── Style 4: fandom card, loose box-grid layout (ported from Aesthetic) ─
  if (c.style === 4) {
    return wrap(
      <>
        <Chrome c={c} label={c.title || `${name}'s space`} />
        <Blurb user={user} c={c} />
        <Banner user={user} h={120} />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <Avatar user={user} c={c} size={72} />
            <div style={{ fontWeight: 800, marginTop: 6, color: c.nameColor }}>@{user.username}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>
            {user.bio || <span style={{ opacity: 0.5 }}>no bio yet</span>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Box title={c.box1Title} body={c.box1Body} c={c} empty="likes…" />
          <Box title={c.box2Title} body={c.box2Body} c={c} empty="dislikes…" />
        </div>
        <Box title={c.box3Title} body={c.box3Body} c={c} empty="before you follow…" />
        <Box title={c.box4Title} body={c.box4Body} c={c} empty="do not follow if…" />
      </>,
    );
  }

  // ── Style 3: archive window, banner at the top ───────────────────────
  return wrap(
    <>
      <Banner user={user} h={90} />
      <Chrome c={c} label={c.title || "ARCH!VE"} />
      <Blurb user={user} c={c} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ textAlign: "center" }}>
            <Avatar user={user} c={c} size={80} />
            <div style={{ fontWeight: 800, marginTop: 4, color: c.nameColor }}>{name}</div>
            <div style={{ fontSize: 12, color: c.accentColor }}>{c.details || "your details"}</div>
          </div>
          <Box title={c.box1Title} body={c.box1Body} c={c} empty="before you follow…" />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Box title={c.box2Title} body={c.box2Body} c={c} empty=":D likes…" />
          <Box title={c.box3Title} body={c.box3Body} c={c} empty="booo dislikes…" />
          <Box title={c.box4Title} body={c.box4Body} c={c} empty="dem friends…" />
        </div>
      </div>
    </>,
  );
}
