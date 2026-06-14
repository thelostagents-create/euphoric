import { useState } from "react";
import { useStore } from "../store";
import { bannerStyle, tierBadge } from "./Modal";
import { displayName, usernameTaken } from "../social";

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
          <label>Nickname (shown in chat — set this if you couldn't get the username you wanted)</label>
          <input
            value={user.nickname}
            placeholder={user.username}
            onChange={(e) => dispatch({ type: "UPDATE_PROFILE", nickname: e.target.value })}
          />
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
            Avatar URL {canGif ? "(animated GIFs allowed ✨)" : "(static only)"}
          </label>
          <input
            value={user.avatar}
            onChange={(e) => dispatch({ type: "UPDATE_PROFILE", avatar: e.target.value })}
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
              <label>Banner image URL (GIFs allowed ✨)</label>
              <input
                value={user.banner.image}
                placeholder="https://…"
                onChange={(e) => dispatch({ type: "UPDATE_BANNER", image: e.target.value })}
              />
              {user.banner.image && (
                <button
                  className="btn ghost sm"
                  style={{ marginTop: 8 }}
                  onClick={() => dispatch({ type: "UPDATE_BANNER", image: "" })}
                >
                  Remove image
                </button>
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
              MySpace-style colors and custom username fonts are a <b>Supernova</b> feature.
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
