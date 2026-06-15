import { useState } from "react";
import { useStore } from "../store";
import { bannerStyle, tierBadge } from "./Modal";
import { displayName, usernameTaken } from "../social";
import { ImagePicker } from "./ImagePicker";
import { AestheticProfile } from "./AestheticProfile";

const FONTS = [
  { label: "Default", value: "system-ui" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'SF Mono', ui-monospace, monospace" },
  { label: "Script", value: "'Brush Script MT', cursive" },
  { label: "Fantasy", value: "'Papyrus', fantasy" },
];

export function Profile({ onManageSubscription }: { onManageSubscription: () => void }) {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  const canGif = user.tier === "premium" || user.tier === "supernova";
  const canCustomize = user.tier === "supernova";

  const showTheme = canCustomize;
  const theme = user.theme;
  const a = user.aesthetic;

  function setAesthetic(patch: Partial<typeof a>) {
    dispatch({ type: "UPDATE_AESTHETIC", patch });
  }
  function setGalleryAt(i: number, url: string) {
    const g = [...a.gallery];
    while (g.length < 6) g.push("");
    g[i] = url;
    setAesthetic({ gallery: g });
  }

  // Usernames are unique and claimed explicitly.
  const [nameDraft, setNameDraft] = useState(user.username);
  const trimmed = nameDraft.trim();
  const taken = !!trimmed && usernameTaken(state, trimmed, user.id);
  const changed = trimmed !== user.username;
  const canClaim = !!trimmed && !taken && changed;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Profile</h1>
      </div>

      {/* Live preview — reflects banner + supernova theming */}
      <div className="profile-banner" style={bannerStyle(user)} />
      <div
        className="profile-hero"
        style={
          showTheme
            ? { background: theme.backgroundColor, color: theme.textColor }
            : undefined
        }
      >
        <img
          className="avatar overlap"
          src={user.avatar}
          alt=""
          style={{ borderColor: showTheme ? theme.accentColor : "var(--accent)" }}
        />
        <div
          className="username"
          style={
            showTheme
              ? { fontFamily: theme.usernameFont, color: theme.accentColor }
              : undefined
          }
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
        <button className="btn ghost full" onClick={onManageSubscription}>
          ⭐ Manage subscription
        </button>

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
          {taken ? (
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

        <div className="field">
          <label>Blurb (a short status shown on your profile)</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              type="color"
              className="swatch"
              value={user.blurbColor}
              onChange={(e) => dispatch({ type: "UPDATE_PROFILE", blurbColor: e.target.value })}
            />
            <input
              value={user.blurb}
              placeholder="e.g. 🌙 chilling tonight"
              maxLength={60}
              onChange={(e) => dispatch({ type: "UPDATE_PROFILE", blurb: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label>Bio</label>
          <textarea
            rows={3}
            value={user.bio}
            placeholder="Tell people about yourself…"
            onChange={(e) => dispatch({ type: "UPDATE_PROFILE", bio: e.target.value })}
          />
        </div>

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

        <div className="section-title">Banner</div>
        <div className="card">
          <div className="field" style={{ marginBottom: canGif ? 12 : 0 }}>
            <label>Banner color</label>
            <div className="row">
              <input
                type="color"
                className="swatch"
                value={user.banner.color}
                onChange={(e) => dispatch({ type: "UPDATE_BANNER", color: e.target.value })}
              />
              <span className="muted" style={{ fontSize: 12 }}>
                Everyone can pick a banner color.
              </span>
            </div>
          </div>
          {canGif ? (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Banner image — import or paste a URL (GIFs allowed ✨)</label>
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
          ) : (
            <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
              Upgrade to <b>Premium</b> to set a banner image.
            </p>
          )}
        </div>

        <div className="section-title">Profile Theme</div>
        {!canCustomize ? (
          <div className="card">
            <p className="desc" style={{ margin: 0 }}>
              Premium color customization and custom username fonts are a <b>Supernova</b> feature.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="field">
              <label>Username font</label>
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
            </div>
            <div className="row" style={{ gap: 16 }}>
              <ColorField
                label="Background"
                value={theme.backgroundColor}
                onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { backgroundColor: v } })}
              />
              <ColorField
                label="Accent"
                value={theme.accentColor}
                onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { accentColor: v } })}
              />
              <ColorField
                label="Text"
                value={theme.textColor}
                onChange={(v) => dispatch({ type: "UPDATE_THEME", theme: { textColor: v } })}
              />
            </div>
          </div>
        )}

        <div className="section-title">Aesthetic Avatars</div>
        {!canCustomize ? (
          <div className="card">
            <p className="desc" style={{ margin: 0 }}>
              Aesthetic Avatars — a custom, fill-in profile card — is a <b>Supernova</b> feature.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Aesthetic profile</div>
                <div className="muted" style={{ fontSize: 12 }}>Replace your profile with a custom card.</div>
              </div>
              <button
                className={`toggle ${a.enabled ? "on" : ""}`}
                onClick={() => setAesthetic({ enabled: !a.enabled })}
              />
            </div>

            {a.enabled && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <AestheticProfile user={user} />
                </div>

                <div className="field">
                  <label>Title</label>
                  <input value={a.title} placeholder="your space ✨" onChange={(e) => setAesthetic({ title: e.target.value })} />
                </div>

                <div className="row" style={{ gap: 12 }}>
                  <HexField label="Background" value={a.bgColor} onChange={(v) => setAesthetic({ bgColor: v })} />
                  <HexField label="Card" value={a.cardColor} onChange={(v) => setAesthetic({ cardColor: v })} />
                </div>
                <div className="row" style={{ gap: 12, marginTop: 8 }}>
                  <HexField label="Accent" value={a.accentColor} onChange={(v) => setAesthetic({ accentColor: v })} />
                  <HexField label="Text" value={a.textColor} onChange={(v) => setAesthetic({ textColor: v })} />
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>Likes</label>
                  <input value={a.likes} onChange={(e) => setAesthetic({ likes: e.target.value })} />
                </div>
                <div className="field">
                  <label>Dislikes</label>
                  <input value={a.dislikes} onChange={(e) => setAesthetic({ dislikes: e.target.value })} />
                </div>
                <div className="field">
                  <label>Before you follow</label>
                  <textarea rows={2} value={a.beforeFollow} onChange={(e) => setAesthetic({ beforeFollow: e.target.value })} />
                </div>
                <div className="field">
                  <label>Do not follow if…</label>
                  <textarea rows={2} value={a.doNotFollow} onChange={(e) => setAesthetic({ doNotFollow: e.target.value })} />
                </div>

                <div className="field">
                  <label>Gallery images (up to 6)</label>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <ImagePicker value={a.gallery[i] ?? ""} placeholder={`image ${i + 1}`} onChange={(v) => setGalleryAt(i, v)} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <input type="color" className="swatch" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  );
}
