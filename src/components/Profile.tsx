import { useStore } from "../store";
import { tierBadge } from "./Modal";

const FONTS = [
  { label: "Default", value: "system-ui" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'SF Mono', ui-monospace, monospace" },
  { label: "Script", value: "'Brush Script MT', cursive" },
  { label: "Fantasy", value: "'Papyrus', fantasy" },
];

export function Profile() {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  const canGif = user.tier === "premium" || user.tier === "supernova";
  const canCustomize = user.tier === "supernova";

  const showTheme = canCustomize;
  const theme = user.theme;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Profile</h1>
      </div>

      {/* Live preview — reflects supernova theming */}
      <div
        className="profile-hero"
        style={
          showTheme
            ? { background: theme.backgroundColor, color: theme.textColor }
            : undefined
        }
      >
        <img
          className="avatar"
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
          {user.username}
        </div>
        <div>{tierBadge(user.tier)}</div>
        <p className="bio">{user.bio || "No bio yet."}</p>
      </div>

      <div className="list">
        <div className="field">
          <label>Username</label>
          <input
            value={user.username}
            onChange={(e) => dispatch({ type: "UPDATE_PROFILE", username: e.target.value })}
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
