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
type TypeFilter = "all" | "notes" | "dumps";

/** Pick black or white text for readability on a given hex background. */
function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "inherit";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Relative luminance — light bg → dark text, dark bg → light text.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1a1626" : "#f5f3fb";
}

/** The friends feed — photo dumps & notes from your mutuals, with reactions. */
export function Feed({
  initialUserId,
  onUserConsumed,
}: {
  initialUserId?: string | null;
  onUserConsumed?: () => void;
}) {
  const { state, dispatch } = useStore();
  const { session } = useAuth();
  const uid = session?.user.id;
  const live = isSupabaseConfigured && !!uid;
  const me = state.currentUserId;

  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [color, setColor] = useState("");
  const canColor = state.users[me]?.tier !== "free";
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [sheetUser, setSheetUser] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [userQuery, setUserQuery] = useState("");
  const [visible, setVisible] = useState(20);
  const loadedRef = useRef(false);

  // When navigated here from a profile, filter to that user's posts.
  useEffect(() => {
    if (initialUserId) {
      const u = state.users[initialUserId];
      setUserQuery(u?.username ?? "");
      onUserConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

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
    const postColor = canColor && color ? color : undefined;
    if (live) {
      await createFeedPostDb(me, text.trim(), images, postColor);
      await refresh();
    } else {
      dispatch({ type: "CREATE_FEED_POST", text: text.trim(), images, color: postColor });
    }
    setText("");
    setImages([]);
    setColor("");
  }

  async function react(postId: string, emoji: string) {
    // Optimistic local toggle, then persist in live mode.
    dispatch({ type: "TOGGLE_FEED_REACTION", postId, emoji });
    if (live) await toggleFeedReactionDb(postId, emoji);
  }

  async function remove(postId: string) {
    const post = state.feedPosts.find((p) => p.id === postId);
    dispatch({ type: "DELETE_FEED_POST", postId });
    if (live) await deleteFeedPostDb(postId, post?.images);
  }

  function addImage(url: string) {
    if (!url || images.length >= MAX_IMAGES) return;
    setImages((prev) => [...prev, url]);
  }

  const q = userQuery.trim().toLowerCase();
  const posts = state.feedPosts.filter((p) => {
    if (typeFilter === "notes" && p.images.length > 0) return false;
    if (typeFilter === "dumps" && p.images.length === 0) return false;
    if (q) {
      const u = state.users[p.authorId];
      const hay = `${u?.username ?? ""} ${u?.nickname ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const filtering = typeFilter !== "all" || !!q;

  // Show 20 at a time; reset the window whenever the filter changes.
  useEffect(() => {
    setVisible(20);
  }, [typeFilter, userQuery]);
  const shown = posts.slice(0, visible);
  const hasMore = posts.length > shown.length;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Feed</h1>
      </div>

      <div className="list">
        {/* Composer */}
        <div className="card" style={color ? { background: color, color: textOn(color) } : undefined}>
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
          {canColor && (
            <div className="row" style={{ gap: 8, marginTop: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>Post color</span>
              <input
                type="color"
                className="swatch"
                value={color || "#e7defb"}
                onChange={(e) => setColor(e.target.value)}
              />
              <input
                value={color}
                placeholder="#hex"
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 92, flex: "0 0 auto" }}
              />
              {color && (
                <button className="btn ghost sm" onClick={() => setColor("")}>Reset</button>
              )}
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

        {/* Filters */}
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <div className="chips">
            <button className={`chip ${typeFilter === "all" ? "accent" : ""}`} onClick={() => setTypeFilter("all")}>All</button>
            <button className={`chip ${typeFilter === "notes" ? "accent" : ""}`} onClick={() => setTypeFilter("notes")}>Notes</button>
            <button className={`chip ${typeFilter === "dumps" ? "accent" : ""}`} onClick={() => setTypeFilter("dumps")}>Photo dumps</button>
          </div>
          <input
            value={userQuery}
            placeholder="Search by username…"
            onChange={(e) => setUserQuery(e.target.value)}
          />
          {filtering && (
            <button
              className="btn ghost sm"
              onClick={() => { setTypeFilter("all"); setUserQuery(""); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="center-empty">
            {filtering
              ? "No posts match these filters."
              : "Nothing here yet. Posts from your mutual friends — and your own — show up here."}
          </div>
        ) : (
          <>
            {shown.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                meId={me}
                onReact={(emoji) => react(p.id, emoji)}
                onOpenReactions={() => setReactFor(p.id)}
                onDelete={p.authorId === me ? () => remove(p.id) : undefined}
                onOpenUser={() => setSheetUser(p.authorId)}
              />
            ))}
            {hasMore && (
              <button className="btn ghost full" onClick={() => setVisible((v) => v + 20)}>
                More
              </button>
            )}
          </>
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
  const [imgAt, setImgAt] = useState(0);
  const multi = post.images.length > 1;
  const at = Math.min(imgAt, post.images.length - 1);
  const go = (e: React.MouseEvent, dir: -1 | 1) => {
    e.stopPropagation();
    e.preventDefault();
    setImgAt((prev) => (prev + dir + post.images.length) % post.images.length);
  };

  return (
    <div
      className="card"
      style={post.color ? { background: post.color, color: textOn(post.color) } : undefined}
      {...longPressProps(onOpenReactions)}
    >
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <img
          src={author?.avatar}
          alt=""
          onClick={onOpenUser}
          style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", cursor: "pointer" }}
        />
        <div style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 700, cursor: "pointer" }} onClick={onOpenUser}>
            {displayName(author)}
          </span>
          <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{timeAgo(post.createdAt)}</span>
        </div>
        {multi && (
          <div className="row" style={{ gap: 6, alignItems: "center", marginLeft: 4 }}>
            <button className="carousel-nav" onClick={(e) => go(e, -1)} aria-label="Previous">‹</button>
            <button className="carousel-nav" onClick={(e) => go(e, 1)} aria-label="Next">›</button>
            <div style={{ display: "flex", gap: 5 }}>
              {post.images.map((_, j) => (
                <span
                  key={j}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: j === at ? "var(--accent)" : "var(--border)" }}
                />
              ))}
            </div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {onDelete && (
          <button className="btn ghost sm" title="Delete post" onClick={onDelete}>🗑</button>
        )}
      </div>

      {post.text && <p style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", fontSize: 14 }}>{post.text}</p>}

      {post.images.length > 0 && (
        <img
          src={post.images[at]}
          alt=""
          style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 320, display: "block", marginTop: 10 }}
        />
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
