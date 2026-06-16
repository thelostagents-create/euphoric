-- Euphoric — billing support.
-- Stores the Stripe customer id so the webhook can map subscription
-- cancellations back to a profile. The tier itself is written by the
-- stripe-webhook Edge Function using the service role (bypasses RLS). Run in
-- the SQL editor.

alter table profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer_idx on profiles (stripe_customer_id);
