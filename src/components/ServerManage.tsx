import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { ALL_PERMISSIONS, type Permission, type Role, type Server } from "../types";
import { can, effectivePermissions, isOwner } from "../permissions";

type Tab = "roles" | "members" | "discovery";

export function ServerManage({ server, onClose }: { server: Server; onClose: () => void }) {
  const { state } = useStore();
  const meId = state.currentUserId;
  const [tab, setTab] = useState<Tab>("roles");

  const owner = isOwner(server, meId);
  const canManageRoles = owner || can(server, meId, "MANAGE_ROLES");
  const canManageServer = owner || can(server, meId, "MANAGE_SERVER");

  return (
    <Modal title={`Manage ${server.name}`} onClose={onClose}>
      <div className="row" style={{ gap: 6, marginBottom: 14 }}>
        <button className={`btn sm ${tab === "roles" ? "" : "ghost"}`} onClick={() => setTab("roles")}>
          Roles & Staff
        </button>
        <button className={`btn sm ${tab === "members" ? "" : "ghost"}`} onClick={() => setTab("members")}>
          Members
        </button>
        <button className={`btn sm ${tab === "discovery" ? "" : "ghost"}`} onClick={() => setTab("discovery")}>
          Discovery
        </button>
      </div>

      {tab === "roles" && <RolesTab server={server} canManage={canManageRoles} />}
      {tab === "members" && <MembersTab server={server} />}
      {tab === "discovery" &&
        (canManageServer ? (
          <DiscoveryTab server={server} />
        ) : (
          <p className="muted">You need the Manage Server permission.</p>
        ))}
    </Modal>
  );
}

function RolesTab({ server, canManage }: { server: Server; canManage: boolean }) {
  const { dispatch } = useStore();

  function addRole(staff: boolean) {
    dispatch({
      type: "CREATE_ROLE",
      serverId: server.id,
      role: {
        name: staff ? "New Staff Role" : "New Role",
        color: staff ? "#43d9ad" : "#a06bff",
        permissions: staff ? ["KICK_MEMBERS", "TIMEOUT_MEMBERS"] : [],
        staff,
      },
    });
  }

  if (!canManage) return <p className="muted">You need the Manage Roles permission.</p>;

  return (
    <div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Staff roles bundle moderation powers (kick / ban / timeout). Higher roles outrank lower
        ones for moderation.
      </p>
      {[...server.roles]
        .sort((a, b) => b.position - a.position)
        .map((role) => (
          <RoleCard key={role.id} server={server} role={role} />
        ))}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn ghost full" onClick={() => addRole(false)}>
          + Role
        </button>
        <button className="btn full" onClick={() => addRole(true)}>
          + Staff Role
        </button>
      </div>
    </div>
  );
}

function RoleCard({ server, role }: { server: Server; role: Role }) {
  const { dispatch } = useStore();
  const isEveryone = role.name === "@everyone";

  function togglePerm(p: Permission) {
    const has = role.permissions.includes(p);
    dispatch({
      type: "UPDATE_ROLE",
      serverId: server.id,
      roleId: role.id,
      patch: {
        permissions: has ? role.permissions.filter((x) => x !== p) : [...role.permissions, p],
      },
    });
  }

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="row">
        <input
          type="color"
          className="swatch"
          value={role.color}
          onChange={(e) =>
            dispatch({ type: "UPDATE_ROLE", serverId: server.id, roleId: role.id, patch: { color: e.target.value } })
          }
        />
        <input
          value={role.name}
          disabled={isEveryone}
          onChange={(e) =>
            dispatch({ type: "UPDATE_ROLE", serverId: server.id, roleId: role.id, patch: { name: e.target.value } })
          }
          style={{ color: role.color, fontWeight: 700 }}
        />
        {role.staff && <span className="badge staff">Staff</span>}
      </div>

      <div className="chips" style={{ marginTop: 10 }}>
        {ALL_PERMISSIONS.map((p) => {
          const on = role.permissions.includes(p.id);
          return (
            <button
              key={p.id}
              className={`chip ${on ? "accent" : ""}`}
              title={p.desc}
              onClick={() => togglePerm(p.id)}
            >
              {on ? "✓ " : ""}
              {p.label}
            </button>
          );
        })}
      </div>

      {!isEveryone && (
        <button
          className="btn danger sm"
          style={{ marginTop: 10 }}
          onClick={() => dispatch({ type: "DELETE_ROLE", serverId: server.id, roleId: role.id })}
        >
          Delete role
        </button>
      )}
    </div>
  );
}

function MembersTab({ server }: { server: Server }) {
  const { state, dispatch } = useStore();
  const assignable = server.roles.filter((r) => r.name !== "@everyone");

  return (
    <div>
      {server.members
        .filter((m) => !m.banned)
        .map((m) => {
          const u = state.users[m.userId];
          if (!u) return null;
          const owner = isOwner(server, m.userId);
          const perms = effectivePermissions(server, m.userId);
          return (
            <div className="card" key={m.userId} style={{ marginBottom: 10 }}>
              <div className="row">
                <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {u.username} {owner && <span className="badge staff">Owner</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {perms.size ? `${perms.size} permission(s)` : "no special permissions"}
                  </div>
                </div>
              </div>
              {!owner && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {assignable.map((r) => {
                    const on = m.roleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        className={`chip ${on ? "accent" : ""}`}
                        style={on ? { color: r.color } : undefined}
                        onClick={() =>
                          dispatch({
                            type: "ASSIGN_ROLE",
                            serverId: server.id,
                            userId: m.userId,
                            roleId: r.id,
                            on: !on,
                          })
                        }
                      >
                        {on ? "✓ " : ""}
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      {server.members.some((m) => m.banned) && (
        <>
          <div className="section-title">Banned</div>
          {server.members
            .filter((m) => m.banned)
            .map((m) => {
              const u = state.users[m.userId];
              return (
                <div className="row" key={m.userId} style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{u?.username}</span>
                  <span className="badge" style={{ background: "rgba(255,84,112,.18)", color: "var(--danger)" }}>
                    Banned
                  </span>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
}

function DiscoveryTab({ server }: { server: Server }) {
  const { dispatch } = useStore();
  const [discoverable, setDiscoverable] = useState(server.discoverable);
  const [description, setDescription] = useState(server.description);
  const [keywords, setKeywords] = useState(server.keywords.join(", "));

  function save() {
    dispatch({
      type: "UPDATE_DISCOVERY",
      serverId: server.id,
      discoverable,
      description,
      keywords: keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    });
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700 }}>List in Discovery</div>
          <div className="muted" style={{ fontSize: 12 }}>Let anyone find this server.</div>
        </div>
        <button
          className={`toggle ${discoverable ? "on" : ""}`}
          onClick={() => setDiscoverable((v) => !v)}
        />
      </div>
      <div className="field">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Keywords (comma separated)</label>
        <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="music, chill, art" />
      </div>
      <button className="btn full" onClick={save}>
        Save discovery settings
      </button>
    </div>
  );
}
