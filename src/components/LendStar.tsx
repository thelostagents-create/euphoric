import { useStore } from "../store";
import { Modal } from "./Modal";
import { serverStars, starsAvailable } from "../social";
import { BOOST_ANIMATED_ICON, BOOST_CUSTOM_INVITE, type Server } from "../types";

export function LendStar({ server, onClose }: { server: Server; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];
  const stars = serverStars(state, server.id);
  const mine = me.starAllocations[server.id] ?? 0;
  const available = starsAvailable(me);

  return (
    <Modal title={`Lend a Star to ${server.name}`} onClose={onClose}>
      <div style={{ textAlign: "center", padding: "4px 0 14px" }}>
        <div style={{ fontSize: 40 }}>⭐</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{stars}</div>
        <div className="muted" style={{ fontSize: 13 }}>Stars on this party</div>
      </div>

      <div className="row" style={{ justifyContent: "center", gap: 10, marginBottom: 12 }}>
        <button
          className="btn ghost"
          disabled={mine <= 0}
          onClick={() => dispatch({ type: "ALLOCATE_STAR", serverId: server.id, delta: -1 })}
        >
          − Take back
        </button>
        <button
          className="btn"
          disabled={available <= 0}
          onClick={() => dispatch({ type: "ALLOCATE_STAR", serverId: server.id, delta: 1 })}
        >
          ⭐ Lend a Star
        </button>
      </div>

      <p className="muted" style={{ fontSize: 13, textAlign: "center", margin: 0 }}>
        You've lent <b>{mine}</b> here · <b>{available}</b> available to spend.
      </p>

      <div className="chips" style={{ marginTop: 14, justifyContent: "center" }}>
        <span className={`chip ${stars >= BOOST_ANIMATED_ICON ? "accent" : ""}`}>
          {stars >= BOOST_ANIMATED_ICON ? "✓" : `${BOOST_ANIMATED_ICON}⭐`} Animated icon
        </span>
        <span className={`chip ${stars >= BOOST_CUSTOM_INVITE ? "accent" : ""}`}>
          {stars >= BOOST_CUSTOM_INVITE ? "✓" : `${BOOST_CUSTOM_INVITE}⭐`} Custom invite
        </span>
      </div>
      {available <= 0 && mine === 0 && (
        <p className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}>
          You have no Stars to spend. Premium grants 1, Supernova grants 2.
        </p>
      )}
    </Modal>
  );
}
