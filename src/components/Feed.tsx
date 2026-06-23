import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../lib/supabase";
import { createFeedPostDb, loadFeedDb, deleteFeedPostDb, toggleFeedReactionDb } from "../lib/db";
import { ImagePicker } from "./ImagePicker";
import { ReactionPicker, longPressProps } from "./Reactions";
import { UserSheet } from "./UserSheet";
import { displayName } from "../social";
import { timeAgo } from "./Modal";
import type { FeedPost } from "../types";

const MAX_IMAGES = 4;

/** The friends feed — photo dumps & notes from your mutuals, with reactions. */
export function Feed() {
  const { state, dispatch } = useStore();
  const { session } = useAuth();
  const uid = session?.user.id;
  const live = isSupabaseConfigured && !!uid;
  const me = state.currentUserId;

  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [sheetUser, setSheetUser] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // In live mode, pull the mutual-friends feed into the store once.
  async function refresh() {
    if (!live) return;
    const posts = await loadFeedDb();
    dispatch({ type: "HYDRATE_FEED", posts });
  }
  useEffect(() => {
    if (live && !loadedRef.current) {
      loadedRef.current = true;
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  async function post() {
    if (!text.trim() && images.length === 0) return;
    if (live) {
      await createFeedPostDb(me, text.trim(), images);
      await refresh();
    } else {
      dispatch({ type: "CREATE_FEED_POST", text: text.trim(), images });
    }
    setText("");
    setImages([]);
  }

  async function react(postId: string, emoji: string) {
    // Optimistic local toggle, then persist in live mode.
    dispatch({ type: "TOGGLE_FEED_REACTION", postId, emoji });
    if (live) await toggleFeedReactionDb(postId, emoji);
  }

  async function remove(postId: string) {
    dispatch({ type: "DELETE_FEED_POST", postId });
    if (live) await deleteFeedPostDb(postId);
  }

  function addImage(url: string) {
    if (!url || images.length >= MAX_IMAGES) return;
    setImages((prev) => [...prev, url]);
  }

  const posts = state.feedPosts;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Feed</h1>
      </div>

      <div className="list">
        {/* Composer */}
        <div className="card">
          <textarea
            rows={2}
            value={text}
            placeholder="Share a note or a photo dump…"
            onChange={(e) => setText(e.target.value)}
          />
          {images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 8 }}>
              {images.map((src, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
                  <button
                    className="btn ghost sm"
                    style={{ position: "absolute", top: 2, right: 2, padding: "0 6px" }}
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
            {images.length < MAX_IMAGES && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <ImagePicker value="" placeholder="add a photo…" onChange={addImage} />
              </div>
            )}
            <button className="btn" disabled={!text.trim() && images.length === 0} onClick={post}>
              Post
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="center-empty">
            Nothing here yet. Posts from your mutual friends — and your own — show up here.
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              meId={me}
              onReact={(emoji) => react(p.id, emoji)}
              onOpenReactions={() => setReactFor(p.id)}
              onDelete={p.authorId === me ? () => remove(p.id) : undefined}
              onOpenUser={() => setSheetUser(p.authorId)}
            />
          ))
        )}
      </div>

      {reactFor && (
        <ReactionPicker
          messageId={reactFor}
          onReact={(e) => react(reactFor, e)}
          onClose={() => setReactFor(null)}
        />
      )}
      {sheetUser && <UserSheet userId={sheetUser} onClose={() => setSheetUser(null)} />}
    </div>
  );
}

function PostCard({
  post,
  meId,
  onReact,
  onOpenReactions,
  onDelete,
  onOpenUser,
}: {
  post: FeedPost;
  meId: string;
  onReact: (emoji: string) => void;
  onOpenReactions: () => void;
  onDelete?: () => void;
  onOpenUser: () => void;
}) {
  const { state } = useStore();
  const author = state.users[post.authorId];
  const reactions = Object.entries(post.reactions ?? {}).filter(([, ids]) => ids.length > 0);

  return (
    <div className="card" {...longPressProps(onOpenReactions)}>
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <img
          src={author?.avatar}
          alt=""
          onClick={onOpenUser}
          style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, cursor: "pointer" }} onClick={onOpenUser}>
            {displayName(author)}
          </span>
          <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{timeAgo(post.createdAt)}</span>
        </div>
        {onDelete && (
          <button className="btn ghost sm" title="Delete post" onClick={onDelete}>🗑</button>
        )}
      </div>

      {post.text && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>{post.text}</p>}

      {post.images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: post.images.length === 1 ? "1fr" : "1fr 1fr",
            gap: 6,
            marginTop: 10,
          }}
        >
          {post.images.map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 320 }} />
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        {reactions.map(([emoji, ids]) => (
          <button
            key={emoji}
            className={`reaction ${ids.includes(meId) ? "mine" : ""}`}
            onClick={() => onReact(emoji)}
          >
            {emoji} {ids.length}
          </button>
        ))}
        <button className="btn ghost sm" onClick={onOpenReactions}>＋ React</button>
      </div>
    </div>
  );
}
