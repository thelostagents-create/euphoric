import type { AppState, Server, Tier, User } from "./types";

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
