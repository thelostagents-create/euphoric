import { supabase } from "./supabase";
import {
  followDb,
  unfollowDb,
  blockDb,
  unblockDb,
  addGroupMemberDb,
  removeGroupMemberDb,
  renameGroupDb,
  setGroupIconDb,
  allocateStarDb,
} from "./db";
import type { AppState } from "../types";
import type { Action } from "../store";

/**
 * Mirrors social actions (follows, blocks, group membership/edits) to
 * Supabase. Follows/blocks are stored as per-user arrays in state, so we diff
 * the current user's arrays before/after and apply the delta. Only runs for a
 * backend-signed-in user, and only against real (UUID) targets.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function persistSocialAction(action: Action, prev: AppState, next: AppState): Promise<void> {
  if (!supabase) return;
  const me = next.currentUserId;
  if (!UUID.test(me)) return; // demo / guest — keep it local
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const a = action as any;

  try {
    switch (action.type) {
      // Follow toggles and friend add/remove all reduce to my own follow edges.
      case "TOGGLE_FOLLOW":
      case "ADD_FRIEND":
      case "REMOVE_FRIEND": {
        const before = new Set(prev.users[me]?.following ?? []);
        const after = new Set(next.users[me]?.following ?? []);
        for (const id of after) if (!before.has(id) && UUID.test(id)) await followDb(me, id);
        for (const id of before) if (!after.has(id) && UUID.test(id)) await unfollowDb(me, id);
        return;
      }
      case "TOGGLE_BLOCK": {
        const before = new Set(prev.users[me]?.blockedUserIds ?? []);
        const after = new Set(next.users[me]?.blockedUserIds ?? []);
        for (const id of after) if (!before.has(id) && UUID.test(id)) await blockDb(me, id);
        for (const id of before) if (!after.has(id) && UUID.test(id)) await unblockDb(me, id);
        return;
      }

      // Stars (boosts): persist my allocation for the party.
      case "ALLOCATE_STAR": {
        if (!UUID.test(a.serverId)) return;
        const count = next.users[me]?.starAllocations?.[a.serverId] ?? 0;
        await allocateStarDb(me, a.serverId, count);
        return;
      }

      /* ── Groups (CREATE_GROUP is handled in the modal) ──── */
      case "ADD_TO_GROUP":
        if (UUID.test(a.groupId) && UUID.test(a.userId)) await addGroupMemberDb(a.groupId, a.userId);
        return;
      case "REMOVE_FROM_GROUP":
        if (UUID.test(a.groupId) && UUID.test(a.userId)) await removeGroupMemberDb(a.groupId, a.userId);
        return;
      case "LEAVE_GROUP":
        if (UUID.test(a.groupId)) await removeGroupMemberDb(a.groupId, me);
        return;
      case "RENAME_GROUP": {
        if (!UUID.test(a.groupId)) return;
        const g = next.groups.find((x) => x.id === a.groupId);
        if (g) await renameGroupDb(a.groupId, g.name);
        return;
      }
      case "SET_GROUP_ICON": {
        if (!UUID.test(a.groupId)) return;
        const g = next.groups.find((x) => x.id === a.groupId);
        if (g) await setGroupIconDb(a.groupId, g.iconImage);
        return;
      }
    }
  } catch (e) {
    console.error("persistSocialAction failed:", action.type, e);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
