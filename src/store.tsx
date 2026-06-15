import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Aesthetic,
  AppState,
  Attachment,
  GroupChat,
  Message,
  Permission,
  ProfileTheme,
  Role,
  Server,
  Tier,
} from "./types";
import { seedState } from "./data/seed";
import { can, canModerate } from "./permissions";
import { isGif, serverStars, starsAvailable, usernameTaken } from "./social";
import { BOOST_ANIMATED_ICON, BOOST_CUSTOM_INVITE, BOOST_STICKERS, MAX_STICKERS } from "./types";

const STORAGE_KEY = "euphoric.state.v1";

type Action =
  | { type: "SEND_MESSAGE"; channelId: string; content: string; attachment?: Attachment; replyTo?: string }
  | { type: "DELETE_MESSAGE"; messageId: string }
  | { type: "EDIT_MESSAGE"; messageId: string; content: string }
  | { type: "MARK_READ"; channelId: string }
  | { type: "DISMISS_NOTIFICATION"; messageId: string }
  | { type: "SET_ACCENT"; color: string }
  | { type: "TOGGLE_PIN"; messageId: string }
  | { type: "TOGGLE_REACTION"; messageId: string; emoji: string }
  | { type: "SET_BLOCKED_WORDS"; serverId: string; words: string[] }
  | { type: "SET_ONBOARDING"; serverId: string; enabled: boolean; cosmeticRoleIds: string[] }
  | { type: "COMPLETE_ONBOARDING"; serverId: string }
  | { type: "ADD_STICKER"; serverId: string; url: string }
  | { type: "REMOVE_STICKER"; serverId: string; index: number }
  | { type: "TOGGLE_FAVORITE_STICKER"; url: string }
  | { type: "MOVE_CHANNEL"; serverId: string; channelId: string; dir: -1 | 1 }
  | { type: "DELETE_CHANNEL"; serverId: string; channelId: string }
  | { type: "CREATE_SERVER"; name: string; icon: string; iconImage?: string }
  | { type: "JOIN_SERVER"; serverId: string }
  | { type: "CREATE_CHANNEL"; serverId: string; name: string }
  | { type: "UPDATE_PROFILE"; bio?: string; avatar?: string; username?: string; nickname?: string; blurb?: string; blurbColor?: string }
  | { type: "SET_CHANNEL_SEND_ROLES"; serverId: string; channelId: string; roleIds: string[] }
  | { type: "SET_CHANNEL_VIEW_ROLES"; serverId: string; channelId: string; roleIds: string[] }
  | { type: "MOVE_ROLE"; serverId: string; roleId: string; dir: -1 | 1 }
  | { type: "UPDATE_THEME"; theme: Partial<ProfileTheme> }
  | { type: "UPDATE_BANNER"; color?: string; image?: string; position?: number }
  | { type: "UPDATE_AESTHETIC"; patch: Partial<Aesthetic> }
  | { type: "SET_TIER"; tier: Tier }
  | { type: "TOGGLE_BLOCK"; userId: string }
  | { type: "TOGGLE_FOLLOW"; userId: string }
  | { type: "ADD_FRIEND"; userId: string }
  | { type: "REMOVE_FRIEND"; userId: string }
  | { type: "CREATE_GROUP"; id: string; name: string; memberIds: string[] }
  | { type: "ADD_TO_GROUP"; groupId: string; userId: string }
  | { type: "REMOVE_FROM_GROUP"; groupId: string; userId: string }
  | { type: "RENAME_GROUP"; groupId: string; name: string }
  | { type: "SET_GROUP_ICON"; groupId: string; iconImage: string }
  | { type: "LEAVE_GROUP"; groupId: string }
  | { type: "ALLOCATE_STAR"; serverId: string; delta: number }
  | { type: "SET_SERVER_ICON"; serverId: string; iconImage: string }
  | { type: "SET_SERVER_INVITE"; serverId: string; invite: string }
  | { type: "CREATE_ROLE"; serverId: string; role: Omit<Role, "id" | "position"> }
  | { type: "UPDATE_ROLE"; serverId: string; roleId: string; patch: Partial<Role> }
  | { type: "DELETE_ROLE"; serverId: string; roleId: string }
  | { type: "ASSIGN_ROLE"; serverId: string; userId: string; roleId: string; on: boolean }
  | { type: "KICK"; serverId: string; userId: string }
  | { type: "BAN"; serverId: string; userId: string }
  | { type: "TIMEOUT"; serverId: string; userId: string; minutes: number }
  | { type: "CLEAR_TIMEOUT"; serverId: string; userId: string }
  | { type: "UPDATE_DISCOVERY"; serverId: string; discoverable: boolean; description: string; keywords: string[] };

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function addUnique(list: string[], value: string): string[] {
  return list.includes(value) ? list : [...list, value];
}

