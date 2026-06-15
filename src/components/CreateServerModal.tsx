import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { ImagePicker } from "./ImagePicker";

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
    <Modal title="Create a party" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Give it a name and an icon. You can add lounges and roles afterwards.
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
        <label>Or use an image (optional)</label>
        <ImagePicker value={iconImage} placeholder="https://… (static image)" onChange={setIconImage} />
        <p className="muted" style={{ fontSize: 11, marginTop: 5 }}>
          Animated GIF icons unlock once the party reaches 3 ⭐ Stars.
        </p>
      </div>

      <div className="field">
        <label>Party name</label>
        <input
          autoFocus
          value={name}
          placeholder="e.g. The Lounge"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
      </div>

      <button className="btn full" disabled={!name.trim()} onClick={create}>
        Create party
      </button>
    </Modal>
  );
}
