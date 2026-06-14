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
  Message,
  Permission,
  ProfileTheme,
  Role,
  Server,
  Tier,
} from "./types";
import { seedState } from "./data/seed";
import { canModerate } from "./permissions";

const STORAGE_KEY = "euphoric.state.v1";

type Action =
  | { type: "SEND_MESSAGE"; channelId: string; content: string }
  | { type: "CREATE_SERVER"; name: string; icon: string }
  | { type: "JOIN_SERVER"; serverId: string }
  | { type: "CREATE_CHANNEL"; serverId: string; name: string }
  | { type: "UPDATE_PROFILE"; bio?: string; avatar?: string; username?: string }
  | { type: "UPDATE_THEME"; theme: Partial<ProfileTheme> }
  | { type: "SET_TIER"; tier: Tier }
  | { type: "TOGGLE_BLOCK"; userId: string }
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

function mapServer(state: AppState, serverId: string, fn: (s: Server) => Server): Server[] {
  return state.servers.map((s) => (s.id === serverId ? fn(s) : s));
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
      return {
        ...state,
        users: {
          ...state.users,
          [me]: {
            ...u,
            bio: action.bio ?? u.bio,
            avatar: action.avatar ?? u.avatar,
            username: action.username ?? u.username,
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

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
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
