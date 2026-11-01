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

### Backend (`apps/api`)
- [ ] Migration `004_kyc_pan.sql`. Add to `kyc_sessions`:
  - `pan_masked` (`ABCDE••••F`)
  - `pan_hash` (HMAC, for duplicate detection)
  - `kra_ref` / KYC number
  - `method` (`kra` | `digilocker` | `manual`)
  - `name_match`, `dob_match`
  - `consent_at`
  - `aadhaar_last4` (only if compliance asks)

  Never store the raw PAN, the full Aadhaar number or document images.
- [ ] `POST /kyc/pan {pan, name, dob, consent}` runs the PAN check, then a KRA lookup:
  - KRA hit: Verified;
  - no KRA record: start the full KYC (DigiLocker + selfie + signature), then the provider uploads to the KRA;
  - mismatch or invalid PAN: clear error.

  Limit to 5 attempts per day.
- [ ] Provider interface: add `verifyPan`, `kraLookup`, `startFullKyc`, `kraUpload`. Implement them in the **mock** with test PANs (`ABCDE1234F` = KRA hit, `ABCDE5678G` = needs full KYC, `ABCDE0000X` = fail) and as a Digio stub enabled by env keys.
- [ ] Webhook `/webhooks/kyc` stores only the fields above and discards the rest of the payload.
- [ ] Duplicate-PAN guard: a PAN already verified on another account goes to admin review, not auto-approve.
- [ ] Block paid content (not just checkout) if KYC is later Rejected or Expired.
- [ ] Audit events: `KYC_PAN_SUBMITTED`, `KYC_KRA_MATCH`, `KYC_FULL_STARTED`, `KYC_KRA_UPLOADED`.
- [ ] Retention job aligned with the compliance answer.
- [ ] Log redaction for `pan`, `aadhaar`, `dob`.
- [ ] Tests: KRA hit, full-KYC path, failure, rate limit, duplicate PAN, paid access blocked until Verified.

### Frontend (`apps/web`)
- [ ] First-time checkout: on `kyc_required`, open a 3-step KYC sheet instead of an error:
  1. PAN (auto-uppercase, `AAAAA9999A` check), name as on PAN, DOB (date picker), consent checkbox.
  2. "KYC found ✓" (go to payment), or "Verify via DigiLocker" (redirect to the provider).
  3. Return page: "Verifying…", polls `/kyc/status`, then continues to payment.
- [ ] Profile/Settings badge: "KYC verified via DigiLocker · 12 Nov 2026 · PAN ABCDE••••F". Rejected users get a Retry button.
- [ ] Admin user detail: method, masked PAN, match flags, duplicate-PAN warning, "Pending review" filter (manual approve/reject already exists).
- [ ] Demo mode with mock PANs; Hindi strings; light-theme styling.

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

## 2. Fund house logos
- [ ] Add official AMC logo files to `apps/web/assets/funds/` and list them in `assets/funds/manifest.js`. Monograms are shown until then. The build environment cannot reach AMC sites, so these must be supplied.

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
- [ ] Website security headers: add HSTS and a Content-Security-Policy (nginx or CDN).
- [ ] Uploaded workbooks: move from Postgres `bytea` to S3 (Mumbai, encrypted, pre-signed URLs).
- [ ] Monitoring: Sentry (API + web), uptime checks on `/health`, alerts (5xx rate, latency, DB CPU/storage, job failures, webhook failures).
- [ ] Backups: automated PITR, a monthly restore drill on stage, written RPO/RTO.
- [ ] Separate stage and prod accounts/projects; least-privilege IAM; deploy role for GitHub via OIDC (no long-lived keys).
- [ ] Load test (k6) of SIP-date publish day + reminder fan-out.
- [ ] Runbooks: deploy/rollback, incident response, key rotation, restore.
