import type { AppState, Server, Tier, User } from "./types";
import { can } from "./permissions";

/** Total Stars a member of a given tier is granted to spend. */
export function starCapacity(tier: Tier): number {
  if (tier === "supernova") return 2;
  if (tier === "premium") return 1;
  return 0;
}

/** Stars a user has already spent across all servers. */
export function starsSpent(user: User): number {
  return Object.values(user.starAllocations).reduce((a, b) => a + b, 0);
}

export function starsAvailable(user: User): number {
  return starCapacity(user.tier) - starsSpent(user);
}

/** Total Stars a server has received from every member. */
export function serverStars(state: AppState, serverId: string): number {
  return Object.values(state.users).reduce(
    (sum, u) => sum + (u.starAllocations[serverId] ?? 0),
    0,
  );
}

/** Name shown in chat: the nickname if set, otherwise the username. */
export function displayName(user: User | undefined): string {
  if (!user) return "unknown";
  return user.nickname.trim() || user.username;
}

export function areFriends(a: User, b: User): boolean {
  return a.following.includes(b.id) && b.following.includes(a.id);
}

export function friendsOf(state: AppState, userId: string): User[] {
  const me = state.users[userId];
  if (!me) return [];
  return me.following
    .map((id) => state.users[id])
    .filter((u): u is User => !!u && u.following.includes(userId));
}

/** A short invite shown to users, e.g. euphoric.gg/af39kd. */
export function inviteLink(server: Server): string {
  return `euphoric.gg/${server.invite}`;
}

/** Pull the code out of a pasted link or raw code. */
export function parseInviteCode(input: string): string {
  const trimmed = input.trim();
  const slash = trimmed.lastIndexOf("/");
  return (slash >= 0 ? trimmed.slice(slash + 1) : trimmed).toLowerCase();
}

export function isGif(url: string): boolean {
  return /\.gif(\?|$)/i.test(url.trim());
}

/** Whether a username is already claimed by someone other than `exceptId`. */
export function usernameTaken(state: AppState, name: string, exceptId: string): boolean {
  const norm = name.trim().toLowerCase();
  return Object.values(state.users).some(
    (u) => u.id !== exceptId && u.username.trim().toLowerCase() === norm,
  );
}

/** Stable channel id for the DM between two users. */
export function dmChannelId(a: string, b: string): string {
  return `dm:${[a, b].sort().join("_")}`;
}

/** Resolve a username to a user, ignoring case. */
export function userByName(state: AppState, name: string): User | undefined {
  const norm = name.trim().replace(/^@/, "").toLowerCase();
  return Object.values(state.users).find((u) => u.username.toLowerCase() === norm);
}

export interface Mention {
  messageId: string;
  authorId: string;
  serverId: string;
  serverName: string;
  channelId: string;
  channelName: string;
  content: string;
  createdAt: string;
  /** True when this came from an authorized @everyone ping. */
  everyone: boolean;
}

const EVERYONE_RE = /@everyone\b/i;

/**
 * Server messages (not DMs) that notify the given user, newest first:
 * direct @username mentions, plus @everyone pings from members who hold the
 * Mention @everyone permission (in servers the user belongs to).
 */
export function mentionsOf(state: AppState, userId: string): Mention[] {
  const user = state.users[userId];
  if (!user) return [];
  const namePattern = new RegExp(`@${user.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const mentions: Mention[] = [];
  for (const m of state.messages) {
    if (m.channelId.startsWith("dm:")) continue;
    if (m.authorId === userId) continue;
    const server = state.servers.find((s) => s.channels.some((c) => c.id === m.channelId));
    if (!server) continue;
    const isMember = server.members.some((mem) => mem.userId === userId && !mem.banned);
    if (!isMember) continue;

    const direct = namePattern.test(m.content);
    const everyone =
      !direct && EVERYONE_RE.test(m.content) && can(server, m.authorId, "MENTION_EVERYONE");
    if (!direct && !everyone) continue;

    const channel = server.channels.find((c) => c.id === m.channelId)!;
    mentions.push({
      messageId: m.id,
      authorId: m.authorId,
      serverId: server.id,
      serverName: server.name,
      channelId: channel.id,
      channelName: channel.name,
      content: m.content,
      createdAt: m.createdAt,
      everyone,
    });
  }
  return mentions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

