import { useState } from "react";
import { useStore } from "../store";
import { bannerStyle, tierBadge } from "./Modal";
import { displayName, usernameTaken } from "../social";
import { getMember } from "../permissions";
import { ImagePicker } from "./ImagePicker";
import { AestheticProfile } from "./AestheticProfile";
import { CreativeProfile } from "./CreativeProfile";
import { isNativeIOS } from "../lib/platform";
import type { CreativeControl } from "../types";

const FONTS = [
  { label: "Default", value: "system-ui" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'SF Mono', ui-monospace, monospace" },
  { label: "Script", value: "'Brush Script MT', cursive" },
  { label: "Fantasy", value: "'Papyrus', fantasy" },
];

type ProfileMode = "standard" | "aesthetic" | "creative";

export function Profile({ onManageSubscription }: { onManageSubscription: () => void }) {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  const canGif = user.tier === "premium" || user.tier === "supernova";
  const canCustomize = user.tier === "supernova"; // aesthetic / creative profiles
  const canFont = canGif; // custom username font is paid

  const theme = user.theme;
  const a = user.aesthetic;
  const c = user.creative;

  // A single source of truth for which profile style is active. Creative wins
  // if both legacy flags are on (matches the viewer in UserSheet).
  const mode: ProfileMode = c.enabled ? "creative" : a.enabled ? "aesthetic" : "standard";
  function setMode(m: ProfileMode) {
    dispatch({ type: "UPDATE_AESTHETIC", patch: { enabled: m === "aesthetic" } });
    dispatch({ type: "UPDATE_CREATIVE", patch: { enabled: m === "creative" } });
  }

  function setAesthetic(patch: Partial<typeof a>) {
    dispatch({ type: "UPDATE_AESTHETIC", patch });
  }

  const [showBasics, setShowBasics] = useState(false);

  // Usernames are unique and claimed explicitly.
  const [nameDraft, setNameDraft] = useState(user.username);
  const trimmed = nameDraft.trim();
  const hasSpace = /\s/.test(trimmed);
  const taken = !!trimmed && !hasSpace && usernameTaken(state, trimmed, user.id);
  const changed = trimmed !== user.username;
  const canClaim = !!trimmed && !hasSpace && !taken && changed;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Profile</h1>
      </div>

      {/* Live preview — reflects banner + theming */}
      <div className="profile-banner" style={bannerStyle(user)} />
      <div
        className="profile-hero"
        style={{ background: theme.backgroundColor, color: theme.textColor }}
      >
        <img
          className="avatar overlap"
          src={user.avatar}
          alt=""
          style={{ borderColor: theme.accentColor }}
        />
        <div
          className="username"
          style={{ fontFamily: canFont ? theme.usernameFont : "inherit", color: theme.nameColor }}
        >
          {displayName(user)}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>@{user.username}</div>
        <div style={{ marginTop: 4 }}>{tierBadge(user.tier)}</div>
        {user.blurb && (
          <div className="blurb-block" style={{ color: user.blurbColor }}>{user.blurb}</div>
        )}
        <p className="bio">{user.bio || "No bio yet."}</p>
      </div>

      <div className="list">
        {!isNativeIOS() && (
          <button className="btn ghost full" onClick={onManageSubscription}>
            ⭐ Manage subscription
          </button>
        )}

        {/* ── Identity ─────────────────────────────────────── */}
        <div className="field">
          <label>Username (unique — one per person)</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              style={taken ? { borderColor: "var(--danger)" } : undefined}
            />
            <button
              className="btn sm"
              disabled={!canClaim}
              onClick={() => dispatch({ type: "UPDATE_PROFILE", username: trimmed })}
            >
              Claim
            </button>
          </div>
          {hasSpace ? (
            <p style={{ fontSize: 12, marginTop: 5, color: "var(--danger)" }}>
              Username can't contain spaces.
            </p>
          ) : taken ? (
            <p style={{ fontSize: 12, marginTop: 5, color: "var(--danger)" }}>
              "{trimmed}" is already taken.
            </p>
          ) : (
            changed && (
              <p className="muted" style={{ fontSize: 12, marginTop: 5 }}>"{trimmed}" is available.</p>
            )
          )}
        </div>

        <div className="field">
          <label>Nickname</label>
          <input
            value={user.nickname}
            placeholder={user.username}
            onChange={(e) => dispatch({ type: "UPDATE_PROFILE", nickname: e.target.value })}
          />
        </div>

        {/* ── Profile basics (shared by every style) ───────── */}
        <button
          className="btn ghost full"
          onClick={() => setShowBasics((v) => !v)}
          style={{ textAlign: "left", marginTop: 4 }}
        >
          Profile basics {showBasics ? "▲" : "▼"}
        </button>
        {showBasics && (
          <>
            <div className="field">
              <label>
                Avatar — import or paste a URL {canGif ? "(animated GIFs allowed ✨)" : "(static only)"}
              </label>
              <ImagePicker
                value={user.avatar}
                placeholder="https://…"
                onChange={(v) => dispatch({ type: "UPDATE_PROFILE", avatar: v })}
              />
              {!canGif && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Upgrade to Premium to use an animated GIF avatar.
                </p>
              )}
            </div>

            <BlurbEditor />

            <div className="field">
              <label>Bio</label>
              <textarea
                rows={3}
                value={user.bio}
                placeholder="Tell people about yourself…"
                onChange={(e) => dispatch({ type: "UPDATE_PROFILE", bio: e.target.value })}
              />
            </div>

            <div className="card">
              <HexField label="Banner color" value={user.banner.color} onChange={(v) => dispatch({ type: "UPDATE_BANNER", color: v })} />
              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Banner image — import or paste a URL {canGif ? "(GIFs allowed ✨)" : "(static only — GIFs need Premium)"}</label>
                <ImagePicker
                  value={user.banner.image}
                  placeholder="https://…"
                  onChange={(v) => dispatch({ type: "UPDATE_BANNER", image: v })}
                />
                {user.banner.image && (
                  <>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", margin: "12px 0 5px", fontWeight: 600 }}>
                      Crop — drag to choose which part of the banner shows
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={user.banner.position}
                      onChange={(e) => dispatch({ type: "UPDATE_BANNER", position: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                    <button
                      className="btn ghost sm"
                      style={{ marginTop: 8 }}
                      onClick={() => dispatch({ type: "UPDATE_BANNER", image: "" })}
                    >
                      Remove image
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Profile style picker ─────────────────────────── */}
        <div className="section-title">Profile style</div>
        <div className="card">
          <div className="chips">
            <button
              className={`chip ${mode === "standard" ? "accent" : ""}`}
              onClick={() => setMode("standard")}
            >
              Standard
            </button>
            <button
              className={`chip ${mode === "aesthetic" ? "accent" : ""}`}
              onClick={() => setMode("aesthetic")}
            >
              🎨 Aesthetic
            </button>
            <button
              className={`chip ${mode === "creative" ? "accent" : ""}`}
              disabled={!canCustomize}
              onClick={() => canCustomize && setMode("creative")}
            >
              🪟 Creative {canCustomize ? "" : "🔒"}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
            {mode === "standard" && "The classic profile card with your banner, avatar and colors."}
            {mode === "aesthetic" && "A clean site-window card with two boxes — free for everyone."}
            {mode === "creative" && "A window-style profile card in one of four layouts."}
            {!canCustomize && " Creative Control is a Supernova feature."}
          </p>
        </div>

        {/* ── Style-specific controls ──────────────────────── */}
        {mode === "standard" && <StandardThemeSection canFont={canFont} />}
        {mode === "aesthetic" && (
          <AestheticSection user={user} setAesthetic={setAesthetic} />
        )}
        {mode === "creative" && canCustomize && <CreativeControlSection />}
      </div>
    </div>
  );
}

/** Standard-mode theming: username font + the four profile colors. */
function StandardThemeSection({ canFont }: { canFont: boolean }) {
  const { state, dispatch } = useStore();
  const theme = state.users[state.currentUserId].theme;
  return (
    <>
      <div className="section-title">Profile theme</div>
      <div className="card">
        <div className="field">
          <label>Username font {canFont ? "" : "(Premium)"}</label>
          {canFont ? (
            <div className="chips">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  className={`chip ${theme.usernameFont === f.value ? "accent" : ""}`}
                  style={{ fontFamily: f.value }}
                  onClick={() => dispatch({ type: "UPDATE_THEME", theme: { usernameFont: f.value } })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Custom username fonts are a <b>Premium</b> feature.
            </p>
          )}
        </div>
        <div className="row" style={{ gap: 12 }}>
          <HexField label="Background" value={theme.backgroundColor} onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { backgroundColor: v } })} />
          <HexField label="Accent" value={theme.accentColor} onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { accentColor: v } })} />
        </div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <HexField label="Name" value={theme.nameColor} onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { nameColor: v } })} />
          <HexField label="Description" value={theme.textColor} onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { textColor: v } })} />
        </div>
      </div>
    </>
  );
}

