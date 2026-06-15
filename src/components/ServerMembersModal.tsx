import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { displayName, inviteLink } from "../social";
import { isOwner, isTimedOut } from "../permissions";
import type { Server } from "../types";

/** Lists every (non-banned) member, with an invite link to share. */
export function ServerMembersModal({
  server,
  onSelect,
  onClose,
}: {
  server: Server;
  onSelect: (userId: string) => void;
  onClose: () => void;
}) {
  const { state } = useStore();
  const [copied, setCopied] = useState(false);
  const members = server.members.filter((m) => !m.banned);

  function copy() {
    navigator.clipboard?.writeText(inviteLink(server)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title={`Members · ${members.length}`} onClose={onClose}>
      <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Invite people</label>
      <div className="row" style={{ gap: 8, margin: "5px 0 14px" }}>
        <input readOnly value={inviteLink(server)} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn sm" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      </div>

      {members.map((m) => {
        const u = state.users[m.userId];
        if (!u) return null;
        const lentStar = (u.starAllocations[server.id] ?? 0) > 0;
        return (
          <div
            className="row"
            key={m.userId}
            style={{ marginBottom: 10, cursor: "pointer" }}
            onClick={() => {
              onSelect(m.userId);
              onClose();
            }}
          >
            <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
            <span style={{ flex: 1, fontWeight: 600 }}>{displayName(u)}</span>
            {lentStar && <span title="Lent a Star">⭐</span>}
            {isOwner(server, m.userId) && <span className="badge staff">Owner</span>}
            {isTimedOut(m) && <span className="badge" style={{ background: "rgba(255,84,112,.18)", color: "var(--danger)" }}>Timed out</span>}
          </div>
        );
      })}
    </Modal>
  );
}
