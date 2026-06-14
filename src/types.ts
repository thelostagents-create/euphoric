// Core domain types for Euphoric.

export type Tier = "free" | "premium" | "supernova";

/** Server-level permissions a role can grant. */
export type Permission =
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "TIMEOUT_MEMBERS"
  | "MANAGE_ROLES"
  | "MANAGE_CHANNELS"
  | "MANAGE_SERVER";

export const ALL_PERMISSIONS: { id: Permission; label: string; desc: string }[] = [
  { id: "KICK_MEMBERS", label: "Kick Members", desc: "Remove members from the server." },
  { id: "BAN_MEMBERS", label: "Ban Members", desc: "Permanently bar members from the server." },
  { id: "TIMEOUT_MEMBERS", label: "Timeout Members", desc: "Temporarily mute members." },
  { id: "MANAGE_ROLES", label: "Manage Roles", desc: "Create, edit and assign roles." },
  { id: "MANAGE_CHANNELS", label: "Manage Channels", desc: "Create and delete channels." },
  { id: "MANAGE_SERVER", label: "Manage Server", desc: "Edit server settings and discovery." },
];

/** MySpace-style profile theme. Only meaningful for the supernova tier. */
export interface ProfileTheme {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  /** A google-ish font-family name applied to the username (supernova only). */
  usernameFont: string;
}

export interface User {
  id: string;
  username: string;
  /** May be an animated GIF url for premium/supernova tiers. */
  avatar: string;
  bio: string;
  tier: Tier;
  theme: ProfileTheme;
  /** User ids this user has blocked. */
  blockedUserIds: string[];
}

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  /** Higher = more authority. The implicit @everyone role is position 0. */
  position: number;
  /** Marks a staff role for the staff-management UI. */
  staff: boolean;
}

export interface Member {
  userId: string;
  roleIds: string[];
  /** ISO timestamp the timeout expires; undefined = not timed out. */
  timeoutUntil?: string;
  banned?: boolean;
}

export interface Channel {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  channels: Channel[];
  roles: Role[];
  members: Member[];
  /** Discovery opt-in. */
  discoverable: boolean;
  description: string;
  keywords: string[];
}

export interface AppState {
  currentUserId: string;
  users: Record<string, User>;
  servers: Server[];
  messages: Message[];
}
