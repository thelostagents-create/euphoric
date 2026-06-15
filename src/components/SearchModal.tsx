import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { canViewChannel } from "../permissions";
import { displayName } from "../social";
import { timeAgo } from "./Modal";
import type { Server } from "../types";

/** Search a party's messages, with a toggle to browse all pinned messages. */
export function SearchModal({
  server,
  onJump,
  onClose,
}: {
  server: Server;
  onJump: (channelId: string, messageId: string) => void;
  onClose: () => void;
}) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);

  const channelName = (id: string) => server.channels.find((c) => c.id === id)?.name ?? "";

  const results = useMemo(() => {
    const visible = new Set(
      server.channels.filter((c) => canViewChannel(server, state.currentUserId, c)).map((c) => c.id),
    );
    const q = query.trim().toLowerCase();
    return state.messages
      .filter((m) => visible.has(m.channelId))
      .filter((m) => (pinnedOnly ? m.pinned : q ? m.content.toLowerCase().includes(q) : false))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 60);
  }, [state.messages, server, state.currentUserId, query, pinnedOnly]);

  return (
    <Modal title={`Search ${server.name}`} onClose={onClose}>
      <div className="row" style={{ gap: 8 }}>
        <input
          autoFocus
          value={query}
          placeholder="Search messages…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className={`btn sm ${pinnedOnly ? "" : "ghost"}`}
          onClick={() => setPinnedOnly((v) => !v)}
          title="Show pinned messages"
        >
          📌 Pinned
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {!pinnedOnly && !query.trim() && (
          <p className="muted">Type to search, or tap 📌 to see all pinned messages.</p>
        )}
        {(pinnedOnly || query.trim()) && results.length === 0 && (
          <p className="muted">{pinnedOnly ? "No pinned messages yet." : "No matches."}</p>
        )}
        {results.map((m) => {
          const author = state.users[m.authorId];
          return (
            <div
              className="card"
              key={m.id}
              style={{ padding: 10, marginBottom: 8, cursor: "pointer" }}
              onClick={() => {
                onJump(m.channelId, m.id);
                onClose();
              }}
            >
              <div className="row" style={{ gap: 8 }}>
                <img src={author?.avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%" }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{displayName(author)}</span>
                <span className="muted" style={{ fontSize: 12 }}>#{channelName(m.channelId)}</span>
                {m.pinned && <span title="Pinned">📌</span>}
                <span className="time" style={{ marginLeft: "auto" }}>{timeAgo(m.createdAt)}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{m.content || "📎 attachment"}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
