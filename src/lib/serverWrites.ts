import { supabase } from "./supabase";
import { triggerServersReload, addAuditDb } from "./db";
import type { AppState, Server, Role } from "../types";
import type { Action } from "../store";

/**
 * Mirrors server-management reducer actions to Supabase. The read side
 * (loadServers) already hydrates parties from the DB, so here we only push the
 * writes. Creates let the DB mint UUIDs and then trigger a reload to reconcile
 * the local optimistic ids; edits/deletes target existing DB rows by id.
 */

// Only DB-backed servers have UUID ids; demo/guest servers keep local ids
// (e.g. "s_ab12cd") and must never be written to the backend.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function srv(state: AppState, id: string): Server | undefined {
  return state.servers.find((s) => s.id === id);
}

export async function persistServerAction(action: Action, prev: AppState, next: AppState): Promise<void> {
  if (!supabase) return;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const a = action as any;
  const serverId: string | undefined = a.serverId;
  if (!serverId || !UUID.test(serverId)) return;

  try {
    // Persist any audit entry the reducer just produced (kick/ban/timeout/etc).
    const ba = srv(prev, serverId);
    const aa = srv(next, serverId);
    if (aa && ba && aa.auditLog.length > ba.auditLog.length) {
      const e = aa.auditLog[0];
      if (UUID.test(e.actorId)) {
        await addAuditDb(serverId, e.action, e.actorId, e.detail, e.targetId && UUID.test(e.targetId) ? e.targetId : undefined);
      }
    }

    switch (action.type) {
      /* ── Channels (lounges) ───────────────────────────── */
      case "CREATE_CHANNEL": {
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        if (!before || !after) return;
        const added = after.channels.find((c) => !before.channels.some((p) => p.id === c.id));
        if (!added) return;
        await supabase.from("channels").insert({
          server_id: serverId,
          name: added.name,
          position: before.channels.length,
          forum: !!added.forum,
          send_role_ids: added.sendRoleIds ?? [],
          view_role_ids: added.viewRoleIds ?? [],
        });
        triggerServersReload();
        return;
      }
      case "DELETE_CHANNEL": {
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        // reducer refuses to delete the last channel — skip if nothing changed.
        if (before && after && before.channels.length === after.channels.length) return;
        await supabase.from("channels").delete().eq("id", a.channelId);
        triggerServersReload();
        return;
      }
      case "MOVE_CHANNEL": {
        const after = srv(next, serverId);
        if (!after) return;
        await Promise.all(
          after.channels
            .filter((c) => UUID.test(c.id))
            .map((c, i) => supabase!.from("channels").update({ position: i }).eq("id", c.id)),
        );
        return;
      }
      case "SET_CHANNEL_FORUM":
        await supabase.from("channels").update({ forum: a.forum }).eq("id", a.channelId);
        return;
      case "SET_CHANNEL_SEND_ROLES":
        await supabase.from("channels").update({ send_role_ids: a.roleIds }).eq("id", a.channelId);
        return;
      case "SET_CHANNEL_VIEW_ROLES":
        await supabase.from("channels").update({ view_role_ids: a.roleIds }).eq("id", a.channelId);
        return;

      /* ── Roles ────────────────────────────────────────── */
      case "CREATE_ROLE": {
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        if (!before || !after) return;
        const added = after.roles.find((r) => !before.roles.some((p) => p.id === r.id));
        if (!added) return;
        await supabase.from("roles").insert({
          server_id: serverId,
          name: added.name,
          color: added.color,
          permissions: added.permissions ?? [],
          position: added.position,
          staff: !!added.staff,
          mentionable: !!added.mentionable,
        });
        triggerServersReload();
        return;
      }
      case "UPDATE_ROLE": {
        const p = a.patch as Partial<Role>;
        const u: Record<string, unknown> = {};
        if (p.name !== undefined) u.name = p.name;
        if (p.color !== undefined) u.color = p.color;
        if (p.permissions !== undefined) u.permissions = p.permissions;
        if (p.staff !== undefined) u.staff = p.staff;
        if (p.mentionable !== undefined) u.mentionable = p.mentionable;
        if (p.position !== undefined) u.position = p.position;
        if (Object.keys(u).length && UUID.test(a.roleId)) await supabase.from("roles").update(u).eq("id", a.roleId);
        return;
      }
      case "DELETE_ROLE": {
        if (UUID.test(a.roleId)) await supabase.from("roles").delete().eq("id", a.roleId);
        // Strip the deleted role from members whose role list changed.
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        if (before && after) {
          await Promise.all(
            after.members
              .filter((m) => UUID.test(m.userId))
              .filter((m) => {
                const b = before.members.find((x) => x.userId === m.userId);
                return b && b.roleIds.length !== m.roleIds.length;
              })
              .map((m) =>
                supabase!.from("members").update({ role_ids: m.roleIds }).eq("server_id", serverId).eq("user_id", m.userId),
              ),
          );
        }
        triggerServersReload();
        return;
      }
      case "MOVE_ROLE": {
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        if (!before || !after) return;
        await Promise.all(
          after.roles
            .filter((r) => UUID.test(r.id))
            .filter((r) => {
              const b = before.roles.find((x) => x.id === r.id);
              return b && b.position !== r.position;
            })
            .map((r) => supabase!.from("roles").update({ position: r.position }).eq("id", r.id)),
        );
        return;
      }
      case "ASSIGN_ROLE": {
        if (!UUID.test(a.userId)) return;
        const after = srv(next, serverId);
        const m = after?.members.find((x) => x.userId === a.userId);
        if (!m) return;
        await supabase.from("members").update({ role_ids: m.roleIds }).eq("server_id", serverId).eq("user_id", a.userId);
        return;
      }

      /* ── Moderation ───────────────────────────────────── */
      case "KICK": {
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        // Skip if the reducer blocked it (no member removed).
        if (before && after && before.members.length === after.members.length) return;
        await supabase.from("members").delete().eq("server_id", serverId).eq("user_id", a.userId);
        triggerServersReload();
        return;
      }
      case "BAN": {
        const after = srv(next, serverId)?.members.find((m) => m.userId === a.userId);
        const before = srv(prev, serverId)?.members.find((m) => m.userId === a.userId);
        if (!after || !UUID.test(a.userId) || after.banned === before?.banned) return;
        await supabase.from("members").update({ banned: after.banned }).eq("server_id", serverId).eq("user_id", a.userId);
        return;
      }
      case "UNBAN": {
        // Reducer removes the member row; mirror by deleting it so they can rejoin.
        const before = srv(prev, serverId);
        const after = srv(next, serverId);
        if (!UUID.test(a.userId) || (before && after && before.members.length === after.members.length)) return;
        await supabase.from("members").delete().eq("server_id", serverId).eq("user_id", a.userId);
        triggerServersReload();
        return;
      }
      case "TIMEOUT":
      case "CLEAR_TIMEOUT": {
        const after = srv(next, serverId)?.members.find((m) => m.userId === a.userId);
        const before = srv(prev, serverId)?.members.find((m) => m.userId === a.userId);
        if (!after || !UUID.test(a.userId) || (after.timeoutUntil ?? null) === (before?.timeoutUntil ?? null)) return;
        await supabase
          .from("members")
          .update({ timeout_until: after.timeoutUntil ?? null })
          .eq("server_id", serverId)
          .eq("user_id", a.userId);
        return;
      }

      /* ── Server settings ──────────────────────────────── */
      case "UPDATE_DISCOVERY": {
        const after = srv(next, serverId);
        if (!after) return;
        await supabase
          .from("servers")
          .update({ discoverable: after.discoverable, description: after.description, keywords: after.keywords })
          .eq("id", serverId);
        return;
      }
      case "SET_VERIFIED": {
        const after = srv(next, serverId);
        // The reducer already gated this to developers; if it didn't change,
        // skip (e.g. a non-developer call that was a no-op).
        if (!after || after.verified === srv(prev, serverId)?.verified) return;
        await supabase.from("servers").update({ verified: after.verified }).eq("id", serverId);
        return;
      }
      case "SET_BLOCKED_WORDS": {
        const after = srv(next, serverId);
        if (after) await supabase.from("servers").update({ blocked_words: after.blockedWords }).eq("id", serverId);
        return;
      }
      case "SET_ONBOARDING": {
        const after = srv(next, serverId);
        if (after) await supabase.from("servers").update({ onboarding: after.onboarding }).eq("id", serverId);
        return;
      }
      case "ADD_STICKER":
      case "SET_STICKER":
      case "REMOVE_STICKER": {
        const after = srv(next, serverId);
        const before = srv(prev, serverId);
        if (!after || JSON.stringify(after.stickers) === JSON.stringify(before?.stickers)) return;
        await supabase.from("servers").update({ stickers: after.stickers }).eq("id", serverId);
        return;
      }
      case "SET_SERVER_ICON": {
        const after = srv(next, serverId);
        const before = srv(prev, serverId);
        if (!after || after.iconImage === before?.iconImage) return;
        await supabase.from("servers").update({ icon_image: after.iconImage }).eq("id", serverId);
        return;
      }
      case "SET_SERVER_INVITE": {
        const after = srv(next, serverId);
        const before = srv(prev, serverId);
        if (!after || after.invite === before?.invite) return;
        await supabase.from("servers").update({ invite: after.invite }).eq("id", serverId);
        return;
      }
      case "TRANSFER_OWNERSHIP": {
        const after = srv(next, serverId);
        const before = srv(prev, serverId);
        if (!after || after.ownerId === before?.ownerId || !UUID.test(after.ownerId)) return;
        await supabase.from("servers").update({ owner_id: after.ownerId }).eq("id", serverId);
        triggerServersReload();
        return;
      }
      case "DELETE_SERVER": {
        // Only if the reducer actually removed it (owner check passed).
        if (srv(next, serverId)) return;
        await supabase.from("servers").delete().eq("id", serverId);
        triggerServersReload();
        return;
      }
    }
  } catch (e) {
    console.error("persistServerAction failed:", action.type, e);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
