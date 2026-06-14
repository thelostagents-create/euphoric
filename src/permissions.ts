import { ALL_PERMISSIONS, type Channel, type Member, type Permission, type Server } from "./types";

/** The owner implicitly has every permission. */
export function isOwner(server: Server, userId: string): boolean {
  return server.ownerId === userId;
}

export function getMember(server: Server, userId: string): Member | undefined {
  return server.members.find((m) => m.userId === userId);
}

/** Collect the effective permission set for a user within a server. */
export function effectivePermissions(server: Server, userId: string): Set<Permission> {
  if (isOwner(server, userId)) {
    return new Set<Permission>(ALL_PERMISSIONS.map((p) => p.id));
  }
  const member = getMember(server, userId);
  const perms = new Set<Permission>();
  if (!member) return perms;
  for (const roleId of member.roleIds) {
    const role = server.roles.find((r) => r.id === roleId);
    role?.permissions.forEach((p) => perms.add(p));
  }
  return perms;
}

export function can(server: Server, userId: string, permission: Permission): boolean {
  return effectivePermissions(server, userId).has(permission);
}

/** Highest role position held by a member, used for moderation hierarchy. */
export function topRolePosition(server: Server, userId: string): number {
  if (isOwner(server, userId)) return Number.POSITIVE_INFINITY;
  const member = getMember(server, userId);
  if (!member) return 0;
  return member.roleIds.reduce((max, roleId) => {
    const role = server.roles.find((r) => r.id === roleId);
    return role && role.position > max ? role.position : max;
  }, 0);
}

/**
 * A moderator may act on a target only if they outrank them. The owner can act
 * on anyone; nobody can act on the owner.
 */
export function canModerate(server: Server, actorId: string, targetId: string): boolean {
  if (actorId === targetId) return false;
  if (isOwner(server, targetId)) return false;
  if (isOwner(server, actorId)) return true;
  return topRolePosition(server, actorId) > topRolePosition(server, targetId);
}

export function isTimedOut(member: Member | undefined): boolean {
  if (!member?.timeoutUntil) return false;
  return new Date(member.timeoutUntil).getTime() > Date.now();
}

/**
 * Whether a user may send messages in a channel. Empty `sendRoleIds` means
 * everyone may talk; otherwise the user needs one of those roles. The owner
 * and anyone who can manage channels always may.
 */
export function canSendInChannel(server: Server, userId: string, channel: Channel): boolean {
  if (!channel.sendRoleIds || channel.sendRoleIds.length === 0) return true;
  if (isOwner(server, userId) || can(server, userId, "MANAGE_CHANNELS")) return true;
  const member = getMember(server, userId);
  if (!member) return false;
  return channel.sendRoleIds.some((rid) => member.roleIds.includes(rid));
}
