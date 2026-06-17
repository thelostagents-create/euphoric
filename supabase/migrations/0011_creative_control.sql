-- Euphoric — Creative Control profile layouts.
-- Stores the per-user Creative Control config (window-style profile card).
-- Run in the SQL editor.

alter table profiles add column if not exists creative jsonb not null default '{"enabled":false}'::jsonb;
