// Euphoric — Buy Me a Coffee webhook (Supabase Edge Function).
//
// Automatically upgrades/downgrades a user's tier when their BMAC membership
// changes. The supporter's email must match their Euphoric account email.
// Deploy with:
//
//   supabase functions deploy bmac-webhook --no-verify-jwt
//
// Required function secrets (supabase secrets set ...):
//   BMAC_WEBHOOK_SECRET  — the "Secret token" you set in your BMAC webhook
//                          settings (BMAC sends it as the bmcapitoken header)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Point your BMAC webhook at:
//   https://<project-ref>.functions.supabase.co/bmac-webhook
// Subscribe to all membership events (started, updated, cancelled).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const webhookSecret = Deno.env.get("BMAC_WEBHOOK_SECRET");

// Map membership level name / amount to a tier.
// Level name takes priority so renaming tiers in BMAC still works.
function tierForPayload(levelName: string | undefined, amount: number | undefined): "premium" | "supernova" {
  const name = (levelName ?? "").toLowerCase();
  if (name.includes("supernova") || (amount ?? 0) >= 8) return "supernova";
  return "premium";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  // BMAC sends the secret token in the bmcapitoken header.
  if (webhookSecret) {
    const token = req.headers.get("bmcapitoken");
    if (token !== webhookSecret) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // BMAC puts event data at top level or nested under "response".
  const data = (payload.response as Record<string, unknown> | undefined) ?? payload;

  const email = data.supporter_email as string | undefined;
  if (!email) {
    // One-time coffee purchase or unrecognised event — ignore.
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const isActive =
    (data.status as string | undefined) === "active" &&
    !(data.canceled as boolean | undefined);

  try {
    const { data: user, error: lookupErr } = await admin.auth.admin.getUserByEmail(email);
    if (lookupErr || !user) {
      // Supporter used a different email — we can't link the account automatically.
      console.warn("bmac-webhook: no Euphoric account found for", email);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (isActive) {
      const tier = tierForPayload(
        data.membership_level_name as string | undefined,
        typeof data.amount === "number" ? data.amount : undefined,
      );
      await admin.from("profiles").update({ tier }).eq("id", user.id);
      console.log("bmac-webhook: upgraded", email, "to", tier);
    } else {
      await admin.from("profiles").update({ tier: "free" }).eq("id", user.id);
      console.log("bmac-webhook: downgraded", email, "to free");
    }
  } catch (err) {
    console.error("bmac-webhook handler error", err);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
