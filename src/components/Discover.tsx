import { useMemo, useState } from "react";
import { useStore } from "../store";
import { getMember } from "../permissions";
import { parseInviteCode, serverStars } from "../social";
import { ServerIcon } from "./ServerIcon";

export function Discover() {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  function joinByInvite() {
    const code = parseInviteCode(invite);
    if (!code) return;
    const target = state.servers.find((s) => s.invite === code);
    if (!target) {
      setInviteMsg("No party found for that invite.");
      return;
    }
    dispatch({ type: "JOIN_SERVER", serverId: target.id });
    setInviteMsg(`Joined ${target.name}!`);
    setInvite("");
  }

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.servers
      .filter((s) => s.discoverable)
      .filter((s) => {
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.keywords.some((k) => k.includes(query))
        );
      });
  }, [state.servers, q]);

  const allKeywords = useMemo(() => {
    const set = new Set<string>();
    state.servers.filter((s) => s.discoverable).forEach((s) => s.keywords.forEach((k) => set.add(k)));
    return [...set].slice(0, 14);
  }, [state.servers]);

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Discover</h1>
      </div>
      <div className="list">
        <div className="card">
          <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Have an invite?</label>
          <div className="row" style={{ gap: 8, marginTop: 5 }}>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="euphoric.gg/code or code"
              onKeyDown={(e) => e.key === "Enter" && joinByInvite()}
            />
            <button className="btn sm" disabled={!invite.trim()} onClick={joinByInvite}>
              Join
            </button>
          </div>
          {inviteMsg && (
            <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>{inviteMsg}</p>
          )}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search partys by keyword…"
        />
        <div className="chips">
          {allKeywords.map((k) => (
            <button key={k} className={`chip ${q === k ? "accent" : ""}`} onClick={() => setQ(q === k ? "" : k)}>
              #{k}
            </button>
          ))}
        </div>

        {results.length === 0 && <div className="center-empty">No partys match “{q}”.</div>}

        {results.map((s) => {
          const joined = !!getMember(s, state.currentUserId);
          return (
            <div className="card" key={s.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-3)",
                    flex: "0 0 auto",
                  }}
                >
                  <ServerIcon server={s} size={26} />
                </span>
                <div style={{ flex: 1 }}>
                  <h3>{s.name}</h3>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {s.members.length} members{serverStars(state, s.id) > 0 ? ` · ${serverStars(state, s.id)} ⭐` : ""}
                  </div>
                </div>
              </div>
              <p className="desc">{s.description || "No description yet."}</p>
              <div className="chips" style={{ marginBottom: 10 }}>
                {s.keywords.map((k) => (
                  <span key={k} className="chip">#{k}</span>
                ))}
              </div>
              <button
                className={`btn full ${joined ? "ghost" : ""}`}
                disabled={joined}
                onClick={() => dispatch({ type: "JOIN_SERVER", serverId: s.id })}
              >
                {joined ? "Joined" : "Join"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