/** Aesthetic-mode controls — only the fields unique to this layout. */
function AestheticSection({
  user,
  setAesthetic,
}: {
  user: ReturnType<typeof useStore>["state"]["users"][string];
  setAesthetic: (patch: Partial<typeof user.aesthetic>) => void;
}) {
  const { state } = useStore();
  const a = user.aesthetic;
  const myServers = state.servers.filter((s) => getMember(s, user.id));

  return (
    <>
      <div className="section-title">Aesthetic profile</div>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <AestheticProfile user={user} />
        </div>

        <div className="field">
          <label>Title</label>
          <input value={a.title} placeholder="your space ✨" onChange={(e) => setAesthetic({ title: e.target.value })} />
        </div>

        <div className="section-title" style={{ marginTop: 6 }}>Colors</div>
        <div className="row" style={{ gap: 12 }}>
          <HexField label="Background" value={a.bgColor} onChange={(v) => setAesthetic({ bgColor: v })} />
          <HexField label="Card" value={a.cardColor} onChange={(v) => setAesthetic({ cardColor: v })} />
        </div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <HexField label="Accent" value={a.accentColor} onChange={(v) => setAesthetic({ accentColor: v })} />
          <HexField label="Text" value={a.textColor} onChange={(v) => setAesthetic({ textColor: v })} />
        </div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <HexField label="Name" value={a.nameColor} onChange={(v) => setAesthetic({ nameColor: v })} />
        </div>

        <div className="section-title" style={{ marginTop: 6 }}>Boxes (rename any header)</div>
        <BoxEditor headerValue={a.likesTitle} onHeader={(v) => setAesthetic({ likesTitle: v })} bodyValue={a.likes} onBody={(v) => setAesthetic({ likes: v })} multiline />
        <BoxEditor headerValue={a.dislikesTitle} onHeader={(v) => setAesthetic({ dislikesTitle: v })} bodyValue={a.dislikes} onBody={(v) => setAesthetic({ dislikes: v })} multiline />
        <BoxEditor headerValue={a.beforeTitle} onHeader={(v) => setAesthetic({ beforeTitle: v })} bodyValue={a.beforeFollow} onBody={(v) => setAesthetic({ beforeFollow: v })} multiline />

        <div className="field">
          <label>Rep a party (its icon links to joining it)</label>
          <div className="chips">
            <button
              className={`chip ${a.repServerId === "" ? "accent" : ""}`}
              onClick={() => setAesthetic({ repServerId: "" })}
            >
              None
            </button>
            {myServers.map((s) => (
              <button
                key={s.id}
                className={`chip ${a.repServerId === s.id ? "accent" : ""}`}
                onClick={() => setAesthetic({ repServerId: s.id })}
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function BoxEditor({
  headerValue,
  onHeader,
  bodyValue,
  onBody,
  multiline,
}: {
  headerValue: string;
  onHeader: (v: string) => void;
  bodyValue: string;
  onBody: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="field">
      <input
        value={headerValue}
        onChange={(e) => onHeader(e.target.value)}
        placeholder="Header"
        style={{ fontWeight: 700, marginBottom: 6 }}
      />
      {multiline ? (
        <textarea rows={2} value={bodyValue} onChange={(e) => onBody(e.target.value)} />
      ) : (
        <input value={bodyValue} onChange={(e) => onBody(e.target.value)} />
      )}
    </div>
  );
}

function HexField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div className="row" style={{ gap: 6 }}>
        <input type="color" className="swatch" value={value} onChange={(e) => onChange(e.target.value)} />
        <input value={value} placeholder="#aabbcc" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function BlurbEditor() {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  return (
    <div className="field">
      <label>Blurb (a short status shown above your banner)</label>
      <input
        value={user.blurb}
        placeholder="e.g. 🌙 chilling tonight"
        maxLength={60}
        onChange={(e) => dispatch({ type: "UPDATE_PROFILE", blurb: e.target.value })}
      />
      {/* Color picker + hex code sit directly below the blurb input. */}
      <div className="row" style={{ gap: 6, marginTop: 6, alignItems: "center" }}>
        <input
          type="color"
          className="swatch"
          value={user.blurbColor}
          onChange={(e) => dispatch({ type: "UPDATE_PROFILE", blurbColor: e.target.value })}
        />
        <input
          value={user.blurbColor}
          placeholder="#aabbcc"
          onChange={(e) => dispatch({ type: "UPDATE_PROFILE", blurbColor: e.target.value })}
        />
      </div>
    </div>
  );
}

const CREATIVE_STYLES: { id: 1 | 2 | 3 | 4; label: string; desc: string }[] = [
  { id: 2, label: "Browser card", desc: "URL bar with the banner at the bottom." },
  { id: 4, label: "Fandom card", desc: "Loose box-grid with likes, dislikes and follow notes." },
  { id: 3, label: "Archive card", desc: "Two columns with the banner at the top." },
  { id: 1, label: "Site card", desc: "Window with the banner up top." },
];

/** Creative-mode controls — only the fields unique to this layout. */
function CreativeControlSection() {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  const c = user.creative;
  const myServers = state.servers.filter((s) => getMember(s, user.id));

  function setCreative(patch: Partial<CreativeControl>) {
    dispatch({ type: "UPDATE_CREATIVE", patch });
  }

  function setGalleryAt(i: number, url: string) {
    const g = [...(c.gallery ?? [])];
    while (g.length < 3) g.push("");
    g[i] = url;
    setCreative({ gallery: g.slice(0, 3) });
  }

  return (
    <>
      <div className="section-title">Creative Control</div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Style</div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {CREATIVE_STYLES.map((s) => (
            <button
              key={s.id}
              className={`chip ${c.style === s.id ? "accent" : ""}`}
              onClick={() => setCreative({ style: s.id })}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <CreativeProfile user={user} />
        </div>

        <div className="field">
          <label>Window title</label>
          <input value={c.title} placeholder="yoursite.net" onChange={(e) => setCreative({ title: e.target.value })} />
        </div>
        <div className="field">
          <label>Details line (pronouns / age / etc)</label>
          <input value={c.details} placeholder="16 · she/they · pisces" onChange={(e) => setCreative({ details: e.target.value })} />
        </div>

        <div className="section-title" style={{ marginTop: 6 }}>Colors</div>
        <div className="row" style={{ gap: 12 }}>
          <HexField label="Background" value={c.bgColor} onChange={(v) => setCreative({ bgColor: v })} />
          <HexField label="Card" value={c.cardColor} onChange={(v) => setCreative({ cardColor: v })} />
        </div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <HexField label="Accent" value={c.accentColor} onChange={(v) => setCreative({ accentColor: v })} />
          <HexField label="Text" value={c.textColor} onChange={(v) => setCreative({ textColor: v })} />
        </div>
        <div className="row" style={{ gap: 12, marginTop: 8 }}>
          <HexField label="Name" value={c.nameColor} onChange={(v) => setCreative({ nameColor: v })} />
          <HexField label="Border" value={c.borderColor} onChange={(v) => setCreative({ borderColor: v })} />
        </div>

        <div className="section-title" style={{ marginTop: 6 }}>Boxes (rename any header)</div>
        <BoxEditor headerValue={c.box1Title} onHeader={(v) => setCreative({ box1Title: v })} bodyValue={c.box1Body} onBody={(v) => setCreative({ box1Body: v })} multiline />
        <BoxEditor headerValue={c.box2Title} onHeader={(v) => setCreative({ box2Title: v })} bodyValue={c.box2Body} onBody={(v) => setCreative({ box2Body: v })} multiline />
        <BoxEditor headerValue={c.box3Title} onHeader={(v) => setCreative({ box3Title: v })} bodyValue={c.box3Body} onBody={(v) => setCreative({ box3Body: v })} multiline />
        <BoxEditor headerValue={c.box4Title} onHeader={(v) => setCreative({ box4Title: v })} bodyValue={c.box4Body} onBody={(v) => setCreative({ box4Body: v })} multiline />

        {/* Fandom card extras: a gallery and a repped party. */}
        {c.style === 4 && (
          <>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Gallery images (up to 3)</label>
              {[0, 1, 2].map((i) => (
                <div key={i} className="row" style={{ gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ImagePicker value={(c.gallery ?? [])[i] ?? ""} placeholder={`image ${i + 1}`} onChange={(v) => setGalleryAt(i, v)} />
                  </div>
                  {(c.gallery ?? [])[i] && (
                    <button className="btn ghost sm" title="Remove image" onClick={() => setGalleryAt(i, "")}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="field">
              <label>Rep a party (its icon links to joining it)</label>
              <div className="chips">
                <button
                  className={`chip ${(c.repServerId ?? "") === "" ? "accent" : ""}`}
                  onClick={() => setCreative({ repServerId: "" })}
                >
                  None
                </button>
                {myServers.map((s) => (
                  <button
                    key={s.id}
                    className={`chip ${c.repServerId === s.id ? "accent" : ""}`}
                    onClick={() => setCreative({ repServerId: s.id })}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
