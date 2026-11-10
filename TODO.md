# TODO

Open work that has been agreed but not started. Each item says what is blocking it.

---

## 1. SEBI-compliant KYC (PAN-first, through a licensed provider) — P0

Mod Alpha holds SEBI registration, so client KYC is **mandatory** before any paid service.

**Approach (agreed).** No in-house upload or storage of PAN/Aadhaar documents. A licensed KYC provider does the checks; Mod Alpha keeps only the outcome.

### Waiting on the business
- [ ] Registration type: **Research Analyst (RA)** or **Investment Adviser (IA)**. IA adds risk profiling and suitability checks.
- [ ] Registration number, validity dates, and the grievance/compliance officer's name, email and phone.
- [ ] Compliance officer confirms:
  - [ ] Is "record held by provider/KRA, reference kept by us" acceptable, or must we hold copies?
  - [ ] Retention period (at least 5 years) and what must be kept.
  - [ ] Whether fees must go through SEBI's centralised fee collection mechanism (CeFCoM) instead of, or as well as, Razorpay.
  - [ ] Advance-fee and refund rules for quarterly and yearly plans.
- [ ] KYC provider contract with **PAN verification, KRA fetch + KRA upload, CKYC, DigiLocker Aadhaar, selfie/IPV, e-sign, signed webhooks**, plus sandbox keys. Candidates: Digio (adapter exists), Signzy, HyperVerge, IDfy, Setu.
- [ ] Privacy policy and terms updated: what is collected (PAN, verification result), why, the processor, retention, DPDP consent.

### Built in v23.15 (mock provider)
- [x] Migration `005_kyc_pan.sql`: method, masked PAN, PAN hash, KRA ref, name/DOB match, consent time — no raw PAN / Aadhaar / images.
- [x] `POST /kyc/pan`: PAN check → KRA lookup → verified, or DigiLocker full KYC; 5 attempts/day; duplicate-PAN → admin review; audit events; log redaction.
- [x] Mock test PANs (`ABCDE1234F` KRA hit, `ABCDE5678G` DigiLocker, `…0000X` fail); 4 API tests.
- [x] KYC dialog at first checkout (demo + live), KYC status strip on the Subscription page, Hindi, light theme.

### Still to do
- [ ] Digio PAN-verification and KRA-lookup endpoints (from the Digio onboarding pack) in `providers/kyc.ts`.
- [ ] Block paid content (not only checkout) if KYC is later Rejected / Expired.
- [ ] Retention job aligned with the compliance answer.
- [ ] Admin user detail: show method, masked PAN, match flags, duplicate-PAN flag (data already returned by `GET /admin/users/:id`).
- [ ] `aadhaar_last4` only if compliance asks.

### Compliance pages (once registration details arrive)
- [ ] Footer and invoices: SEBI registration type, number and validity.
- [ ] Standard SEBI disclaimer ("Registration granted by SEBI … does not guarantee performance …").
- [ ] Client terms / MITC accepted at signup, with the acceptance stored (version + timestamp).
- [ ] Grievance page: officer details, escalation matrix, SEBI SCORES and SMART ODR links.
- [ ] IA only: risk-profiling questionnaire before advice, with the stored result.

### Go-live
- [ ] Provider sandbox keys on stage; run the full flow end to end.
- [ ] Register the webhook URL and secret with the provider.
- [ ] Production keys in prod; remove `kyc` from `ALLOW_MOCK_PROVIDERS`.

---

## 1b. GST invoices — details needed from the business
- [ ] Company **GSTIN**, registered address, PAN, LLPIN → `INVOICE_SELLER_*` on stage and prod (prod refuses to start without GSTIN and address).
- [ ] GST state code of the registered office (`INVOICE_SELLER_STATE_CODE`, default 29 Karnataka — change if different).
- [ ] CA to confirm the **SAC code** (default 997156) and whether a quarterly/yearly plan needs any different wording.
- [ ] SEBI registration text for `INVOICE_SEBI_REG` (e.g. "Research Analyst INH000000000"); this also switches on the SEBI disclaimer on the invoice.
- [ ] Optional: collect the state at checkout (today it comes from Settings → Profile → Billing details; without it the seller state is used).

---

## 1c. Privacy controls (removed from Settings in v23.18)
- [ ] Decide with compliance how users exercise DPDP rights (consent withdrawal, data copy, deletion) now that the Settings section is gone — e.g. a Help & support request or a link in the privacy policy. The APIs (`PUT /me/consents`, `POST /me/data-export`, `POST /me/deletion-request`) are still in place.

---

