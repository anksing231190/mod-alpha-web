-- 006: GST tax invoices.
-- * users get the billing details GST needs: state (place of supply), address, optional GSTIN for businesses.
-- * invoices keep a snapshot of everything printed on the PDF (seller, buyer, SAC, tax split), so an invoice never
--   changes after it is issued, even if the profile or the company details change later.
-- * numbers restart every financial year (April–March): MA/26-27/00001.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS billing_state_code text CHECK (billing_state_code ~ '^\d{2}$'),
  ADD COLUMN IF NOT EXISTS billing_address    text,
  ADD COLUMN IF NOT EXISTS billing_gstin      text;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS fy              text,           -- '2026-27'
  ADD COLUMN IF NOT EXISTS seq             int,            -- running number inside the financial year
  ADD COLUMN IF NOT EXISTS seller          jsonb,          -- name, address, gstin, pan, llpin, state code, SEBI reg
  ADD COLUMN IF NOT EXISTS buyer           jsonb,          -- name, email, mobile, address, state code, gstin
  ADD COLUMN IF NOT EXISTS sac             text,
  ADD COLUMN IF NOT EXISTS description     text,
  ADD COLUMN IF NOT EXISTS period_start    date,
  ADD COLUMN IF NOT EXISTS period_end      date,
  ADD COLUMN IF NOT EXISTS place_of_supply text,           -- two-digit state code
  ADD COLUMN IF NOT EXISTS taxable_inr     numeric(12,2),
  ADD COLUMN IF NOT EXISTS cgst_inr        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_inr        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_inr        numeric(12,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_fy_seq_idx ON invoices (fy, seq) WHERE fy IS NOT NULL;
