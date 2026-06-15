import { useStore } from "../store";
import { Modal } from "./Modal";
import { getMember } from "../permissions";
import type { Server } from "../types";

/** Cosmetic-role chips a member can toggle on themselves. */
export function OnboardingRoles({ server }: { server: Server }) {
  const { state, dispatch } = useStore();
  const meId = state.currentUserId;
  const member = getMember(server, meId);
  const roles = server.onboarding.cosmeticRoleIds
    .map((rid) => server.roles.find((r) => r.id === rid))
    .filter((r): r is NonNullable<typeof r> => !!r);

  if (roles.length === 0) {
    return <p className="muted">No cosmetic roles have been set up yet.</p>;
  }

  return (
    <div className="chips">
      {roles.map((r) => {
        const on = member?.roleIds.includes(r.id) ?? false;
        return (
          <button
            key={r.id}
            className={`chip ${on ? "accent" : ""}`}
            style={on ? { color: r.color } : undefined}
            onClick={() =>
              dispatch({ type: "ASSIGN_ROLE", serverId: server.id, userId: meId, roleId: r.id, on: !on })
            }
          >
            {on ? "✓ " : ""}{r.name}
          </button>
        );
      })}
    </div>
  );
}

/** Shown to a member the first time they land in a server with onboarding on. */
export function OnboardingModal({ server, onDone }: { server: Server; onDone: () => void }) {
  const { dispatch } = useStore();
  return (
    <Modal title={`Welcome to ${server.name}!`} onClose={onDone}>
      <p className="muted" style={{ marginTop: 0 }}>
        Pick a few roles to personalize your profile here. You can change these any time from
        the Channels menu.
      </p>
      <OnboardingRoles server={server} />
      <button
        className="btn full"
        style={{ marginTop: 16 }}
        onClick={() => {
          dispatch({ type: "COMPLETE_ONBOARDING", serverId: server.id });
          onDone();
        }}
      >
        Let's go
      </button>
    </Modal>
  );
}
