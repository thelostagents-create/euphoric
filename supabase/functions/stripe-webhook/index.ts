// Euphoric — Stripe webhook (Supabase Edge Function).
//
// Flips a user's profile tier after a successful Payment Link checkout, and
// drops them back to free when their subscription ends. Deploy with:
//
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Required function secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY      — sk_live_… / sk_test_…
//   STRIPE_WEBHOOK_SECRET  — whsec_…  (from the Stripe webhook endpoint)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Point a Stripe webhook at:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// subscribed to: checkout.session.completed, customer.subscription.deleted,
// customer.subscription.updated.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// $8 plan → supernova, anything else (i.e. $5) → premium.
function tierForAmount(amountTotal: number | null): "premium" | "supernova" {
  return (amountTotal ?? 0) >= 800 ? "supernova" : "premium";
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`bad signature: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const uid = s.client_reference_id;
        if (uid) {
          await admin
            .from("profiles")
            .update({
              tier: tierForAmount(s.amount_total),
              stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
            })
            .eq("id", uid);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await admin.from("profiles").update({ tier: "free" }).eq("stripe_customer_id", customer);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        // Treat a non-active subscription as a downgrade to free.
        if (sub.status !== "active" && sub.status !== "trialing") {
          await admin.from("profiles").update({ tier: "free" }).eq("stripe_customer_id", customer);
        }
        break;
      }
    }
  } catch (err) {
    console.error("webhook handler error", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
