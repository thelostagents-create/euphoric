import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  loadReports,
  resolveReportDb,
  findUserByUsername,
  setUserTierDb,
  findServerByInvite,
  setVerifiedDb,
  type Report,
} from "../lib/db";
import { parseInviteCode } from "../social";
import type { Server, Tier, User } from "../types";

type Pane = "reports" | "subs" | "servers";

/** Developer-only control panel: triage reports, set tiers, verify parties. */
export function DevConsole() {
  const [pane, setPane] = useState<Pane>("reports");

  if (!isSupabaseConfigured) {
    return (
      <p className="muted" style={{ fontSize: 13 }}>
        The developer console requires the live backend.
      </p>
    );
  }

  return (
    <>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button className={`chip ${pane === "reports" ? "accent" : ""}`} onClick={() => setPane("reports")}>
          Reports
        </button>
        <button className={`chip ${pane === "subs" ? "accent" : ""}`} onClick={() => setPane("subs")}>
          Subscriptions
        </button>
        <button className={`chip ${pane === "servers" ? "accent" : ""}`} onClick={() => setPane("servers")}>
          Verify parties
        </button>
      </div>
      {pane === "reports" && <ReportsPane />}
      {pane === "subs" && <SubsPane />}
      {pane === "servers" && <ServersPane />}
    </>
  );
}

function ReportsPane() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  async function refresh() {
    setReports(await loadReports());
  }
  useEffect(() => {
    void refresh();
  }, []);

  if (!reports) return <p className="muted">Loading reports…</p>;
  const shown = reports.filter((r) => showResolved || !r.resolved);

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <button className="btn ghost sm" onClick={refresh}>↻ Refresh</button>
        <label className="row muted" style={{ gap: 6, fontSize: 12 }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} style={{ width: "auto" }} />
          Show resolved
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="muted">No open reports. 🎉</p>
      ) : (
        shown.map((r) => (
          <div className="card" key={r.id} style={{ opacity: r.resolved ? 0.55 : 1 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{r.reason}</strong>
              <span className="muted" style={{ fontSize: 11 }}>{new Date(r.createdAt).toLocaleString()}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {r.targetKind} · <code>{r.targetId}</code>
            </div>
            {r.context && <p style={{ fontSize: 13, margin: "6px 0 0" }}>{r.context}</p>}
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Reported by {r.reporterId}</div>
            <button
              className="btn ghost sm"
              style={{ marginTop: 8 }}
              onClick={async () => {
                await resolveReportDb(r.id, !r.resolved);
                refresh();
              }}
            >
              {r.resolved ? "Reopen" : "Mark resolved"}
            </button>
          </div>
        ))
      )}
    </>
  );
}

const TIER_OPTIONS: Tier[] = ["free", "premium", "supernova", "developer"];

function SubsPane() {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Partial<User> | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function search() {
    setMsg("");
    setFound(undefined);
    const u = await findUserByUsername(query);
    setFound(u ?? null);
  }

  async function setTier(tier: Tier) {
    if (!found?.id) return;
    setBusy(true);
    const err = await setUserTierDb(found.id, tier);
    setBusy(false);
    if (err) setMsg(`Error: ${err}`);
    else {
      setFound({ ...found, tier });
      setMsg(`Set @${found.username} to ${tier}.`);
    }
  }

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="username"
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="btn sm" disabled={!query.trim()} onClick={search}>Find</button>
      </div>
      {found === null && <p className="muted" style={{ marginTop: 10 }}>No user with that username.</p>}
      {found && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            {found.avatar && <img src={found.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />}
            <div>
              <div style={{ fontWeight: 700 }}>@{found.username}</div>
              <div className="muted" style={{ fontSize: 12 }}>Current tier: {found.tier}</div>
            </div>
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {TIER_OPTIONS.map((t) => (
              <button
                key={t}
                className={`chip ${found.tier === t ? "accent" : ""}`}
                disabled={busy}
                onClick={() => setTier(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {msg && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{msg}</p>}
        </div>
      )}
    </>
  );
}

function ServersPane() {
  const [invite, setInvite] = useState("");
  const [server, setServer] = useState<Server | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function search() {
    setServer(undefined);
    const s = await findServerByInvite(parseInviteCode(invite));
    setServer(s ?? null);
  }

  async function toggle() {
    if (!server) return;
    setBusy(true);
    const err = await setVerifiedDb(server.id, !server.verified);
    setBusy(false);
    if (!err) setServer({ ...server, verified: !server.verified });
  }

  return (
    <>
      <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
        Enter a party's invite code (or full euphoric.chat link) to verify it.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <input
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="euphoric.chat/code or code"
          onKeyDown={(e) => e.key === "Enter" && invite.trim() && search()}
        />
        <button className="btn sm" disabled={!invite.trim()} onClick={search}>Find</button>
      </div>
      {server === null && <p className="muted" style={{ marginTop: 10 }}>No party with that invite code.</p>}
      {server && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>
                {server.iconImage ? <img src={server.iconImage} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} /> : server.icon}
              </span>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {server.name} {server.verified && <span style={{ color: "var(--accent)" }}>✓</span>}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>{server.members.length} members</div>
              </div>
            </div>
            <button className={`btn sm ${server.verified ? "ghost" : ""}`} disabled={busy} onClick={toggle}>
              {server.verified ? "Unverify" : "Verify"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
