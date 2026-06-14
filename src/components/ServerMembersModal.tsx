import { useStore } from "../store";
import { Modal } from "./Modal";
import { displayName } from "../social";
import { isOwner, isTimedOut } from "../permissions";
import type { Server } from "../types";

/** Lists every (non-banned) member of the server; tap to open a profile. */
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
  const members = server.members.filter((m) => !m.banned);

  return (
    <Modal title={`Members · ${members.length}`} onClose={onClose}>
      {members.map((m) => {
        const u = state.users[m.userId];
        if (!u) return null;
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
            {isOwner(server, m.userId) && <span className="badge staff">Owner</span>}
            {isTimedOut(m) && <span className="badge" style={{ background: "rgba(255,84,112,.18)", color: "var(--danger)" }}>Timed out</span>}
          </div>
        );
      })}
    </Modal>
  );
}
