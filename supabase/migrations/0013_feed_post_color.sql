-- Euphoric — custom post colors (Premium/Supernova perk).
-- Adds an optional background color to feed posts. Run in the SQL editor.

alter table feed_posts add column if not exists color text;
