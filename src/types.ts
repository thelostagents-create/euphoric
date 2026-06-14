// Core domain types for Euphoric.

export type Tier = "free" | "premium" | "supernova";

/** Server-level permissions a role can grant. */
export type Permission =
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "TIMEOUT_MEMBERS"
  | "DELETE_MESSAGES"
  | "MENTION_EVERYONE"
  | "MANAGE_ROLES"
  | "MANAGE_CHANNELS"
  | "MANAGE_SERVER";

export const ALL_PERMISSIONS: { id: Permission; label: string; desc: string }[] = [
  { id: "KICK_MEMBERS", label: "Kick Members", desc: "Remove members from the server." },
  { id: "BAN_MEMBERS", label: "Ban Members", desc: "Permanently bar members from the server." },
  { id: "TIMEOUT_MEMBERS", label: "Timeout Members", desc: "Temporarily mute members." },
  { id: "DELETE_MESSAGES", label: "Delete Messages", desc: "Delete messages sent by other members." },
  { id: "MENTION_EVERYONE", label: "Mention @everyone", desc: "Ping and alert everyone in the server." },
  { id: "MANAGE_ROLES", label: "Manage Roles", desc: "Create, edit and assign roles." },
  { id: "MANAGE_CHANNELS", label: "Manage Channels", desc: "Create and delete channels." },
  { id: "MANAGE_SERVER", label: "Manage Server", desc: "Edit server settings, invite and discovery." },
];

/** Boost thresholds unlocked by spent Stars. */
export const BOOST_ANIMATED_ICON = 3;
export const BOOST_CUSTOM_INVITE = 9;

/** Premium customization profile theme. Only meaningful for the supernova tier. */
export interface ProfileTheme {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  /** A google-ish font-family name applied to the username (supernova only). */
  usernameFont: string;
}

/**
 * Profile banner shown behind the avatar. Everyone can set a color; only
 * premium/supernova members may set an image.
 */
export interface Banner {
  color: string;
  /** Image url — premium/supernova only. Empty = color only. */
  image: string;
  /** Vertical crop position of the image, 0 (top) – 100 (bottom). */
  position: number;
}

export interface User {
  id: string;
  /** Unique handle used for @mentions and friend-adds. */
  username: string;
  /** Optional display name shown in chat; falls back to username. */
  nickname: string;
  /** May be an animated GIF url for premium/supernova tiers. */
  avatar: string;
  bio: string;
  tier: Tier;
  banner: Banner;
  theme: ProfileTheme;
  /** User ids this user has blocked. */
  blockedUserIds: string[];
  /** User ids this user follows. A mutual follow = friends. */
  following: string[];
  /** Stars this user has spent, keyed by server id. */
  starAllocations: Record<string, number>;
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

export interface Attachment {
  kind: "image" | "video";
  url: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  attachment?: Attachment;
  /** Emoji -> user ids who reacted. */
  reactions?: Record<string, string[]>;
}

export interface Server {
  id: string;
  name: string;
  /** Emoji fallback icon. */
  icon: string;
  /** Optional image url; GIFs require BOOST_ANIMATED_ICON stars. */
  iconImage: string;
  ownerId: string;
  channels: Channel[];
  roles: Role[];
  members: Member[];
  /** Unique invite code; one server per code. */
  invite: string;
  /** Discovery opt-in. */
  discoverable: boolean;
  description: string;
  keywords: string[];
}

/** A multi-person direct conversation between friends. */
export interface GroupChat {
  id: string;
  name: string;
  /** Optional group picture (image/gif data url). */
  iconImage: string;
  /** The member who created it — only they can remove others. */
  createdBy: string;
  memberIds: string[];
}

export interface AppState {
  currentUserId: string;
  users: Record<string, User>;
  servers: Server[];
  groups: GroupChat[];
  messages: Message[];
}
