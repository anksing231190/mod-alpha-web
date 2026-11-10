-- 007: Latest AI Insights can be text cards or Instagram reels, managed in Admin → Insights & Reels.
-- The reel itself stays on Instagram (public account); we store only its link, plus an optional cover image.
ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS kind        text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','instagram')),
  ADD COLUMN IF NOT EXISTS url         text,                      -- normalised https://www.instagram.com/reel/<id>/
  ADD COLUMN IF NOT EXISTS media_id    text,                      -- the reel / post shortcode
  ADD COLUMN IF NOT EXISTS cover       bytea,                     -- optional cover image (≤ 600 KB)
  ADD COLUMN IF NOT EXISTS cover_type  text,
  ADD COLUMN IF NOT EXISTS pinned      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort        int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE insights DROP CONSTRAINT IF EXISTS insights_status_check;
ALTER TABLE insights ADD CONSTRAINT insights_status_check CHECK (status IN ('Draft','Published','Hidden'));
ALTER TABLE insights ALTER COLUMN body DROP NOT NULL;
CREATE INDEX IF NOT EXISTS insights_feed_idx ON insights (status, pinned DESC, sort, published_at DESC);
