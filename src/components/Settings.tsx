import { resetState, useStore } from "../store";
import type { Tier } from "../types";
import { starCapacity, starsAvailable } from "../social";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { startCheckout, paymentLinkFor, billingPortalUrl } from "../lib/payments";

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

  async function logOut() {
    await signOut();
    resetState(); // clear cached data and return to the sign-in screen
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
              onClick={() => {
                const uid = session?.user.id;
                // Backend mode with a Stripe link → real checkout. Otherwise
                // (demo / free downgrade) just set the tier locally.
                if (signedIn && uid && t.id !== "free" && paymentLinkFor(t.id)) {
                  startCheckout(t.id, uid, session?.user.email ?? undefined);
                } else {
                  dispatch({ type: "SET_TIER", tier: t.id });
                }
              }}
            >
              {active ? "Current plan" : t.id === "free" ? "Choose Free" : `Upgrade to ${t.name}`}
            </button>
          </div>
        );
      })}
      {signedIn && billingPortalUrl && user.tier !== "free" && (
        <a className="btn ghost full" href={billingPortalUrl} target="_blank" rel="noreferrer">
          Manage / cancel subscription
        </a>
      )}
      <p className="muted" style={{ fontSize: 11 }}>
        {signedIn && paymentLinkFor("premium")
          ? "Secure checkout is handled by Stripe; your plan updates here once payment is confirmed."
          : "Demo mode — no real payment is processed."}{" "}
        You have {starCapacity(user.tier)} ⭐ Star{starCapacity(user.tier) === 1 ? "" : "s"} (
        {starsAvailable(user)} available to spend).
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
    </>
  );
}
