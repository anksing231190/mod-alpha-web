-- Admin sign-in second step: one code by email AND one code by SMS (both required).
CREATE TABLE login_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_code_hash text NOT NULL,
  sms_code_hash   text NOT NULL,
  remember        boolean NOT NULL DEFAULT true,
  attempts        int NOT NULL DEFAULT 0,
  resends         int NOT NULL DEFAULT 0,
  expires_at      timestamptz NOT NULL,
  consumed_at     timestamptz,
  ip              text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_challenges_user_idx ON login_challenges (user_id, created_at DESC);
