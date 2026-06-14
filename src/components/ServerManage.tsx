import { useState } from "react";
import { useStore } from "../store";
import { Modal } from "./Modal";
import {
  ALL_PERMISSIONS,
  BOOST_ANIMATED_ICON,
  BOOST_CUSTOM_INVITE,
  type Permission,
  type Role,
  type Server,
} from "../types";
import { can, effectivePermissions, isOwner } from "../permissions";
import { inviteLink, isGif, serverStars, starsAvailable } from "../social";
import { ImagePicker } from "./ImagePicker";

type Tab = "overview" | "roles" | "channels" | "members" | "discovery";

export function ServerManage({ server, onClose }: { server: Server; onClose: () => void }) {
  const { state } = useStore();
  const meId = state.currentUserId;
  const [tab, setTab] = useState<Tab>("overview");

  const owner = isOwner(server, meId);
  const canManageRoles = owner || can(server, meId, "MANAGE_ROLES");
  const canManageServer = owner || can(server, meId, "MANAGE_SERVER");
  const canManageChannels = owner || can(server, meId, "MANAGE_CHANNELS");

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "roles", label: "Roles & Staff" },
    { id: "channels", label: "Channels" },
    { id: "members", label: "Members" },
    { id: "discovery", label: "Discovery" },
  ];

  return (
    <Modal title={`Manage ${server.name}`} onClose={onClose}>
      <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`btn sm ${tab === t.id ? "" : "ghost"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab server={server} canManage={canManageServer} />}
      {tab === "roles" && <RolesTab server={server} canManage={canManageRoles} />}
      {tab === "channels" && <ChannelsTab server={server} canManage={canManageChannels} />}
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

function OverviewTab({ server, canManage }: { server: Server; canManage: boolean }) {
  const { state, dispatch } = useStore();
  const me = state.users[state.currentUserId];
  const stars = serverStars(state, server.id);
  const mine = me.starAllocations[server.id] ?? 0;
  const available = starsAvailable(me);
  const animatedUnlocked = stars >= BOOST_ANIMATED_ICON;
  const customInviteUnlocked = stars >= BOOST_CUSTOM_INVITE;

  const [iconUrl, setIconUrl] = useState(server.iconImage);
  const [customInvite, setCustomInvite] = useState(server.invite);
  const [copied, setCopied] = useState(false);

  function copyInvite() {
    navigator.clipboard?.writeText(inviteLink(server)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const iconIsGif = isGif(iconUrl);
  const iconBlocked = iconIsGif && !animatedUnlocked;

  return (
    <div>
      {/* Stars */}
      <div className="section-title">Stars · {stars} ⭐</div>
      <div className="card">
        <p className="desc" style={{ marginBottom: 10 }}>
          Members spend Stars on this server. Premium grants 1 Star, Supernova grants 2.
        </p>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Your Stars on this server: {mine}</div>
            <div className="muted" style={{ fontSize: 12 }}>{available} available to spend</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn ghost sm"
              disabled={mine <= 0}
              onClick={() => dispatch({ type: "ALLOCATE_STAR", serverId: server.id, delta: -1 })}
            >
              −
            </button>
            <button
              className="btn sm"
              disabled={available <= 0}
              onClick={() => dispatch({ type: "ALLOCATE_STAR", serverId: server.id, delta: 1 })}
            >
              + Star
            </button>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <span className={`chip ${animatedUnlocked ? "accent" : ""}`}>
            {animatedUnlocked ? "✓" : `${BOOST_ANIMATED_ICON}⭐`} Animated icon
          </span>
          <span className={`chip ${customInviteUnlocked ? "accent" : ""}`}>
            {customInviteUnlocked ? "✓" : `${BOOST_CUSTOM_INVITE}⭐`} Custom invite
          </span>
        </div>
      </div>

      {/* Invite */}
      <div className="section-title">Invite</div>
      <div className="card">
        <div className="row" style={{ gap: 8 }}>
          <input readOnly value={inviteLink(server)} />
          <button className="btn sm" onClick={copyInvite}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {canManage && (
          <div style={{ marginTop: 12 }}>
            <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
              Custom invite code {customInviteUnlocked ? "" : `(unlocks at ${BOOST_CUSTOM_INVITE}⭐)`}
            </label>
            <div className="row" style={{ gap: 8, marginTop: 5 }}>
              <input
                value={customInvite}
                disabled={!customInviteUnlocked}
                onChange={(e) => setCustomInvite(e.target.value)}
                placeholder="my-cool-server"
              />
              <button
                className="btn sm"
                disabled={!customInviteUnlocked || !customInvite.trim()}
                onClick={() =>
                  dispatch({ type: "SET_SERVER_INVITE", serverId: server.id, invite: customInvite })
                }
              >
                Set
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Server icon */}
      {canManage && (
        <>
          <div className="section-title">Server icon</div>
          <div className="card">
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Icon — import or paste a URL {animatedUnlocked ? "(GIFs allowed ✨)" : "(static only)"}</label>
              <ImagePicker value={iconUrl} placeholder="https://…" onChange={setIconUrl} />
            </div>
            {iconBlocked && (
              <p className="muted" style={{ fontSize: 12, margin: "0 0 8px", color: "var(--danger)" }}>
                Animated GIF icons unlock at {BOOST_ANIMATED_ICON}⭐.
              </p>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn sm"
                disabled={iconBlocked}
                onClick={() => dispatch({ type: "SET_SERVER_ICON", serverId: server.id, iconImage: iconUrl })}
              >
                Save icon
              </button>
              {server.iconImage && (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    setIconUrl("");
                    dispatch({ type: "SET_SERVER_ICON", serverId: server.id, iconImage: "" });
                  }}
                >
                  Remove (use {server.icon})
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
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
        mentionable: false,
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
        {!isEveryone && (
          <button
            className={`chip ${role.mentionable ? "accent" : ""}`}
            title="Allow anyone to @mention this role"
            onClick={() =>
              dispatch({
                type: "UPDATE_ROLE",
                serverId: server.id,
                roleId: role.id,
                patch: { mentionable: !role.mentionable },
              })
            }
          >
            {role.mentionable ? "✓ " : ""}Mentionable
          </button>
        )}
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

function ChannelsTab({ server, canManage }: { server: Server; canManage: boolean }) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");

  if (!canManage) return <p className="muted">You need the Manage Channels permission.</p>;

  return (
    <div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Reorder channels with the arrows, or remove them. The order here is the order shown in chat.
      </p>
      {server.channels.map((c, i) => (
        <div className="card" key={c.id} style={{ marginBottom: 8, padding: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ flex: 1, fontWeight: 600 }}># {c.name}</span>
            <button
              className="btn ghost sm"
              disabled={i === 0}
              onClick={() => dispatch({ type: "MOVE_CHANNEL", serverId: server.id, channelId: c.id, dir: -1 })}
            >
              ↑
            </button>
            <button
              className="btn ghost sm"
              disabled={i === server.channels.length - 1}
              onClick={() => dispatch({ type: "MOVE_CHANNEL", serverId: server.id, channelId: c.id, dir: 1 })}
            >
              ↓
            </button>
            <button
              className="btn danger sm"
              disabled={server.channels.length <= 1}
              onClick={() => dispatch({ type: "DELETE_CHANNEL", serverId: server.id, channelId: c.id })}
            >
              Delete
            </button>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 5px", fontWeight: 600 }}>
            Who can talk {c.sendRoleIds.length === 0 ? "· everyone" : ""}
          </div>
          <div className="chips">
            {server.roles
              .filter((r) => r.name !== "@everyone")
              .map((r) => {
                const on = c.sendRoleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    className={`chip ${on ? "accent" : ""}`}
                    style={on ? { color: r.color } : undefined}
                    onClick={() =>
                      dispatch({
                        type: "SET_CHANNEL_SEND_ROLES",
                        serverId: server.id,
                        channelId: c.id,
                        roleIds: on
                          ? c.sendRoleIds.filter((x) => x !== r.id)
                          : [...c.sendRoleIds, r.id],
                      })
                    }
                  >
                    {on ? "✓ " : ""}{r.name}
                  </button>
                );
              })}
          </div>
          <p className="muted" style={{ fontSize: 11, margin: "6px 0 0" }}>
            No roles selected = everyone can talk. Selecting roles restricts posting to them
            (admins can always post).
          </p>
        </div>
      ))}
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <input value={name} placeholder="new-channel" onChange={(e) => setName(e.target.value)} />
        <button
          className="btn sm"
          disabled={!name.trim()}
          onClick={() => {
            dispatch({ type: "CREATE_CHANNEL", serverId: server.id, name });
            setName("");
          }}
        >
          Add
        </button>
      </div>
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
