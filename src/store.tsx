import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
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
import { BOOST_ANIMATED_ICON, BOOST_CUSTOM_INVITE } from "./types";

const STORAGE_KEY = "euphoric.state.v1";

type Action =
  | { type: "SEND_MESSAGE"; channelId: string; content: string }
  | { type: "DELETE_MESSAGE"; messageId: string }
  | { type: "CREATE_SERVER"; name: string; icon: string; iconImage?: string }
  | { type: "JOIN_SERVER"; serverId: string }
  | { type: "CREATE_CHANNEL"; serverId: string; name: string }
  | { type: "UPDATE_PROFILE"; bio?: string; avatar?: string; username?: string; nickname?: string }
  | { type: "UPDATE_THEME"; theme: Partial<ProfileTheme> }
  | { type: "UPDATE_BANNER"; color?: string; image?: string }
  | { type: "SET_TIER"; tier: Tier }
  | { type: "TOGGLE_BLOCK"; userId: string }
  | { type: "TOGGLE_FOLLOW"; userId: string }
  | { type: "ADD_FRIEND"; userId: string }
  | { type: "REMOVE_FRIEND"; userId: string }
  | { type: "CREATE_GROUP"; id: string; name: string; memberIds: string[] }
  | { type: "ADD_TO_GROUP"; groupId: string; userId: string }
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

function reducer(state: AppState, action: Action): AppState {
  const me = state.currentUserId;
  switch (action.type) {
    case "SEND_MESSAGE": {
      if (!action.content.trim()) return state;
      const msg: Message = {
        id: id("m"),
        channelId: action.channelId,
        authorId: me,
        content: action.content.trim(),
        createdAt: new Date().toISOString(),
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

    case "CREATE_SERVER": {
      const everyoneRole: Role = {
        id: id("r"),
        name: "@everyone",
        color: "#9aa0b4",
        permissions: [],
        position: 0,
        staff: false,
      };
      const server: Server = {
        id: id("s"),
        name: action.name.trim() || "New Server",
        icon: action.icon || "✨",
        // New servers have 0 Stars, so animated (GIF) icons aren't unlocked yet.
        iconImage: action.iconImage && !isGif(action.iconImage) ? action.iconImage : "",
        invite: newInviteCode(state.servers),
        ownerId: me,
        channels: [{ id: id("c"), name: "general" }],
        roles: [everyoneRole],
        members: [{ userId: me, roleIds: [everyoneRole.id] }],
        discoverable: false,
        description: "",
        keywords: [],
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
          channels: [...s.channels, { id: id("c"), name: action.name.trim().replace(/\s+/g, "-").toLowerCase() }],
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
      // Only premium/supernova members may set a banner image.
      const canImage = u.tier === "premium" || u.tier === "supernova";
      const image =
        action.image !== undefined && canImage ? action.image : u.banner.image;
      return {
        ...state,
        users: {
          ...state.users,
          [me]: {
            ...u,
            banner: { color: action.color ?? u.banner.color, image },
          },
        },
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
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          members: s.members.filter((m) => m.userId !== action.userId),
        })),
      };
    }

    case "BAN": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !canModerate(server, me, action.userId)) return state;
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          members: s.members.map((m) =>
            m.userId === action.userId ? { ...m, banned: true } : m,
          ),
        })),
      };
    }

    case "TIMEOUT": {
      const server = state.servers.find((s) => s.id === action.serverId);
      if (!server || !canModerate(server, me, action.userId)) return state;
      const until = new Date(Date.now() + action.minutes * 60_000).toISOString();
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          members: s.members.map((m) =>
            m.userId === action.userId ? { ...m, timeoutUntil: until } : m,
          ),
        })),
      };
    }

    case "CLEAR_TIMEOUT": {
      return {
        ...state,
        servers: mapServer(state, action.serverId, (s) => ({
          ...s,
          members: s.members.map((m) =>
            m.userId === action.userId ? { ...m, timeoutUntil: undefined } : m,
          ),
        })),
      };
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
        banner: u.banner ?? { color: "#2a2440", image: "" },
        following: u.following ?? [],
        starAllocations: u.starAllocations ?? {},
      },
    ]),
  );
  const servers = state.servers.map((s) => ({
    ...s,
    iconImage: s.iconImage ?? "",
    invite: s.invite ?? newInviteCode(state.servers),
  }));
  return { ...state, users, servers, groups: state.groups ?? [] };
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
