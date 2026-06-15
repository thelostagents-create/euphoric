import { useStore } from "../store";
import { canViewChannel } from "../permissions";
import { Modal } from "./Modal";
import { OnboardingRoles } from "./Onboarding";
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
  const { state } = useStore();
  const visible = server.channels.filter((c) => canViewChannel(server, state.currentUserId, c));
  return (
    <Modal title={`${server.name} · lounges`} onClose={onClose}>
      {server.onboarding.enabled && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Pick your roles</div>
          <OnboardingRoles server={server} />
        </div>
      )}
      {visible.map((c) => (
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
