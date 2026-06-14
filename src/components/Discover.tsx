import { useMemo, useState } from "react";
import { useStore } from "../store";
import { getMember } from "../permissions";

export function Discover() {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState("");

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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search servers by keyword…"
        />
        <div className="chips">
          {allKeywords.map((k) => (
            <button key={k} className={`chip ${q === k ? "accent" : ""}`} onClick={() => setQ(q === k ? "" : k)}>
              #{k}
            </button>
          ))}
        </div>

        {results.length === 0 && <div className="center-empty">No servers match “{q}”.</div>}

        {results.map((s) => {
          const joined = !!getMember(s, state.currentUserId);
          return (
            <div className="card" key={s.id}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 26 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <h3>{s.name}</h3>
                  <div className="muted" style={{ fontSize: 12 }}>{s.members.length} members</div>
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
