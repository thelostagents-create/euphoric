// Core domain types for Euphoric.

export type Tier = "free" | "premium" | "supernova" | "developer";

/** Server-level permissions a role can grant. */
export type Permission =
  | "KICK_MEMBERS"
  | "BAN_MEMBERS"
  | "TIMEOUT_MEMBERS"
  | "DELETE_MESSAGES"
  | "PIN_MESSAGES"
  | "MENTION_EVERYONE"
  | "MANAGE_ROLES"
  | "MANAGE_CHANNELS"
  | "MANAGE_AUTOMOD"
  | "MANAGE_ONBOARDING"
  | "MANAGE_SERVER"
  | "VIEW_AUDIT_LOG";

export const ALL_PERMISSIONS: { id: Permission; label: string; desc: string }[] = [
  { id: "KICK_MEMBERS", label: "Kick Members", desc: "Remove members from the server." },
  { id: "BAN_MEMBERS", label: "Ban Members", desc: "Permanently bar members from the server." },
  { id: "TIMEOUT_MEMBERS", label: "Timeout Members", desc: "Temporarily mute members." },
  { id: "DELETE_MESSAGES", label: "Delete Messages", desc: "Delete messages sent by other members." },
  { id: "PIN_MESSAGES", label: "Pin Messages", desc: "Pin and unpin messages in channels." },
  { id: "MENTION_EVERYONE", label: "Mention @everyone", desc: "Ping and alert everyone in the server." },
  { id: "MANAGE_ROLES", label: "Manage Roles", desc: "Create, edit and assign roles." },
  { id: "MANAGE_CHANNELS", label: "Manage Lounges", desc: "Create and delete lounges." },
  { id: "MANAGE_AUTOMOD", label: "Manage AutoMod", desc: "Configure blocked words." },
  { id: "MANAGE_ONBOARDING", label: "Manage Onboarding", desc: "Set up the new-member onboarding screen." },
  { id: "MANAGE_SERVER", label: "Manage Party", desc: "Edit party settings, invite and discovery." },
  { id: "VIEW_AUDIT_LOG", label: "View Audit Log", desc: "See moderation history for the party." },
];

/** Boost thresholds unlocked by spent Stars. */
export const BOOST_ANIMATED_ICON = 3;
export const BOOST_STICKERS = 6;
export const BOOST_CUSTOM_INVITE = 9;
/** Max custom stickers a boosted party can hold. */
export const MAX_STICKERS = 10;

