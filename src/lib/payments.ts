// Buy Me a Coffee integration.
//
// Set VITE_BMAC_PAGE_URL in .env.local to your BMAC creator page URL, e.g.:
//   VITE_BMAC_PAGE_URL=https://buymeacoffee.com/yourname
//
// Users click through to subscribe on BMAC; the bmac-webhook Edge Function
// watches for membership events and automatically updates their tier.
// The supporter's BMAC email must match their Euphoric account email.

export const bmacPageUrl = import.meta.env.VITE_BMAC_PAGE_URL as string | undefined;

/** Open the Buy Me a Coffee membership page in a new tab. Returns false if not configured. */
export function openBmacPage(): boolean {
  if (!bmacPageUrl) return false;
  window.open(bmacPageUrl, "_blank", "noreferrer");
  return true;
}
