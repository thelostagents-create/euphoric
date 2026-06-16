/**
 * Stripe Payment Links. The URLs live in env (committed in .env.local at build
 * time, like the Supabase keys) so they can differ per deploy:
 *   VITE_STRIPE_PREMIUM_URL   — Payment Link for the $5 Premium plan
 *   VITE_STRIPE_SUPERNOVA_URL — Payment Link for the $8 Supernova plan
 *   VITE_STRIPE_PORTAL_URL    — (optional) Customer Portal link for managing/cancelling
 *
 * We append the signed-in user's id as `client_reference_id` so the webhook can
 * flip the right account's tier after a successful payment.
 */
const LINKS: Record<string, string | undefined> = {
  premium: import.meta.env.VITE_STRIPE_PREMIUM_URL as string | undefined,
  supernova: import.meta.env.VITE_STRIPE_SUPERNOVA_URL as string | undefined,
};

export const billingPortalUrl = import.meta.env.VITE_STRIPE_PORTAL_URL as string | undefined;

export function paymentLinkFor(tier: string): string | undefined {
  return LINKS[tier];
}

/** Send the user to Stripe Checkout for a tier. Returns false if no link set. */
export function startCheckout(tier: string, uid: string, email?: string): boolean {
  const base = paymentLinkFor(tier);
  if (!base) return false;
  const url = new URL(base);
  url.searchParams.set("client_reference_id", uid);
  if (email) url.searchParams.set("prefilled_email", email);
  window.location.href = url.toString();
  return true;
}