/** Premium customization profile theme. Only meaningful for the supernova tier. */
export interface ProfileTheme {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  /** Display-name color, independent of the accent. */
  nameColor: string;
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

/**
 * "Aesthetic avatars" — a customizable profile-card layout (Supernova only).
 * Banner/avatar come from the main profile; everything else is freeform.
 */
export interface Aesthetic {
  enabled: boolean;
  title: string;
  bgColor: string;
  cardColor: string;
  accentColor: string;
  textColor: string;
  /** Display-name color on the aesthetic card. */
  nameColor: string;
  likes: string;
  dislikes: string;
  beforeFollow: string;
  doNotFollow: string;
  /** Custom box headers. */
  likesTitle: string;
  dislikesTitle: string;
  beforeTitle: string;
  dnfTitle: string;
  /** Up to 6 gallery image urls/data-urls. */
  gallery: string[];
  /** A server the user reps; its icon links to joining it. */
  repServerId: string;
}

/**
 * "Creative Control" — a customizable profile card with four window-style
 * layouts (Supernova only). Banner/avatar come from the main profile.
 *  - style 1: site window, banner at top, no social widgets
 *  - style 2: browser window, banner at the bottom
 *  - style 3: archive window, banner at the top
 *  - style 4: fandom card, loose box-grid layout (ported from Aesthetic)
 * All share four renameable text boxes and the same color controls.
 */
export interface CreativeControl {
  enabled: boolean;
  /** Which layout: 1, 2, 3, or 4. */
  style: 1 | 2 | 3 | 4;
  /** Window/site title shown in the chrome bar. */
  title: string;
  /** The line under the name (pronouns / age / etc). */
  details: string;
  bgColor: string;
  cardColor: string;
  accentColor: string;
  textColor: string;
  nameColor: string;
  borderColor: string;
  box1Title: string; box1Body: string;
  box2Title: string; box2Body: string;
  box3Title: string; box3Body: string;
  box4Title: string; box4Body: string;
  /** Fandom card (style 4) only: up to 3 gallery images and a repped party. */
  gallery?: string[];
  repServerId?: string;
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
  /** Short status line shown on the profile. */
  blurb: string;
  blurbColor: string;
  tier: Tier;
  banner: Banner;
  theme: ProfileTheme;
  aesthetic: Aesthetic;
  creative: CreativeControl;
  /** User ids this user has blocked. */
  blockedUserIds: string[];
  /** User ids this user follows. A mutual follow = friends. */
  following: string[];
  /** Stars this user has spent, keyed by server id. */
  starAllocations: Record<string, number>;
  /** Server ids whose onboarding this user has completed. */
  onboarded: string[];
  /** Last-read timestamp per channel/DM/group id. */
  lastRead: Record<string, string>;
  /** Message ids whose mention notification has been dismissed. */
  dismissedNotifications: string[];
  /** Personal app accent color. */
  appAccent: string;
  /** Light theme preference. */
  lightMode: boolean;
  /** Sticker urls the user has favorited (shown first in the picker). */
  favoriteStickers: string[];
  /** Personal ordering of the party rail, by server id. */
  serverOrder?: string[];
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
  /** When true, anyone can @mention this role to ping its members. */
  mentionable: boolean;
}

export interface Member {
  userId: string;
  roleIds: string[];
  /** ISO timestamp the timeout expires; undefined = not timed out. */
  timeoutUntil?: string;
  banned?: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  authorId: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  /** Role ids allowed to send messages. Empty = everyone can talk. */
  sendRoleIds: string[];
  /** Role ids allowed to see the channel. Empty = everyone can see. */
  viewRoleIds: string[];
  /** Forum-style channel: holds posts (sub-threads) instead of a flat feed. */
  forum?: boolean;
  posts?: ForumPost[];
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
  /** Id of the message this one replies to. */
  replyTo?: string;
  pinned?: boolean;
  /** Set when the message has been edited. */
  editedAt?: string;
}

export interface AuditEntry {
  id: string;
  /** Short action label, e.g. "Timeout", "Ban", "AutoMod". */
  action: string;
  actorId: string;
  targetId?: string;
  detail: string;
  createdAt: string;
}

export interface Onboarding {
  enabled: boolean;
  /** Cosmetic roles a new member may pick for themselves. */
  cosmeticRoleIds: string[];
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
  /** Trending parties surface under the bold 🔥 trending tag in Explore.
   *  (Stored as `verified` for backwards compatibility.) */
  verified: boolean;
  description: string;
  keywords: string[];
  /** AutoMod blocked words (lowercased). */
  blockedWords: string[];
  auditLog: AuditEntry[];
  onboarding: Onboarding;
  /** Custom sticker (gif) urls; uploadable once the party hits 6 Stars. */
  stickers: string[];
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

/**
 * A "photo dump" or note posted to the friends feed. Visible only to the
 * author's mutual friends. Permanent — also surfaces on the author's profile.
 */
export interface FeedPost {
  id: string;
  authorId: string;
  text: string;
  /** Up to a few image/gif urls for a photo dump. */
  images: string[];
  /** Optional card background color (Premium/Supernova perk). */
  color?: string;
  createdAt: string;
  /** Emoji -> user ids who reacted. */
  reactions?: Record<string, string[]>;
}

export interface AppState {
  currentUserId: string;
  users: Record<string, User>;
  servers: Server[];
  groups: GroupChat[];
  messages: Message[];
  feedPosts: FeedPost[];
}
