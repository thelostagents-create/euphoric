import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { parseInviteCode } from "../social";

export function JoinServerModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (serverId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  function join() {
    const code = parseInviteCode(link);
    if (!code) return;
    const target = state.servers.find((s) => s.invite === code);
    if (!target) {
      setError("No server found for that link.");
      return;
    }
    dispatch({ type: "JOIN_SERVER", serverId: target.id });
    onJoined(target.id);
    onClose();
  }

  return (
    <Modal title="Join a server" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Paste an invite link or code to join.
      </p>
      <div className="field">
        <label>Invite link</label>
        <input
          autoFocus
          value={link}
          placeholder="euphoric.gg/code"
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && join()}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: -4 }}>{error}</p>}
      <button className="btn full" disabled={!link.trim()} onClick={join}>
        Join server
      </button>
    </Modal>
  );
}
