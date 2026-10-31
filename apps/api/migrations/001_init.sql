-- Mod Alpha — initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- identity
CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref     text UNIQUE,                       -- user_id from an imported workbook (e.g. U-10001)
  email            citext UNIQUE,
  mobile           text UNIQUE,
  password_hash    text,
  full_name        text NOT NULL,
  role             text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','superadmin')),
  account_status   text NOT NULL DEFAULT 'Active' CHECK (account_status IN ('Active','Suspended','Closed')),
  kyc_status       text NOT NULL DEFAULT 'Not started' CHECK (kyc_status IN ('Not started','Pending','In review','Verified','Rejected')),
  marketing_consent boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  mobile_verified_at timestamptz,
  google_sub       text UNIQUE,
  mfa_secret       text,
  signup_date      date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);
CREATE INDEX users_signup_idx ON users (signup_date);

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  user_agent   text,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target      text NOT NULL,
  purpose     text NOT NULL,
  code_hash   text NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_target_idx ON otp_codes (target, purpose, created_at DESC);

CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

CREATE TABLE preferences (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  granted    boolean NOT NULL,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- plans & billing
CREATE TABLE plans (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  tagline    text NOT NULL DEFAULT '',
  prices     jsonb NOT NULL,                   -- {"Monthly":299,"Quarterly":897,"Yearly":2868}
  features   jsonb NOT NULL DEFAULT '[]',
  limits     jsonb NOT NULL DEFAULT '{}',      -- {"ai_queries_per_day":1}
  active     boolean NOT NULL DEFAULT true,
  sort       int NOT NULL DEFAULT 0,
  version    int NOT NULL DEFAULT 1,
  provider_plan_ids jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id                text PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id           text NOT NULL REFERENCES plans(id),
  billing_cycle     text NOT NULL CHECK (billing_cycle IN ('Monthly','Quarterly','Yearly')),
  amount_inr        numeric(12,2) NOT NULL,
  status            text NOT NULL CHECK (status IN ('Created','Active','Past due','Cancelled','Expired')),
  start_date        date NOT NULL,
  last_payment_date date,
  renewal_date      date,
  provider          text NOT NULL DEFAULT 'import',
  provider_ref      text,
  payment_ref       text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subs_user_idx ON subscriptions (user_id);
CREATE INDEX subs_start_idx ON subscriptions (start_date);

CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     text REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
  amount_inr          numeric(12,2) NOT NULL,
  status              text NOT NULL CHECK (status IN ('created','captured','failed','refunded')),
  provider            text NOT NULL,
  provider_order_id   text,
  provider_payment_id text UNIQUE,
  paid_on             date,
  refunded_inr        numeric(12,2) NOT NULL DEFAULT 0,
  raw                 jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_paid_idx ON payments (paid_on);

CREATE TABLE invoices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number      text UNIQUE NOT NULL,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id  uuid REFERENCES payments(id),
  amount_inr  numeric(12,2) NOT NULL,
  gst_inr     numeric(12,2) NOT NULL,
  issued_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE webhook_events (
  id           bigserial PRIMARY KEY,
  provider     text NOT NULL,
  event_id     text NOT NULL,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error        text,
  UNIQUE (provider, event_id)
);

-- ---------------------------------------------------------------- KYC
CREATE TABLE kyc_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  provider_ref text,
  status       text NOT NULL,
  redirect_url text,
  decided_by   uuid REFERENCES users(id),
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- market data
CREATE TABLE funds (
  fund_id           text PRIMARY KEY,
  scheme_name       text NOT NULL,
  amc               text NOT NULL,
  category          text NOT NULL,
  asset_class       text NOT NULL,
  plan              text NOT NULL,
  option            text NOT NULL,
  risk_level        text NOT NULL,
  benchmark         text,
  aum_cr            numeric(14,2),
  expense_ratio_pct numeric(6,3),
  inception_date    date NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  amfi_code         text UNIQUE
);
CREATE TABLE nav_history (
  fund_id  text NOT NULL REFERENCES funds(fund_id) ON DELETE CASCADE,
  nav_date date NOT NULL,
  nav      numeric(14,4) NOT NULL CHECK (nav > 0),
  PRIMARY KEY (fund_id, nav_date)
);
CREATE TABLE sip_dates (
  month           text PRIMARY KEY CHECK (month ~ '^\d{4}-\d{2}$'),
  recommended_day int NOT NULL CHECK (recommended_day BETWEEN 1 AND 28),
  uplift_pct      numeric(6,2),
  alt_day_1 int, alt_uplift_1 numeric(6,2),
  alt_day_2 int, alt_uplift_2 numeric(6,2),
  alt_day_3 int, alt_uplift_3 numeric(6,2),
  status          text NOT NULL CHECK (status IN ('Draft','Published','Archived')),
  published_on    date,
  version         text,
  reason          text,
  published_by    uuid REFERENCES users(id)
);
CREATE TABLE market_holidays (
  holiday_date date NOT NULL,
  exchange     text NOT NULL DEFAULT 'NSE',
  description  text NOT NULL,
  PRIMARY KEY (holiday_date, exchange)
);
CREATE TABLE data_uploads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name    text NOT NULL,
  size_bytes   int NOT NULL,
  storage_key  text NOT NULL,
  content      bytea,
  sheets       text[] NOT NULL DEFAULT '{}',
  report       jsonb NOT NULL,
  status       text NOT NULL CHECK (status IN ('validated','failed','published','discarded')),
  uploaded_by  uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- ---------------------------------------------------------------- user features
CREATE TABLE watchlist (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_id  text NOT NULL REFERENCES funds(fund_id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fund_id)
);
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES users(id) ON DELETE CASCADE,     -- NULL = broadcast
  kind       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  link       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notification_reads (
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
CREATE TABLE notification_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  name       text NOT NULL,
  channels   text[] NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  sms_text   text,
  status     text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Active','Archived')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  template_id   uuid NOT NULL REFERENCES notification_templates(id),
  channels      text[] NOT NULL,
  audience      text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status        text NOT NULL CHECK (status IN ('Draft','Scheduled','Sending','Completed','Cancelled')),
  stats         jsonb NOT NULL DEFAULT '{}',
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE deliveries (
  id           bigserial PRIMARY KEY,
  campaign_id  uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  channel      text NOT NULL,
  status       text NOT NULL,
  provider     text NOT NULL,
  provider_ref text,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- Every message a MOCK provider "sends" lands here so QA can see it on stage.
CREATE TABLE mock_outbox (
  id         bigserial PRIMARY KEY,
  provider   text NOT NULL,
  channel    text NOT NULL,
  recipient  text NOT NULL,
  subject    text,
  body       text NOT NULL,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number       text UNIQUE NOT NULL,
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  email        text NOT NULL,
  topic        text NOT NULL,
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'Open',
  provider     text NOT NULL,
  provider_ref text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE faqs (
  id        serial PRIMARY KEY,
  category  text NOT NULL,
  question  text NOT NULL,
  answer    text NOT NULL,
  sort      int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true
);
CREATE TABLE insights (
  id           serial PRIMARY KEY,
  icon         text NOT NULL DEFAULT 'trend',
  title        text NOT NULL,
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'Published',
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE assistant_usage (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  queries    int NOT NULL DEFAULT 0,
  tokens_in  int NOT NULL DEFAULT 0,
  tokens_out int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE data_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('export','deletion')),
  status       text NOT NULL DEFAULT 'Requested',
  storage_key  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------- admin
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  actor_label text NOT NULL,
  action      text NOT NULL,
  category    text NOT NULL,
  resource    text,
  outcome     text NOT NULL DEFAULT 'Success',
  ip          text,
  meta        jsonb
);
CREATE INDEX audit_at_idx ON audit_log (at DESC);
-- append-only: block UPDATE/DELETE
CREATE FUNCTION audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_immutable();

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE model_releases (
  version     text PRIMARY KEY,
  status      text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Evaluating','Approved','Retired')),
  gates       jsonb NOT NULL DEFAULT '{}',
  evaluation  jsonb,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
