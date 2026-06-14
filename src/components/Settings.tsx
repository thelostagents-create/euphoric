import { useState } from "react";
import { resetState, useStore } from "../store";
import type { Tier } from "../types";

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
    perks: ["Servers, channels & roles", "Profile with a custom bio", "Block anyone"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$5/mo",
    perks: ["Everything in Free", "Animated GIF profile picture"],
  },
  {
    id: "supernova",
    name: "Supernova",
    price: "$8/mo",
    perks: [
      "Everything in Premium",
      "Custom username font",
      "MySpace-style profile colors",
    ],
  },
];

export function Settings() {
  const { state, dispatch } = useStore();
  const user = state.users[state.currentUserId];
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");

  const blocked = user.blockedUserIds
    .map((id) => state.users[id])
    .filter(Boolean);

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Settings</h1>
      </div>
      <div className="list">
        <div className="section-title">Subscription</div>
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
          native build.
        </p>

        <div className="section-title">Create a server</div>
        <div className="card">
          <div className="row" style={{ gap: 8 }}>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value.slice(0, 2))}
              style={{ width: 56, textAlign: "center" }}
            />
            <input value={name} placeholder="Server name" onChange={(e) => setName(e.target.value)} />
          </div>
          <button
            className="btn full"
            style={{ marginTop: 10 }}
            disabled={!name.trim()}
            onClick={() => {
              dispatch({ type: "CREATE_SERVER", name, icon });
              setName("");
              setIcon("✨");
            }}
          >
            Create server
          </button>
        </div>

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
      </div>
    </div>
  );
}
