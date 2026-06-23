import { useState, useMemo } from "react";
import { resetState, useStore } from "../store";
import type { Tier } from "../types";
import { starCapacity, starsAvailable } from "../social";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { openPatreonPage, patreonUrl } from "../lib/payments";
import { isNativeIOS } from "../lib/platform";
import { DevConsole } from "./DevConsole";
import { Terms } from "./Terms";
import { PrivacyPolicy } from "./PrivacyPolicy";

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
    perks: ["Parties, lounges & roles", "Profile colors & static banner", "Join unlimited parties"],
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
      "2 ⭐ Stars to spend on parties",
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
  const { session, signOut, deleteAccount } = useAuth();
  const user = state.users[state.currentUserId];
  const signedIn = isSupabaseConfigured && !!session;
  // Apple requires digital subscriptions to use In-App Purchase, so the
  // Patreon-based subscription UI is hidden inside the native iOS app.
  const hideSubs = isNativeIOS();

  async function logOut() {
    await signOut();
    resetState();
  }

  async function removeAccount() {
    if (!confirm("Permanently delete your account and all your data? This can't be undone.")) return;
    const err = await deleteAccount();
    if (err) {
      alert(`Couldn't delete your account: ${err}`);
      return;
    }
    resetState();
  }

  const blocked = user.blockedUserIds
    .map((id) => state.users[id])
    .filter(Boolean);

  // Build the ordered server list (same logic as the rail).
  const myServers = useMemo(() => {
    const mine = state.servers.filter((s) => s.members.some((m) => m.userId === state.currentUserId && !m.banned));
    const order = user.serverOrder ?? [];
    const byId = new Map(mine.map((s) => [s.id, s] as const));
    const out: typeof mine = [];
    for (const id of order) { const s = byId.get(id); if (s) { out.push(s); byId.delete(id); } }
    for (const s of mine) if (byId.has(s.id)) out.push(s);
    return out;
  }, [state.servers, state.currentUserId, user.serverOrder]);

  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [showOrder, setShowOrder] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  function moveServer(index: number, dir: -1 | 1) {
    const next = [...myServers];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    dispatch({ type: "SET_SERVER_ORDER", order: next.map((s) => s.id) });
  }

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

      {myServers.length > 1 && (
        <>
          <div className="section-title">Party order</div>
          <button
            className="btn ghost full"
            onClick={() => setShowOrder((v) => !v)}
            style={{ marginBottom: showOrder ? 8 : 0 }}
          >
            {showOrder ? "Hide party order" : "Reorder parties"}
          </button>
          {showOrder && <>{myServers.map((s, i) => (
            <div key={s.id}>
              <div className="card" style={{ marginBottom: 4 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    className="row"
                    style={{ background: "none", border: "none", padding: 0, flex: 1, gap: 10, cursor: "pointer", color: "inherit", textAlign: "left" }}
                    onClick={() => setExpandedServerId(expandedServerId === s.id ? null : s.id)}
                  >
                    <span style={{ fontSize: 20 }}>
                      {s.iconImage
                        ? <img src={s.iconImage} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
                        : s.icon}
                    </span>
                    <span style={{ fontWeight: 600, flex: 1 }}>{s.name}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{expandedServerId === s.id ? "▲" : "▼"}</span>
                  </button>
                  <div className="row" style={{ gap: 4, marginLeft: 10 }}>
                    <button className="btn ghost sm" disabled={i === 0} onClick={() => moveServer(i, -1)}>↑</button>
                    <button className="btn ghost sm" disabled={i === myServers.length - 1} onClick={() => moveServer(i, 1)}>↓</button>
                  </div>
                </div>
                {expandedServerId === s.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    {s.channels.length === 0 ? (
                      <p className="muted" style={{ fontSize: 12, margin: 0 }}>No lounges.</p>
                    ) : (
                      s.channels.map((c) => (
                        <div key={c.id} className="muted" style={{ fontSize: 13, padding: "3px 0" }}>
                          # {c.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}</>}
        </>
      )}

      {!hideSubs && (
        <>
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
                  onClick={() => {
                    if (signedIn && t.id !== "free" && patreonUrl) {
                      openPatreonPage();
                    } else {
                      dispatch({ type: "SET_TIER", tier: t.id });
                    }
                  }}
                >
                  {active ? "Current plan" : t.id === "free" ? "Choose Free" : `Subscribe on Patreon`}
                </button>
              </div>
            );
          })}
          {signedIn && patreonUrl && user.tier !== "free" && (
            <a className="btn ghost full" href={patreonUrl} target="_blank" rel="noreferrer">
              Manage / cancel on Patreon
            </a>
          )}
          <p className="muted" style={{ fontSize: 11 }}>
            {signedIn && patreonUrl
              ? "Subscriptions are handled through Patreon. Your plan updates here automatically once your membership is confirmed."
              : "Demo mode — no real payment is processed."}{" "}
            You have {starCapacity(user.tier)} ⭐ Star{starCapacity(user.tier) === 1 ? "" : "s"} (
            {starsAvailable(user)} available to spend).
          </p>
          {signedIn && patreonUrl && (
            <p className="muted" style={{ fontSize: 11, marginTop: 0 }}>
              Important: use the same email address on Patreon that you signed up with here ({session!.user.email}) so your subscription is linked automatically.
            </p>
          )}
        </>
      )}

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

      <div className="section-title">Legal</div>
      <button className="btn ghost full" onClick={() => setShowTerms(true)}>
        Terms of Service
      </button>
      <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => setShowPrivacy(true)}>
        Privacy Policy
      </button>

      {user.tier === "developer" && (
        <>
          <div className="section-title">⚙️ Developer console</div>
          <DevConsole />
        </>
      )}

      {signedIn && (
        <>
          <div className="section-title">Account</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Signed in as {session!.user.email}
          </p>
          <button className="btn ghost full" onClick={logOut}>
            Log out
          </button>
          <button className="btn danger full" style={{ marginTop: 8 }} onClick={removeAccount}>
            Delete account
          </button>
        </>
      )}

      <div className="section-title">Danger zone</div>
      <button className="btn danger full" onClick={resetState}>
        Reset demo data
      </button>

      {showTerms && <Terms onClose={() => setShowTerms(false)} />}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </>
  );
}
