-- 005 — PAN-first KYC (SEBI-registered intermediary: KYC through a KRA)
--
-- Flow: the user enters PAN + name + date of birth (+ consent) → the provider checks the PAN with the
-- Income Tax database and looks it up in the KYC registry (KRA).
--   • KRA record found  → KYC Verified straight away (method 'kra')
--   • no KRA record     → full KYC with the provider (DigiLocker Aadhaar, selfie, e-sign; method 'digilocker');
--                         the provider uploads the new record to the KRA (kra_ref)
--   • PAN invalid / mismatch → the attempt is recorded and the user can correct and retry (max 5 a day)
--
-- Only the OUTCOME is stored. Never the full PAN, Aadhaar number or document images:
--   pan_masked  'ABCDE••••F' for display
--   pan_hash    HMAC-SHA256 of the PAN (server secret) — detects the same PAN on two accounts
--               without storing it
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS method text;          -- kra | digilocker | manual
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS pan_masked text;
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS pan_hash text;
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS kra_ref text;
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS name_match boolean;
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS dob_match boolean;
ALTER TABLE kyc_sessions ADD COLUMN IF NOT EXISTS consent_at timestamptz;
CREATE INDEX IF NOT EXISTS kyc_sessions_pan_hash_idx ON kyc_sessions (pan_hash) WHERE pan_hash IS NOT NULL;
