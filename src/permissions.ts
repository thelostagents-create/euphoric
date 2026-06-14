import type { Member, Permission, Server } from "./types";

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
    return new Set<Permission>([
      "KICK_MEMBERS",
      "BAN_MEMBERS",
      "TIMEOUT_MEMBERS",
      "MANAGE_ROLES",
      "MANAGE_CHANNELS",
      "MANAGE_SERVER",
    ]);
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
