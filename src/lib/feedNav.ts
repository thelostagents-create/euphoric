// Lightweight pub/sub so a deeply-nested UserSheet can ask the app to switch
// to the Feed tab filtered to a specific user (mirrors db.ts's reload hook).

let handler: ((userId: string) => void) | null = null;

export function setFeedNav(fn: ((userId: string) => void) | null) {
  handler = fn;
}

/** Jump to the Feed tab, filtered to this user's posts. */
export function openUserFeed(userId: string) {
  handler?.(userId);
}