/** Random invite code, unique across existing servers. */
function newInviteCode(servers: Server[]): string {
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 8);
  } while (servers.some((s) => s.invite === code));
  return code;
}

function mapServer(state: AppState, serverId: string, fn: (s: Server) => Server): Server[] {
  return state.servers.map((s) => (s.id === serverId ? fn(s) : s));
}

/** Find the server that owns a given channel. */
function serverOfChannel(state: AppState, channelId: string): Server | undefined {
  return state.servers.find((s) => s.channels.some((c) => c.id === channelId));
}

/** Append an audit-log entry to a server (most recent first, capped at 100). */
function withAudit(
  server: Server,
  entry: { action: string; actorId: string; targetId?: string; detail: string },
): Server {
  const log = [
    { id: id("a"), createdAt: new Date().toISOString(), ...entry },
    ...server.auditLog,
  ].slice(0, 100);
  return { ...server, auditLog: log };
}

/** First blocked word found in content, or undefined. */
function blockedWordIn(server: Server, content: string): string | undefined {
  const lower = content.toLowerCase();
  return server.blockedWords.find((w) => w && lower.includes(w));
}

function reducer(state: AppState, action: Action): AppState {
  const me = state.currentUserId;
  switch (action.type) {
    case "SEND_MESSAGE": {
      if (!action.content.trim() && !action.attachment) return state;
      // AutoMod: block messages containing a blocked word in a server channel.
      const srv = serverOfChannel(state, action.channelId);
      if (srv && action.content) {
        const word = blockedWordIn(srv, action.content);
        if (word) {
          return {
            ...state,
            servers: mapServer(state, srv.id, (s) =>
              withAudit(s, {
                action: "AutoMod",
                actorId: "automod",
                targetId: me,
                detail: `Blocked a message containing "${word}"`,
              }),
            ),
          };
        }
      }
      const msg: Message = {
        id: id("m"),
        channelId: action.channelId,
        authorId: me,
        content: action.content.trim(),
        createdAt: new Date().toISOString(),
        attachment: action.attachment,
        replyTo: action.replyTo,
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case "DELETE_MESSAGE": {
      const msg = state.messages.find((m) => m.id === action.messageId);
      if (!msg) return state;
      const server = serverOfChannel(state, msg.channelId);
      const allowed =
        msg.authorId === me || (server && can(server, me, "DELETE_MESSAGES"));
      if (!allowed) return state;
      return {
        ...state,
        messages: state.messages.filter((m) => m.id !== action.messageId),
      };
    }

    case "EDIT_MESSAGE": {
      const content = action.content.trim();
      if (!content) return state;
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId && m.authorId === me
            ? { ...m, content, editedAt: new Date().toISOString() }
            : m,
        ),
      };
    }

    case "MARK_READ": {
      const u = state.users[me];
      return {
        ...state,
        users: { ...state.users, [me]: { ...u, lastRead: { ...u.lastRead, [action.channelId]: new Date().toISOString() } } },
      };
    }

    case "DISMISS_NOTIFICATION": {
      const u = state.users[me];
      return {
        ...state,
        users: { ...state.users, [me]: { ...u, dismissedNotifications: addUnique(u.dismissedNotifications, action.messageId) } },
      };
    }

    case "SET_ACCENT": {
      const u = state.users[me];
      return { ...state, users: { ...state.users, [me]: { ...u, appAccent: action.color } } };
    }

    case "TOGGLE_PIN": {
      const msg = state.messages.find((m) => m.id === action.messageId);
      if (!msg) return state;
      const server = serverOfChannel(state, msg.channelId);
      // Pinning requires the permission in a server channel.
      if (!server || !can(server, me, "PIN_MESSAGES")) return state;
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, pinned: !m.pinned } : m,
        ),
      };
    }

    case "TOGGLE_REACTION": {
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (m.id !== action.messageId) return m;
          const reactions = { ...(m.reactions ?? {}) };
          const ids = reactions[action.emoji] ?? [];
          const next = ids.includes(me) ? ids.filter((u) => u !== me) : [...ids, me];
          if (next.length === 0) delete reactions[action.emoji];
          else reactions[action.emoji] = next;
          return { ...m, reactions };
        }),
      };
    }

    case "MOVE_CHANNEL": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => {
          const i = s.channels.findIndex((c) => c.id === action.channelId);
          const j = i + action.dir;
          if (i < 0 || j < 0 || j >= s.channels.length) return s;
          const channels = [...s.channels];
          [channels[i], channels[j]] = [channels[j], channels[i]];
          return { ...s, channels };
        }),
      };
    }

    case "SET_CHANNEL_SEND_ROLES": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          channels: s.channels.map((c) =>
            c.id === action.channelId ? { ...c, sendRoleIds: action.roleIds } : c,
          ),
        })),
      };
    }

    case "SET_CHANNEL_VIEW_ROLES": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          channels: s.channels.map((c) =>
            c.id === action.channelId ? { ...c, viewRoleIds: action.roleIds } : c,
          ),
        })),
      };
    }

    case "MOVE_ROLE": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => {
          // Roles are displayed highest-position first; swap with the neighbor.
          const sorted = [...s.roles].sort((a, b) => b.position - a.position);
          const i = sorted.findIndex((r) => r.id === action.roleId);
          const j = i + action.dir;
          if (i < 0 || j < 0 || j >= sorted.length) return s;
          // @everyone stays pinned to the bottom.
          if (sorted[i].name === "@everyone" || sorted[j].name === "@everyone") return s;
          const pi = sorted[i].position;
          const pj = sorted[j].position;
          return {
            ...s,
            roles: s.roles.map((r) =>
              r.id === sorted[i].id ? { ...r, position: pj } : r.id === sorted[j].id ? { ...r, position: pi } : r,
            ),
          };
        }),
      };
    }

    case "DELETE_CHANNEL": {
      const server = state.servers.find((s) => s.id === action.serverId);
      // Keep at least one channel around.
      if (!server || server.channels.length <= 1) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          channels: s.channels.filter((c) => c.id !== action.channelId),
        })),
        messages: state.messages.filter((m) => m.channelId !== action.channelId),
      };
    }

    case "CREATE_SERVER": {
      const everyoneRole: Role = {
        id: id("r"),
        name: "@everyone",
        color: "#9aa0b4",
        permissions: [],
        position: 0,
        staff: false,
        mentionable: false,
      };
      const automodRole: Role = {
        id: id("r"),
        name: "AutoMod",
        color: "#43d9ad",
        permissions: [],
        position: 1,
        staff: false,
        mentionable: false,
      };
      const server: Server = {
        id: id("s"),
        name: action.name.trim() || "New Server",
        icon: action.icon || "✨",
        // New servers have 0 Stars, so animated (GIF) icons aren't unlocked yet.
        iconImage: action.iconImage && !isGif(action.iconImage) ? action.iconImage : "",
        invite: newInviteCode(state.servers),
        ownerId: me,
        channels: [{ id: id("c"), name: "general", sendRoleIds: [], viewRoleIds: [] }],
        roles: [everyoneRole, automodRole],
        members: [
          { userId: me, roleIds: [everyoneRole.id] },
          { userId: "automod", roleIds: [everyoneRole.id, automodRole.id] },
        ],
        discoverable: false,
        verified: false,
        description: "",
        keywords: [],
        blockedWords: [],
        auditLog: [],
        onboarding: { enabled: false, cosmeticRoleIds: [] },
        stickers: [],
      };
      return { ...state, servers: [...state.servers, server] };
    }

    case "JOIN_SERVER": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => {
          if (s.members.some((m) => m.userId === me)) return s;
          const everyone = s.roles.find((r) => r.name === "@everyone");
          return {
            ...s,
            members: [...s.members, { userId: me, roleIds: everyone ? [everyone.id] : [] }],
          };
        }),
      };
    }

    case "CREATE_CHANNEL": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          channels: [...s.channels, { id: id("c"), name: action.name.trim().replace(/\s+/g, "-").toLowerCase(), sendRoleIds: [], viewRoleIds: [] }],
        })),
      };
    }

    case "UPDATE_PROFILE": {
      const u = state.users[me];
      // Usernames are unique — reject a change that collides with someone else.
      let username = u.username;
      if (action.username !== undefined) {
        const next = action.username.trim();
        if (next && !usernameTaken(state, next, me)) username = next;
      }
      return {
        ...state,
        users: {
          ...state.users,
          [me]: {
            ...u,
            bio: action.bio ?? u.bio,
            avatar: action.avatar ?? u.avatar,
            nickname: action.nickname ?? u.nickname,
            blurb: action.blurb ?? u.blurb,
            blurbColor: action.blurbColor ?? u.blurbColor,
            username,
          },
        },
      };
    }

    case "UPDATE_THEME": {
      const u = state.users[me];
      return {
        ...state,
        users: { ...state.users, [me]: { ...u, theme: { ...u.theme, ...action.theme } } },
      };
    }

    case "UPDATE_BANNER": {
      const u = state.users[me];
      // Everyone can set a static banner image; animated GIFs need a paid tier.
      let image = u.banner.image;
      if (action.image !== undefined) {
        if (!isGif(action.image) || u.tier !== "free") image = action.image;
      }
      return {
        ...state,
        users: {
          ...state.users,
          [me]: {
            ...u,
            banner: {
              color: action.color ?? u.banner.color,
              image,
              position: action.position ?? u.banner.position ?? 50,
            },
          },
        },
      };
    }

    case "UPDATE_AESTHETIC": {
      const u = state.users[me];
      const patch = { ...action.patch };
      // Only supernova members may turn it on.
      if (patch.enabled && u.tier !== "supernova") patch.enabled = false;
      return {
        ...state,
        users: { ...state.users, [me]: { ...u, aesthetic: { ...u.aesthetic, ...patch } } },
      };
    }

    case "SET_TIER": {
      const u = state.users[me];
      return { ...state, users: { ...state.users, [me]: { ...u, tier: action.tier } } };
    }

    case "TOGGLE_BLOCK": {
      const u = state.users[me];
      const blocked = u.blockedUserIds.includes(action.userId)
        ? u.blockedUserIds.filter((x) => x !== action.userId)
        : [...u.blockedUserIds, action.userId];
      return { ...state, users: { ...state.users, [me]: { ...u, blockedUserIds: blocked } } };
    }

    case "TOGGLE_FOLLOW": {
      if (action.userId === me) return state;
      const u = state.users[me];
      const following = u.following.includes(action.userId)
        ? u.following.filter((x) => x !== action.userId)
        : [...u.following, action.userId];
      return { ...state, users: { ...state.users, [me]: { ...u, following } } };
    }

    // Adding a friend makes the follow mutual (the other side "accepts").
    case "ADD_FRIEND": {
      const other = state.users[action.userId];
      if (action.userId === me || !other) return state;
      const u = state.users[me];
      return {
        ...state,
        users: {
          ...state.users,
          [me]: { ...u, following: addUnique(u.following, action.userId) },
          [action.userId]: { ...other, following: addUnique(other.following, me) },
        },
      };
    }

    case "REMOVE_FRIEND": {
      const other = state.users[action.userId];
      if (!other) return state;
      const u = state.users[me];
      return {
        ...state,
        users: {
          ...state.users,
          [me]: { ...u, following: u.following.filter((x) => x !== action.userId) },
          [action.userId]: { ...other, following: other.following.filter((x) => x !== me) },
        },
      };
    }

    case "ALLOCATE_STAR": {
      const u = state.users[me];
      const current = u.starAllocations[action.serverId] ?? 0;
      const next = current + action.delta;
      // Can't go below zero or spend more Stars than the tier grants.
      if (next < 0) return state;
      if (action.delta > 0 && starsAvailable(u) <= 0) return state;
      const starAllocations = { ...u.starAllocations };
      if (next === 0) delete starAllocations[action.serverId];
      else starAllocations[action.serverId] = next;
      return { ...state, users: { ...state.users, [me]: { ...u, starAllocations } } };
    }

    case "SET_SERVER_ICON": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !can(server, me, "MANAGE_SERVER")) return state;
      // Animated (GIF) server icons require the boost threshold.
      if (
        isGif(action.iconImage) &&
        serverStars(state, action.serverId) < BOOST_ANIMATED_ICON
      ) {
        return state;
      }
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({ ...s, iconImage: action.iconImage })),
      };
    }

    case "SET_SERVER_INVITE": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !can(server, me, "MANAGE_SERVER")) return state;
      // Custom invites are a boost perk.
      if (serverStars(state, action.serverId) < BOOST_CUSTOM_INVITE) return state;
      const code = action.invite.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      // Invite codes are unique to one server.
      if (!code || state.servers.some((s) => s.id !== server.id && s.invite === code)) {
        return state;
      }
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({ ...s, invite: code })),
      };
    }

    case "CREATE_GROUP": {
      const memberIds = Array.from(new Set([me, ...action.memberIds]));
      const group: GroupChat = {
        id: action.id,
        name: action.name.trim() || "New Group",
        iconImage: "",
        createdBy: me,
        memberIds,
      };
      return { ...state, groups: [...state.groups, group] };
    }

    case "ADD_TO_GROUP": {
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, memberIds: addUnique(g.memberIds, action.userId) }
            : g,
        ),
      };
    }

    case "REMOVE_FROM_GROUP": {
      const group = state.groups.find((g) => g.id === action.groupId);
      // Only the creator may remove members (and not themselves this way).
      if (!group || group.createdBy !== me || action.userId === me) return state;
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, memberIds: g.memberIds.filter((u) => u !== action.userId) }
            : g,
        ),
      };
    }

    case "RENAME_GROUP": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.groupId ? { ...g, name } : g)),
      };
    }

    case "SET_GROUP_ICON": {
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, iconImage: action.iconImage } : g,
        ),
      };
    }

    case "LEAVE_GROUP": {
      return {
        ...state,
        groups: state.groups
          .map((g) =>
            g.id === action.groupId
              ? { ...g, memberIds: g.memberIds.filter((u) => u !== me) }
              : g,
          )
          // Drop a group once nobody is left in it.
          .filter((g) => g.memberIds.length > 0),
      };
    }

    case "CREATE_ROLE": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => {
          const position = Math.max(0, ...s.roles.map((r) => r.position)) + 10;
          return { ...s, roles: [...s.roles, { ...action.role, id: id("r"), position }] };
        }),
      };
    }

    case "UPDATE_ROLE": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          roles: s.roles.map((r) => (r.id === action.roleId ? { ...r, ...action.patch } : r)),
        })),
      };
    }

    case "DELETE_ROLE": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          roles: s.roles.filter((r) => r.id !== action.roleId),
          members: s.members.map((m) => ({
            ...m,
            roleIds: m.roleIds.filter((rid) => rid !== action.roleId),
          })),
        })),
      };
    }

    case "ASSIGN_ROLE": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          members: s.members.map((m) => {
            if (m.userId !== action.userId) return m;
            const has = m.roleIds.includes(action.roleId);
            if (action.on && !has) return { ...m, roleIds: [...m.roleIds, action.roleId] };
            if (!action.on && has) return { ...m, roleIds: m.roleIds.filter((r) => r !== action.roleId) };
            return m;
          }),
        })),
      };
    }

    case "KICK": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !canModerate(server, me, action.userId)) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) =>
          withAudit({ ...s, members: s.members.filter((m) => m.userId !== action.userId) }, {
            action: "Kick",
            actorId: me,
            targetId: action.userId,
            detail: "Kicked from the server",
          }),
        ),
      };
    }

    case "BAN": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !canModerate(server, me, action.userId)) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) =>
          withAudit(
            { ...s, members: s.members.map((m) => (m.userId === action.userId ? { ...m, banned: true } : m)) },
            { action: "Ban", actorId: me, targetId: action.userId, detail: "Banned from the server" },
          ),
        ),
      };
    }

    case "TIMEOUT": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !canModerate(server, me, action.userId)) return state;
      const until = new Date(Date.now() + action.minutes * 60_000).toISOString();
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) =>
          withAudit(
            { ...s, members: s.members.map((m) => (m.userId === action.userId ? { ...m, timeoutUntil: until } : m)) },
            { action: "Timeout", actorId: me, targetId: action.userId, detail: `Timed out for ${action.minutes}m` },
          ),
        ),
      };
    }

    case "CLEAR_TIMEOUT": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) =>
          withAudit(
            { ...s, members: s.members.map((m) => (m.userId === action.userId ? { ...m, timeoutUntil: undefined } : m)) },
            { action: "Timeout", actorId: me, targetId: action.userId, detail: "Cleared timeout" },
          ),
        ),
      };
    }

    case "SET_BLOCKED_WORDS": {
      const words = action.words.map((w) => w.trim().toLowerCase()).filter(Boolean);
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) =>
          withAudit({ ...s, blockedWords: words }, {
            action: "AutoMod",
            actorId: me,
            detail: `Updated blocked words (${words.length})`,
          }),
        ),
      };
    }

    case "SET_ONBOARDING": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          onboarding: { enabled: action.enabled, cosmeticRoleIds: action.cosmeticRoleIds },
        })),
      };
    }

    case "COMPLETE_ONBOARDING": {
      const u = state.users[me];
      return {
        ...state,
        users: { ...state.users, [me]: { ...u, onboarded: addUnique(u.onboarded, action.serverId) } },
      };
    }

    case "ADD_STICKER": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !can(server, me, "MANAGE_SERVER")) return state;
      // Requires the boost threshold, and caps the count.
      if (serverStars(state, action.serverId) < BOOST_STICKERS) return state;
      if (server.stickers.length >= MAX_STICKERS || !action.url) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({ ...s, stickers: [...s.stickers, action.url] })),
      };
    }

    case "REMOVE_STICKER": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !can(server, me, "MANAGE_SERVER")) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          stickers: s.stickers.filter((_, i) => i !== action.index),
        })),
      };
    }

    case "TOGGLE_FAVORITE_STICKER": {
      const u = state.users[me];
      const favs = u.favoriteStickers.includes(action.url)
        ? u.favoriteStickers.filter((x) => x !== action.url)
        : [...u.favoriteStickers, action.url];
      return { ...state, users: { ...state.users, [me]: { ...u, favoriteStickers: favs } } };
    }

    case "UPDATE_DISCOVERY": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          discoverable: action.discoverable,
          description: action.description,
          keywords: action.keywords,
        })),
      };
    }

    default:
      return state;
  }
}

