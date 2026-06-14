import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";

const SUGGESTED = ["✨", "🌙", "💻", "🎮", "🎵", "🎨", "🌸", "🔥", "🛸", "📚"];

export function CreateServerModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [iconImage, setIconImage] = useState("");

  function create() {
    if (!name.trim()) return;
    dispatch({ type: "CREATE_SERVER", name, icon, iconImage });
    onClose();
  }

  return (
    <Modal title="Create a server" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Give it a name and an icon. You can add channels and roles afterwards.
      </p>

      <div className="field">
        <label>Icon emoji</label>
        <div className="chips">
          {SUGGESTED.map((e) => (
            <button
              key={e}
              className={`chip ${icon === e ? "accent" : ""}`}
              style={{ fontSize: 18 }}
              onClick={() => setIcon(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Or icon image URL (optional)</label>
        <input
          value={iconImage}
          placeholder="https://… (static image)"
          onChange={(e) => setIconImage(e.target.value)}
        />
        <p className="muted" style={{ fontSize: 11, marginTop: 5 }}>
          Animated GIF icons unlock once the server reaches 3 ⭐ boosts.
        </p>
      </div>

      <div className="field">
        <label>Server name</label>
        <input
          autoFocus
          value={name}
          placeholder="e.g. The Lounge"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
      </div>

      <button className="btn full" disabled={!name.trim()} onClick={create}>
        Create server
      </button>
    </Modal>
  );
}
