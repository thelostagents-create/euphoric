import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { parseInviteCode } from "../social";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { joinByInviteDb } from "../lib/db";

export function JoinServerModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (serverId: string) => void;
}) {
  const { state, dispatch } = useStore();
  const { session } = useAuth();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  async function join() {
    const code = parseInviteCode(link);
    if (!code) return;
    const uid = session?.user.id;
    // Backend mode: look the party up server-side (it may be private / not yet
    // in our local cache), join, and navigate to it.
    if (isSupabaseConfigured && uid) {
      const serverId = await joinByInviteDb(code);
      if (!serverId) {
        setError("No party found for that link.");
        return;
      }
      onJoined(serverId);
      onClose();
      return;
    }
    // Demo mode: resolve from local state.
    const target = state.servers.find((s) => s.invite === code);
    if (!target) {
      setError("No party found for that link.");
      return;
    }
    dispatch({ type: "JOIN_SERVER", serverId: target.id });
    onJoined(target.id);
    onClose();
  }

  return (
    <Modal title="Join a party" onClose={onClose}>
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
        Join party
      </button>
    </Modal>
  );
}
