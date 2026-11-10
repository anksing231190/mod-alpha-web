-- 010: plan changes and GST credit notes (docs/29_subscription_rules.md).
-- * subscriptions.pending_*: a downgrade or a shorter billing cycle waits for the renewal date; the customer can
--   undo it until then. The jobs worker applies it on that date.
-- * payments.kind / meta: an 'upgrade' payment changes the plan of an existing subscription (prorated charge);
--   meta keeps the numbers the customer saw (credit for unused days, new renewal date).
-- * credit_notes: one per refund (CGST Act s.34), numbered per financial year in their own series
--   (CN/26-27/00001), linked to the original invoice, with the GST reversed.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id   text REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS pending_cycle     text CHECK (pending_cycle IN ('Monthly','Quarterly','Yearly')),
  ADD COLUMN IF NOT EXISTS pending_amount_inr numeric(12,2),
  ADD COLUMN IF NOT EXISTS pending_requested_at timestamptz;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'new' CHECK (kind IN ('new','upgrade','renewal')),
  ADD COLUMN IF NOT EXISTS meta jsonb;

CREATE TABLE IF NOT EXISTS credit_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number          text UNIQUE NOT NULL,
  fy              text NOT NULL,
  seq             int NOT NULL,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id      uuid REFERENCES invoices(id),
  payment_id      uuid REFERENCES payments(id),
  amount_inr      numeric(12,2) NOT NULL,
  taxable_inr     numeric(12,2) NOT NULL,
  cgst_inr        numeric(12,2) NOT NULL DEFAULT 0,
  sgst_inr        numeric(12,2) NOT NULL DEFAULT 0,
  igst_inr        numeric(12,2) NOT NULL DEFAULT 0,
  place_of_supply text,
  seller          jsonb,
  buyer           jsonb,
  sac             text,
  reason          text NOT NULL,
  refund_ref      text,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fy, seq)
);
CREATE INDEX IF NOT EXISTS credit_notes_user_idx ON credit_notes (user_id, issued_at DESC);