/** Backfill fields added after a user's state was first persisted. */
function migrate(state: AppState): AppState {
  const users = Object.fromEntries(
    Object.entries(state.users).map(([uid, u]) => [
      uid,
      {
        ...u,
        nickname: u.nickname ?? "",
        blurb: u.blurb ?? "",
        blurbColor: u.blurbColor ?? "#9b7bff",
        banner: {
          color: u.banner?.color ?? "#2a2440",
          image: u.banner?.image ?? "",
          position: u.banner?.position ?? 50,
        },
        following: u.following ?? [],
        starAllocations: u.starAllocations ?? {},
        onboarded: u.onboarded ?? [],
        lastRead: u.lastRead ?? {},
        dismissedNotifications: u.dismissedNotifications ?? [],
        appAccent: u.appAccent ?? "#9b7bff",
        favoriteStickers: u.favoriteStickers ?? [],
        aesthetic: {
          enabled: false,
          title: "",
          bgColor: "#dfe9d6",
          cardColor: "#ffffff",
          accentColor: "#a9c49a",
          textColor: "#4a5a44",
          likes: "",
          dislikes: "",
          beforeFollow: "",
          doNotFollow: "",
          likesTitle: "Likes",
          dislikesTitle: "Dislikes",
          beforeTitle: "Before you follow",
          dnfTitle: "Do not follow if…",
          gallery: [],
          repServerId: "",
          ...((u.aesthetic ?? {}) as Partial<Aesthetic>),
        },
      },
    ]),
  );
  // Ensure the AutoMod bot user always exists.
  if (!users.automod) users.automod = seedState.users.automod;
  const servers = state.servers.map((s) => ({
    ...s,
    iconImage: s.iconImage ?? "",
    invite: s.invite ?? newInviteCode(state.servers),
    verified: s.verified ?? false,
    blockedWords: s.blockedWords ?? [],
    auditLog: s.auditLog ?? [],
    onboarding: s.onboarding ?? { enabled: false, cosmeticRoleIds: [] },
    stickers: s.stickers ?? [],
    channels: s.channels.map((c) => ({ ...c, sendRoleIds: c.sendRoleIds ?? [], viewRoleIds: c.viewRoleIds ?? [] })),
    roles: s.roles.map((r) => ({ ...r, mentionable: r.mentionable ?? false })),
  }));
  const groups = (state.groups ?? []).map((g) => ({
    ...g,
    iconImage: g.iconImage ?? "",
    createdBy: g.createdBy ?? g.memberIds[0],
  }));
  return { ...state, users, servers, groups };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw) as AppState);
  } catch {
    /* ignore corrupt storage */
  }
  return seedState;
}

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

export type { Action, Permission };
