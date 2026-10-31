# 05 — Security, Privacy & Compliance

## 1. Security baseline

- TLS everywhere; HSTS and secure cookie settings.
- Encryption at rest for database, object storage, backups and secrets.
- Managed KMS; rotate secrets and credentials.
- MFA for all admin accounts; step-up authentication for sensitive operations.
- RBAC/least privilege, separate service identities and just-in-time privileged access.
- WAF, bot protection, rate limiting and abuse detection.
- Secure headers, CSRF protection, output encoding, parameterized SQL and input validation.
- Dependency scanning, SAST/DAST, container scanning and regular penetration tests.
- Centralized audit logs with restricted write access and tamper-evident retention.
- Backups encrypted, tested and protected from production credential compromise.
- Incident response plan and breach notification workflow.

## 2. Privacy by design

India's Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025 are relevant to processing personal data. Have Indian privacy counsel map the commencement/transition provisions and operational obligations to the launch date and business model.

Official government overview:
- https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=156054&lang=2&reg=48
- https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014&lang=1&reg=3

Design for:
- Clear privacy notice and purpose-specific consent where required.
- Data minimization and purpose limitation.
- Accurate data and correction workflows.
- Retention schedule and deletion/anonymization.
- User request handling and grievance contact.
- Processor/vendor contracts and subprocessors register.
- Security safeguards, access logging, breach response and backups.
- Children's data handling and age policy as applicable.
- Cross-border processing review and vendor data-location transparency.

Do not claim compliance merely because a consent checkbox exists.

## 3. Financial regulation — mandatory pre-launch legal review

Mod Alpha discusses mutual funds and provides historical analytics and date-selection insights. Depending on how the service is marketed, personalized, monetized and delivered, it may raise questions under SEBI's Investment Advisers Regulations, Research Analysts Regulations, mutual fund distribution rules or other applicable frameworks.

Before paid launch, obtain a written opinion from Indian securities-market counsel on:
- Whether fund rankings, recommendations, AI-generated insights or SIP timing suggestions are regulated advice/research.
- Whether subscription charges are consideration for research/advice.
- Whether a SEBI registration, association with a registered intermediary, disclosures, client suitability/risk profiling, KYC, recordkeeping or other controls apply.
- What claims and performance presentations are permissible.
- Whether the platform's “SEBI registered” statement is accurate and may be used. Do not display this unless the entity and registration are verified and the claim is legally approved.

Official references:
- SEBI Investment Advisers Regulations (page updated 10 Feb 2025): https://www.sebi.gov.in/legal/regulations/feb-2025/securities-and-exchange-board-of-india-investment-advisers-regulations-2013-last-amended-on-february-10-2025-_92319.html
- SEBI Research Analysts Regulations (page updated 10 Feb 2025): https://www.sebi.gov.in/legal/regulations/feb-2025/securities-and-exchange-board-of-india-research-analysts-regulations-2014-last-amended-on-february-10-2025-_92320.html
- SEBI investor overview: https://investor.sebi.gov.in/research_analyst.html

A disclaimer does not override the actual nature of the service. Do not assume “notification-only” automatically means unregulated.

## 4. Performance and marketing controls

- No guaranteed return, guaranteed outperformance or “risk-free” claims.
- Clearly label backtested, simulated, illustrative and actual historical results.
- Disclose dates, benchmark, data source, assumptions, costs, taxes and survivorship/selection limitations.
- Keep methodology version, source data hash and calculation run ID for every public performance chart.
- Show periods where the strategy underperformed as well as periods where it outperformed.
- Do not cherry-pick only favourable funds or date windows.
- Obtain compliance approval for testimonials, social proof, performance claims and influencer/affiliate content.

## 5. Admin governance

- Super Admin role separated from routine operations.
- Maker-checker for SIP date publication, production data correction and plan/price changes.
- MFA and re-authentication for sensitive actions.
- Audit every change: actor, timestamp, reason, before/after state and request ID.
- No shared admin logins.
- Break-glass access monitored and reviewed.
- User exports require permission, purpose and audit event.

## 6. Data retention (initial proposal; counsel to approve)

| Data | Proposed handling |
|---|---|
| OTP | Never retain plaintext; short-lived hashed challenge then delete |
| Login/security logs | Retain according to security/legal policy |
| Payment references/invoices | Retain for statutory/accounting requirements |
| KYC documents | Do not collect unless required; if required, retention per law/provider |
| NAV/source files | Retain per data licence and reproducibility requirements |
| AI conversations | Short, documented retention; user deletion path |
| Admin audit logs | Tamper-evident retention aligned to legal/security obligations |

## 7. Threat model focus

- Credential stuffing and OTP bombing.
- Admin account takeover.
- Payment webhook spoofing/replay.
- NAV file poisoning or malformed uploads.
- Backtest look-ahead bias and manipulation of recommendation data.
- Prompt injection/data exfiltration through AI chat.
- Cross-tenant/user data access.
- Unauthorized exports and insider misuse.
- Notification spam and consent violations.
- Ransomware, backup deletion and cloud credential compromise.
