import { resetState, useStore } from "../store";
import type { Tier } from "../types";
import { starCapacity, starsAvailable } from "../social";

const TIERS: {
  id: Tier;
  name: string;
  price: string;
  perks: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    perks: ["Partys, lounges & roles", "Profile colors & static banner", "Join unlimited partys"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$5/mo",
    perks: [
      "Everything in Free",
      "Animated GIF avatar & banner",
      "Custom username font",
      "1 ⭐ Star to spend on a party",
    ],
  },
  {
    id: "supernova",
    name: "Supernova",
    price: "$8/mo",
    perks: [
      "Everything in Premium",
      "Aesthetic Avatars profiles",
      "2 ⭐ Stars to spend on partys",
    ],
  },
];

/** Full Settings screen (its own tab). */
export function Settings() {
  return (
    <div className="screen">
      <div className="topbar">
        <h1>Settings</h1>
      </div>
      <div className="list">
        <AccountSettings />
      </div>
    </div>
  );
}

/** Account settings sections, reusable without screen chrome. */
export function AccountSettings() {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];

  const blocked = user.blockedUserIds
    .map((id) => state.users[id])
    .filter(Boolean);

  return (
    <>
      <div className="section-title">Appearance</div>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Light mode</div>
            <div className="muted" style={{ fontSize: 12 }}>Switch between dark and light themes.</div>
          </div>
          <button
            className={`toggle ${user.lightMode ? "on" : ""}`}
            onClick={() => dispatch({ type: "SET_LIGHT_MODE", on: !user.lightMode })}
          />
        </div>
        <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>App accent color</label>
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <input
            type="color"
            className="swatch"
            value={user.appAccent}
            onChange={(e) => dispatch({ type: "SET_ACCENT", color: e.target.value })}
          />
          <input
            value={user.appAccent}
            placeholder="#9b7bff"
            onChange={(e) => dispatch({ type: "SET_ACCENT", color: e.target.value })}
          />
        </div>
      </div>

      <div className="section-title" id="subscription-section">Subscription</div>
      {TIERS.map((t) => {
        const active = user.tier === t.id;
        return (
          <div
            className="card"
            key={t.id}
            style={active ? { borderColor: "var(--accent-2)" } : undefined}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{t.name}</h3>
              <span style={{ fontWeight: 800 }}>{t.price}</span>
            </div>
            <ul style={{ margin: "8px 0 12px", paddingLeft: 18, color: "var(--muted)", fontSize: 13 }}>
              {t.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <button
              className={`btn full ${active ? "ghost" : ""}`}
              disabled={active}
              onClick={() => dispatch({ type: "SET_TIER", tier: t.id })}
            >
              {active ? "Current plan" : `Choose ${t.name}`}
            </button>
          </div>
        );
      })}
      <p className="muted" style={{ fontSize: 11 }}>
        Demo only — no real payment is processed. Apple In-App Purchase wiring comes with the
        native build. You have {starCapacity(user.tier)} ⭐ Star
        {starCapacity(user.tier) === 1 ? "" : "s"} ({starsAvailable(user)} available to spend).
      </p>

      <div className="section-title">Blocked users</div>
      {blocked.length === 0 ? (
        <p className="muted">You haven't blocked anyone.</p>
      ) : (
        blocked.map((u) => (
          <div className="row" key={u.id} style={{ marginBottom: 8 }}>
            <img src={u.avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            <span style={{ flex: 1 }}>{u.username}</span>
            <button
              className="btn ghost sm"
              onClick={() => dispatch({ type: "TOGGLE_BLOCK", userId: u.id })}
            >
              Unblock
            </button>
          </div>
        ))
      )}

      <div className="section-title">Danger zone</div>
      <button className="btn danger full" onClick={resetState}>
        Reset demo data
      </button>
    </>
  );
}
