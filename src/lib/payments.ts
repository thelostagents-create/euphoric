// Patreon integration.
//
// Set VITE_PATREON_URL in .env.local to your Patreon membership page, e.g.:
//   VITE_PATREON_URL=https://www.patreon.com/yourcampaign
//
// Users click through to subscribe on Patreon; the patreon-webhook Edge
// Function watches for membership events and automatically updates their tier.
// The patron's Patreon email must match their Euphoric account email.

export const patreonUrl = import.meta.env.VITE_PATREON_URL as string | undefined;

/** Open the Patreon membership page in a new tab. Returns false if not configured. */
export function openPatreonPage(): boolean {
  if (!patreonUrl) return false;
  window.open(patreonUrl, "_blank", "noreferrer");
  return true;
}
