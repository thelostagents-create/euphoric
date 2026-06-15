// Simple sliding-window rate limiter shared across all composers.

const LIMIT = 5; // messages
const WINDOW_MS = 5000; // per 5 seconds
let sends: number[] = [];

/** Returns true if a send is allowed right now, recording it if so. */
export function allowSend(): boolean {
  const now = Date.now();
  sends = sends.filter((t) => now - t < WINDOW_MS);
  if (sends.length >= LIMIT) return false;
  sends.push(now);
  return true;
}