## 2. Fund house logos
- [ ] Add official AMC logo files to `web/assets/funds/` and list them in `assets/funds/manifest.js`. Monograms are shown until then. The build environment cannot reach AMC sites, so these must be supplied.

---

## 2b. Data loading
- [ ] Add `amfi_code` as a column of the `Funds` sheet: upload validator, import, export, blank template, sample workbook, `docs/21`. Today it can only be set in the database, and the daily AMFI NAV import needs it for every fund.
- [ ] Make the Sharpe risk-free rate (fixed 6.5%) an admin setting.
- [ ] Benchmark/TRI data import once a licensed feed is chosen.

---

## 3. External providers still on mock

See `docs/23_mocks_and_replacements.md`. Each one switches by env vars and keys, with no code change.

| Provider | Mock today | Replace with |
|---|---|---|
| Payments | Test-payment dialog + signed webhook | Razorpay (and/or CeFCoM, see §1) |
| KYC | Approve/Reject stage page | Digio or similar (see §1) |
| Email | Mock outbox | SendGrid / Amazon SES |
| SMS & OTP (incl. admin MFA SMS) | Mock outbox, test code on screen | MSG91 with DLT templates |
| Push | In-app bell real; device push to outbox | Firebase Cloud Messaging |
| WhatsApp | Mock outbox | WhatsApp Business Cloud API |
| AI assistant | Rule-based, DB-grounded | Anthropic Claude |
| NAV feed | Synthesised nightly | AMFI NAVAll.txt, later a licensed vendor |
| Google sign-in | `mock:<email>` token | Google Identity Services |
| Helpdesk | DB + outbox | Freshdesk / Zendesk / Zoho Desk |

---

## 4. Infrastructure — P0 before launch

Already in the repo:
- Docker images (api, web)
- `infra/docker-compose.yml` for local/stage
- CI (`ci.yml`) and deploy (`deploy.yml`: push to `main` → stage; tag `v*` → prod, with approval)
- SQL migrations with an advisory lock
- Health and readiness endpoints
- Cache-busted assets
- Rate limiting, CORS, helmet
- No-store on the API

### Waiting on the business
- [ ] Cloud and region **in India** (data residency for SEBI/DPDP; CERT-In logs). Recommended: AWS Mumbai (`ap-south-1`). Alternatives: GCP `asia-south1`, Azure Central India.
- [ ] Domain `modalpha.in` + DNS access; subdomains `stage.`, `api.`, `api.stage.`.
- [ ] GitHub repository + **stage** / **prod** Environments (reviewers on prod).
- [ ] Email sending domain: SPF, DKIM, DMARC records.
- [ ] Compliance: SEBI cybersecurity framework (CSCRF) category, VAPT before go-live, CERT-In 6-hour incident reporting contact.

### To build
- [ ] Infrastructure as code (Terraform) for the chosen cloud. On AWS:
  - VPC
  - RDS PostgreSQL 16 (Multi-AZ, encrypted, PITR 7–35 days)
  - ECS Fargate: `api` ×2 + `jobs` ×1
  - ALB + WAF
  - S3 + CloudFront for the website
  - Secrets Manager
  - CloudWatch logs (retained ≥180 days, per CERT-In)
  - ACM TLS certificates
- [ ] Jobs worker: add a Postgres advisory lock per job so a second `jobs` replica can never double-send reminders. **Until then, run exactly one `jobs` instance.**
- [ ] Rate limiting is in-memory per API instance. Fine for 2 replicas; move to Redis (ElastiCache) when scaling out.
- [ ] Website security headers: add HSTS and a Content-Security-Policy (nginx or CDN). The CSP must allow `frame-src https://www.instagram.com` (reels in Latest AI Insights) and `img-src` the API origin (reel covers).
- [ ] Uploaded workbooks: move from Postgres `bytea` to S3 (Mumbai, encrypted, pre-signed URLs).
- [ ] Monitoring: Sentry (API + web), uptime checks on `/health`, alerts (5xx rate, latency, DB CPU/storage, job failures, webhook failures).
- [ ] Backups (plan in `docs/27_backup_and_recovery.md`; `npm run db:backup` / `db:restore` already built): RDS PITR 35 days, nightly dump to an S3 bucket with Object Lock + 8-year lifecycle + Hyderabad copy, missing-backup alert, monthly restore drill on stage.
- [ ] Separate stage and prod accounts/projects; least-privilege IAM; deploy role for GitHub via OIDC (no long-lived keys).
- [ ] Load test (k6) of SIP-date publish day + reminder fan-out.
- [ ] Runbooks: deploy/rollback, incident response, key rotation, restore.
