# 04 — External Integrations

## 1. SMS and OTP

### Use cases
- Signup/login OTP.
- Security alerts.
- SIP-date reminder to opted-in subscribers.
- Subscription/payment transactional status where appropriate.

### India-specific setup
For bulk SMS, plan for TRAI TCCCPR requirements and the access-provider DLT process: register as Principal Entity, obtain an approved header, register content templates, pass PE/header/content-template identifiers, and capture/maintain consent where required. OTP, service and promotional classifications must be confirmed with the chosen telecom provider and counsel; do not assume every reminder is transactional.

Official guidance: https://www.trai.gov.in/advice-to-senders

### Provider adapter
Evaluate providers such as MSG91, Gupshup, Exotel or another approved aggregator based on:
- DLT onboarding assistance and template lifecycle.
- OTP delivery and route quality.
- Delivery receipts and error codes.
- API uptime, latency, throughput and support.
- Pricing, sender ID/header support and data-processing terms.
- Data residency, retention, security and subprocessors.

### OTP controls
- Short expiry (e.g. 3–5 minutes; finalize based on threat model).
- Attempt and resend limits per phone, IP, device and account.
- Hash OTP at rest; never log OTP in plaintext.
- One-time use, replay prevention and cooldown.
- Detect SIM-swap/abuse patterns where vendor signals are lawfully available.
- Do not reveal whether an email/phone is registered in public error responses.

### SIP reminder workflow
1. Admin creates a draft month/date.
2. System validates date and target month.
3. Admin previews message and eligible audience.
4. Authorized admin publishes; audit record created.
5. Scheduler enqueues eligible subscribers with consent and active entitlement.
6. Workers send through provider adapter with idempotency.
7. Delivery receipts update campaign status.
8. Failed messages retry with bounded exponential backoff; permanent failures are suppressed and surfaced.

SMS is not guaranteed delivery. Provide email or in-app notification as an alternative. Notification date is a reminder only; it must not initiate an investment.

## 2. Email and push notifications

- Email: evaluate SES, SendGrid, Postmark or equivalent; configure SPF, DKIM and DMARC.
- Push: web push (VAPID) or Firebase Cloud Messaging if a mobile app is planned.
- Maintain channel preferences and consent records.
- Transactional/security notifications should be separated from marketing campaigns.
- Track provider acceptance and delivery where supported, not just API success.

## 3. Payment gateway

### Candidate providers
Evaluate Razorpay, Cashfree Payments or another RBI-authorised payment aggregator suitable for the business model and recurring subscription requirements. Confirm current product support, fees, settlement, refunds, disputes, UPI/card/netbanking availability, recurring mandates and merchant onboarding terms directly with each provider.

### Hosted checkout pattern
1. Backend creates internal order/subscription intent and amount.
2. Backend calls provider using secret credentials.
3. Browser redirects/opens hosted checkout.
4. Provider sends signed webhook.
5. Backend verifies signature, timestamp/replay and provider event ID.
6. Idempotent event processor updates payment and subscription state.
7. Entitlement is activated only after verified successful payment/capture state.
8. Reconciliation job compares provider settlement/transactions with internal ledger.
9. Refund, chargeback and cancellation events update entitlement under defined policy.

Never trust client-side success redirects. Never store card number, CVV, UPI PIN or raw payment credentials. Use provider tokenization/mandate facilities only where needed and supported.

### Subscription lifecycle states
`created → pending → active → past_due → cancelled/expired` plus `refunded`, `disputed` and `suspended` states as needed. Define grace period, retry policy, proration, cancellation timing, renewal notice and refund policy.

### Commercial/legal
- Merchant onboarding KYC is performed by payment provider as part of its onboarding requirements.
- Display legal entity name, support contact, terms, privacy, cancellation/refund policy and grievance process.
- Confirm GST/tax invoicing requirements with a CA.
- Confirm current RBI/payment-provider requirements for recurring mandates and payment authentication.

## 4. KYC, identity and account verification

### Product requirement
First-time subscribers must complete the Mod Alpha KYC/identity-verification step before their subscription is activated. This is a product requirement; the exact verification method and data collected must be validated against Mod Alpha's final legal/regulatory classification and the requirements of its payment/verification partners.

Email/mobile OTP remains contact verification and is not a substitute for KYC. Do not assume that a subscription to an analytics website automatically creates a particular statutory KYC obligation. Obtain specialist Indian legal advice on the applicable basis and permissible workflow before launch.

### Implementation requirements
- Select an eligible, authorised KYC/identity-verification provider or partner after legal review.
- Define the minimum required identity fields and purpose limitation; do not collect PAN/Aadhaar or other identifiers merely because they are available.
- Aadhaar authentication/e-KYC must only use a legally authorised route with valid consent and eligibility. Do not directly integrate with UIDAI as if any application can authenticate users.
- Evaluate permitted alternatives (such as PAN verification, CKYC, video KYC or offline Aadhaar verification) only with written provider and legal confirmation.
- Keep subscription activation gated on a verified provider result; use server-side status and provider references, not a browser assertion.
- Store provider reference, verification status, timestamps and only the minimum legally permitted evidence. Avoid storing raw identity payloads/documents unless required.
- Encrypt any required identity data, restrict access by role, audit every access, and apply a documented retention/deletion schedule.
- Separate KYC consent from marketing consent and product terms. Never request or store Aadhaar OTP in Mod Alpha.
- Provide a secure retry/manual-review path for failed or inconclusive verification without exposing sensitive details in logs.

### Launch gate
Do not implement a specific Aadhaar/PAN/CKYC/video-KYC flow until counsel confirms the applicable legal basis and an eligible provider confirms the permitted integration. The user-facing product requirement remains: first-time subscribers complete the approved KYC flow before activation.

## 5. Mutual-fund NAV and reference data

- **Initial operating model:** an administrator manually uploads NAV and related reference data through Excel files. No automated provider feed is assumed for the first release.
- Select a licensed/contractually permitted source for NAV, scheme master, categories, benchmarks and market holidays; manual upload does not remove source licensing or provenance requirements.
- Confirm redistribution, caching, derived analytics, historical storage and commercial display rights.
- Do not assume that publicly accessible data automatically grants commercial redistribution rights.
- Use a provider adapter and canonical internal scheme identifiers.
- Maintain source provenance, update SLA and reconciliation process.
- Excel ingestion should use a staging area, file/schema checks, duplicate and outlier detection, row-level error reports, reconciliation and an explicit publish step. Never partially overwrite good production data.
- Show last successful upload, coverage date, uploader, source/file hash and validation summary. Alert on missing, stale, duplicate or outlier NAV values.

## 6. AI provider integration

- Put model access behind an AI gateway; do not call model APIs directly from the browser.
- Use retrieval from approved fund facts, calculation outputs, methodology docs and help content.
- Do not send unnecessary PII to the model provider.
- Configure retention/training controls and contractual terms.
- Apply prompt-injection defence, tool allowlists, output validation and token/cost budgets.
- Responses should link to relevant data and state when information is unavailable.
- AI must not create or alter numerical financial calculations.
