import { useCallback, useEffect, useRef, useState } from "react";
import type { Attachment, Message, User } from "../types";
import {
  deleteMessageDb,
  editMessageDb,
  fetchConversation,
  fetchProfilesByIds,
  sendMessageDb,
  toggleReactionDb,
  setPinnedDb,
  subscribeConversation,
} from "./db";

/**
 * Live, Supabase-backed messages for one conversation id. Returns the message
 * list, a cache of author profiles, and write actions. Only used when the
 * backend is configured; otherwise the UI stays on the local store.
 */
export function useLiveConversation(conversation: string | undefined, selfId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Partial<User>>>({});
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  const refresh = useCallback(async (conv: string) => {
    const msgs = await fetchConversation(conv);
    setMessages(msgs);
    const missing = [...new Set(msgs.map((m) => m.authorId))].filter((id) => id && !profilesRef.current[id]);
    if (missing.length) {
      const fetched = await fetchProfilesByIds(missing);
      setProfiles((prev) => {
        const next = { ...prev };
        fetched.forEach((p) => p.id && (next[p.id] = p));
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!conversation) return;
    refresh(conversation);
    const unsub = subscribeConversation(conversation, () => refresh(conversation));
    return unsub;
  }, [conversation, refresh]);

  // Refetch after a write so it shows even if Realtime isn't enabled.
  const after = useCallback(() => {
    if (conversation) setTimeout(() => refresh(conversation), 150);
  }, [conversation, refresh]);

  const send = useCallback(
    async (content: string, attachment?: Attachment, replyTo?: string) => {
      if (conversation && selfId) {
        await sendMessageDb(selfId, conversation, content, attachment, replyTo);
        after();
      }
    },
    [conversation, selfId, after],
  );

  const edit = useCallback(async (id: string, content: string) => {
    await editMessageDb(id, content);
    after();
  }, [after]);
  const remove = useCallback(async (id: string) => {
    await deleteMessageDb(id);
    after();
  }, [after]);

  const toggleReaction = useCallback(
    async (id: string, emoji: string) => {
      if (!selfId) return;
      await toggleReactionDb(id, emoji);
      after();
    },
    [selfId, after],
  );

  const setPinned = useCallback(async (id: string, pinned: boolean) => {
    await setPinnedDb(id, pinned);
    after();
  }, [after]);

  return { messages, profiles, send, edit, remove, toggleReaction, setPinned };
}
