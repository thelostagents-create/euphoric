import { Modal } from "./Modal";
import type { Server } from "../types";

/** A list of every channel in the server; tap one to jump to it. */
export function ChannelsModal({
  server,
  currentChannelId,
  onSelect,
  onClose,
}: {
  server: Server;
  currentChannelId: string;
  onSelect: (channelId: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`${server.name} · channels`} onClose={onClose}>
      {server.channels.map((c) => (
        <button
          key={c.id}
          className={`channel ${c.id === currentChannelId ? "active" : ""}`}
          style={{ marginBottom: 4 }}
          onClick={() => {
            onSelect(c.id);
            onClose();
          }}
        >
          # {c.name}
        </button>
      ))}
    </Modal>
  );
}
