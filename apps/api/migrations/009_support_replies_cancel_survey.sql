-- 009 — support replies, cancellation survey, payment-failure grace period
-- • support_tickets: the team's reply shown under "My requests" on Help & FAQ
-- • subscriptions: why the person cancelled (optional survey) and the end of the grace period after a failed renewal
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check CHECK (status IN ('Open','In progress','Answered','Closed'));
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets (user_id, created_at DESC);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_comment text;
