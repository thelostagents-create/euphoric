// Euphoric — Patreon webhook (Supabase Edge Function).
//
// Automatically upgrades/downgrades a user's tier when their Patreon
// membership changes. The patron's email must match their Euphoric account
// email. Deploy with:
//
//   supabase functions deploy patreon-webhook --no-verify-jwt
//
// Required function secrets (supabase secrets set ...):
//   PATREON_WEBHOOK_SECRET  — the secret shown next to your webhook in the
//                             Patreon developer portal
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Create the webhook in the Patreon developer portal pointing at:
//   https://<project-ref>.functions.supabase.co/patreon-webhook
// and subscribe to: members:create, members:update, members:delete,
// members:pledge:create, members:pledge:update, members:pledge:delete.

import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const webhookSecret = Deno.env.get("PATREON_WEBHOOK_SECRET");

// $8+ → supernova, anything lower (i.e. $5) → premium.
function tierForCents(cents: number): "premium" | "supernova" {
  return cents >= 800 ? "supernova" : "premium";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Verify the signature: hex HMAC-MD5 of the raw body using the webhook secret.
  if (webhookSecret) {
    const sig = req.headers.get("x-patreon-signature");
    const expected = createHmac("md5", webhookSecret).update(rawBody).digest("hex");
    if (sig !== expected) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  let payload: { data?: { attributes?: Record<string, unknown> } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const trigger = req.headers.get("x-patreon-event") ?? "";
  const attrs = payload.data?.attributes ?? {};
  const email = attrs.email as string | undefined;
  if (!email) {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // A patron is active when patron_status is active_patron and the event isn't
  // a deletion. members:delete / pledge:delete and any non-active status drop
  // them back to free.
  const status = attrs.patron_status as string | undefined;
  const cents = (attrs.currently_entitled_amount_cents as number | undefined) ?? 0;
  const isActive = !trigger.endsWith(":delete") && status === "active_patron" && cents > 0;

  try {
    const { data: authData, error: lookupErr } = await admin.auth.admin.getUserByEmail(email);
    if (lookupErr || !authData?.user) {
      console.warn("patreon-webhook: no Euphoric account found for", email);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const tier = isActive ? tierForCents(cents) : "free";
    await admin.from("profiles").update({ tier }).eq("id", authData.user.id);
    console.log("patreon-webhook:", email, "->", tier, `(${trigger}, ${cents}¢)`);
  } catch (err) {
    console.error("patreon-webhook handler error", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
