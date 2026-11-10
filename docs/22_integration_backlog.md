# 22 — Live integration & API backlog

**Generated from** `web/src/features/admin/settings/integrations-catalogue.js` (run `node scripts/data-tools/export_integrations.js`). The same list appears in **Admin → System Settings → Integration readiness**, where you can filter it, search it and export it as CSV.

The list comes from auditing every screen, button and data flow. Since v23 the backend API implements most of it; items marked *Mock* run on stand-in providers on stage and switch to the real vendor through environment variables.

## Summary

| | Count |
|---|---|
| Total integrations | 77 |
| P0 — launch-blocking | 40 |
| P1 — needed for launch quality | 27 |
| P2 — post-launch | 10 |
| Pending (not built yet) | 16 |
| Mock — API built, provider mocked (integrated later) | 17 |
| Manual (interim manual process) | 3 |
| Ready | 41 |

**Status key:** *Ready* — implemented in the API and website · *Mock* — API and UI implemented, the external provider is mocked and will be integrated later (see docs/23) · *Manual* — an interim manual process is in place · *Pending* — not built yet.
**Priority key:** *P0* launch-blocking · *P1* needed for a quality launch · *P2* post-launch.

## Authentication & access (10)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Email + password sign-in / sign-up | P0 | Ready | Login & Signup page (Login, Create Account) | `POST /auth/signup · POST /auth/login · POST /auth/logout` | Auth0, AWS Cognito, Firebase Auth, Keycloak, custom (Argon2 + JWT) | Built: bcrypt passwords, httpOnly cookie sessions. |
| AUTH-02 | Mobile OTP login | P0 | Mock (integrated later) | Login page → Mobile tab | `POST /auth/otp/send · POST /auth/otp/verify` | MSG91 OTP, Twilio Verify, Gupshup (DLT-registered sender) | Built; SMS provider mocked (OTP shown on stage). |
| AUTH-03 | Forgot / reset password | P0 | Mock (integrated later) | Login → “Forgot Password?” | `POST /auth/password/forgot · POST /auth/password/reset` | Identity provider flows or signed reset tokens + email provider | Built; reset email goes to the mock outbox until SendGrid is connected. |
| AUTH-04 | Google sign-in | P1 | Mock (integrated later) | Login → Google button | `OAuth 2.0 / OIDC callback /auth/oauth/google` | Google Identity Services | Built; accepts mock:<email> tokens on stage until GOOGLE_CLIENT_ID is set. |
| AUTH-05 | Sign in with Apple | P2 | Pending | Login → Apple button | `OIDC callback /auth/oauth/apple` | Apple Developer account + Services ID |  |
| AUTH-06 | Sessions, timeouts & logout | P0 | Ready | All signed-in pages, inactivity warning, Settings → Sign out of all devices | `POST /auth/refresh · GET /auth/session · POST /auth/activity · POST /auth/logout · POST /auth/logout-all` | HttpOnly secure cookies, rotating refresh tokens | Built: sign-out after 15 min of inactivity (60 s warning), 12 h limit for users / 8 h for admins, rotating refresh with reuse detection, sign out everywhere, password change ends other devices. |
| AUTH-07 | Change password | P1 | Ready | Settings → Profile → Change Password | `POST /me/password` | Identity provider |  |
| AUTH-08 | Email & mobile verification | P1 | Mock (integrated later) | Settings → Personal details (email locked, mobile number) | `POST /me/verify-email · POST /me/verify-mobile` | Identity provider + OTP provider | Built; delivery via mocked email/SMS. |
| AUTH-09 | Admin roles (RBAC) & 2-step sign-in | P0 | Ready | Admin console access, admin sign-in | `role claims in token · POST /auth/login/verify · POST /auth/login/resend` | Email code + SMS code; optional authenticator app (TOTP) later | Built: RBAC (user/admin/superadmin); every admin sign-in needs an email code AND an SMS code (5 attempts, 10 min). Codes are delivered by the email/SMS providers (mocked until SendGrid / MSG91). |
| AUTH-10 | Admin profile view | P2 | Ready | Admin top bar → profile name | `GET /admin/me · PATCH /admin/me` | — | Built. |

## KYC & identity (4)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| KYC-01 | KYC — PAN-first (PAN check → KRA → DigiLocker) | P0 | Mock (integrated later) | Subscription page (first paid plan), KYC dialog, KYC status strip | `POST /kyc/pan · GET /kyc/status · POST /kyc/sessions` | Digio, Signzy, HyperVerge, IDfy, Setu (PAN, KRA fetch + upload, CKYC, DigiLocker) | Built: PAN + name + DOB + consent, KRA lookup (instant when found), DigiLocker full KYC otherwise, duplicate-PAN review, 5 tries/day; only masked PAN + hash stored. Mock test PANs on stage. Digio PAN/KRA endpoints to configure at onboarding. |
| KYC-02 | KYC status webhook | P0 | Mock (integrated later) | User Management → KYC column | `POST /webhooks/kyc (signed)` | Provider webhooks | Built; signed webhook verified. |
| KYC-04 | KYC record retention & KRA upload confirmation | P0 | Pending | Admin → User Management → KYC | `Retention job · provider KRA upload status` | KYC provider / KRA | Keep KYC references for the SEBI-required period after account closure; confirm retention rules with compliance. |
| KYC-03 | Admin KYC review & override | P1 | Ready | User Management → View user | `GET /admin/kyc/:userId · POST /admin/kyc/:userId/decision` | — | Built: admin decision with reason, audited. |

## Payments, plans & billing (10)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| BILL-01 | Checkout / create payment order | P0 | Mock (integrated later) | Pricing & Subscription → Start Pro / Premium plan | `POST /billing/checkout` | Razorpay, Cashfree, PayU, Stripe India | Built; Razorpay adapter ready, mock checkout on stage. |
| BILL-02 | Recurring subscriptions / mandates | P0 | Mock (integrated later) | Monthly / Quarterly / Yearly billing | `POST /billing/subscriptions · UPI Autopay / e-mandate` | Razorpay Subscriptions, Cashfree Subscriptions | One order per billing cycle built; UPI Autopay mandates to add with Razorpay Subscriptions. |
| BILL-03 | Payment & subscription webhooks | P0 | Mock (integrated later) | Subscriptions page statuses (Active, Past due, Cancelled) | `POST /webhooks/payments (signature verified, idempotent)` | Gateway webhooks | Built: signature-verified, idempotent. |
| BILL-04 | Pricing configuration (plans, prices, entitlements) | P0 | Ready | Subscriptions → Manage plans / Edit plan; public Pricing section | `GET /plans · PUT /admin/plans/:id (versioned)` | Own DB + gateway plan IDs | Built: versioned plan editor, audited. |
| BILL-05 | Plan upgrade, downgrade & proration | P1 | Ready | Top bar → Upgrade Plan; Subscription page | `POST /billing/subscriptions/:id/change` | Gateway subscription APIs | Built: switching plans replaces the current plan immediately (no proration yet). |
| BILL-06 | Cancellation & refunds | P1 | Mock (integrated later) | Subscription page; Subscriptions KPIs (refunds) | `POST /billing/subscriptions/:id/cancel · POST /admin/refunds` | Gateway refund APIs | Built: cancel at period end + admin refunds (mock provider). |
| BILL-07 | GST tax invoices (PDF) | P1 | Ready | Subscription → Billing history (View / PDF); Settings → Profile → Billing details | `GET /billing/invoices · GET /billing/invoices/:id/pdf · PATCH /me (billing state, address, GSTIN)` | Zoho Books / ClearTax only if e-invoicing becomes mandatory (turnover above ₹5 crore) | Numbered per financial year (MA/26-27/00001), CGST+SGST or IGST by place of supply, SAC, amount in words. Needs the company GSTIN and registered address (INVOICE_* settings) before go-live. |
| BILL-08 | Payment reconciliation & revenue reporting | P1 | Ready | Admin dashboard revenue, Subscriptions MRR | `GET /admin/billing/summary?from&to` | Gateway settlement reports | Built from payments table. |
| BILL-10 | SEBI centralised fee collection (CeFCoM) | P0 | Pending | Checkout | `Fee collection via the SEBI-recognised mechanism` | BSE CeFCoM (if required) | Waiting for the compliance officer: whether RA/IA fees must go through CeFCoM instead of / as well as Razorpay. |
| BILL-09 | Free-plan usage limits (e.g. 1 AI query/day) | P1 | Ready | Plan features, AI assistant | `Entitlement check middleware · GET /me/entitlements` | — | Built: AI queries/day per plan. |

## Market & fund data (8)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| DATA-01 | Daily NAV feed | P0 | Mock (integrated later) | Fund detail, Explore, dashboards; Data Management upload | `Scheduled job → POST /admin/data/nav (staging → publish)` | AMFI NAVAll.txt (free, daily), CAMS/KFintech, Value Research / Morningstar APIs | Built: AMFI NAVAll.txt adapter + nightly job; mock feed on stage. |
| DATA-02 | Historical NAV backfill | P0 | Ready | 5Y/10Y returns, charts | `Batch import job` | AMFI historical NAV, licensed data vendor | Built: workbook import. |
| DATA-03 | Fund master & categories | P0 | Ready | Explore filters, Data Management → Fund / Category Management | `GET/PUT /admin/funds · GET/PUT /admin/categories` | AMFI scheme master, SEBI categorisation, vendor feed | Built via workbook upload. |
| DATA-04 | Benchmark / index (TRI) data | P1 | Pending | Fund detail → Benchmark comparison | `GET /indices/:code/history` | NSE Indices (licensed), BSE, vendor |  |
| DATA-05 | Factsheet data (AUM, expense ratio, holdings) | P2 | Manual | Fund Info tab | `Monthly import job` | AMC factsheets, data vendor |  |
| DATA-06 | Market holiday calendar | P1 | Ready | SIP date engine, NAV validation | `GET /calendar/holidays` | NSE/BSE holiday circulars |  |
| DATA-07 | Server-side workbook ingestion (validate, stage, publish) | P0 | Ready | Data Management → Upload / Publish / Reset / Upload history | `POST /admin/data/uploads · POST /admin/data/uploads/:id/publish · GET /admin/data/uploads` | S3/GCS storage + worker (SheetJS/openpyxl) + Postgres staging tables | Built: server-side validation, staging, publish, history. |
| DATA-08 | Dataset export | P2 | Ready | Data Management → Export active dataset | `GET /admin/data/export.xlsx` | — | Built. |

## Calculations & analytics (7)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| CALC-01 | Fund returns & risk metrics service | P0 | Ready | Explore, Fund detail metrics, Top performing funds chart | `GET /funds · GET /funds/:id/metrics?period=` | Own service over NAV tables (pre-computed nightly) | Built: nightly pre-computed fund_metrics. |
| CALC-02 | What-if (lump-sum) calculator API | P0 | Ready | What If Calculator, dashboard “Run Calculation” | `POST /calc/lumpsum {fundId, date, amount}` | Own service using actual NAV on/after date | Built: uses actual NAV. |
| CALC-03 | MOD Alpha SIP vs Traditional SIP simulation | P0 | Ready | MOD Alpha SIP page, dashboard comparison | `POST /calc/sip-compare {fundId, amount, start, end}` | Own service using NAV + published SIP dates | Built: buys on published SIP dates vs fixed day. |
| CALC-04 | Fund search | P1 | Ready | Explore → Search box & category filters | `GET /funds/search?q=&category=` | Postgres full-text, Meilisearch, OpenSearch | Built: Postgres ILIKE search (move to full-text at scale). |
| CALC-05 | Watchlist | P1 | Ready | Fund detail → Add to Watchlist | `GET/POST/DELETE /me/watchlist` | Own DB | Built. |
| CALC-06 | Admin dashboard metrics & date-range API | P0 | Ready | Admin dashboard KPIs, User Growth & Subscription Trends charts, date-range picker, 7D/30D/3M/1Y | `GET /admin/metrics?from&to&granularity=` | SQL views / warehouse (BigQuery, ClickHouse) | Built: /admin/metrics with range & granularity. |
| CALC-07 | Product analytics events | P2 | Pending | Settings → Privacy → Product analytics consent | `Client SDK + consent gate` | PostHog, Mixpanel, GA4 (consent mode) |  |

## AI engine & assistant (7)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| AI-01 | SIP date recommendation engine | P0 | Manual | SIP_Dates sheet → calendar, Best Date card, SIP Date Configuration | `Batch job → POST /admin/sip-dates/proposals` | Own model service (Python), scheduled monthly | Dates entered via workbook / admin publish; engine to be connected. |
| AI-02 | SIP date validation, preview & publish workflow | P0 | Ready | SIP Date Configuration → Validate configuration → Preview & publish; dashboard “Update Date” | `POST /admin/sip-dates/validate · POST /admin/sip-dates/:month/publish` | Own service + approval & audit trail | Built: validate → publish → reminder campaign, versioned & audited. |
| AI-03 | Model backtesting & release gates | P1 | Ready | AI Models & Insights → Release gates, Open release checklist | `POST /admin/models/:version/evaluations · POST /admin/models/:version/approve` | MLflow, Weights & Biases, own | Built: gates + super-admin approval; evaluation runs pending. |
| AI-04 | AI assistant (LLM gateway) | P1 | Mock (integrated later) | “Ask Mod Alpha” chat bot (all user pages), Help → Chat with Mod Alpha | `POST /assistant/messages (streaming)` | Anthropic Claude API via server-side gateway | Built; rule-based mock until ANTHROPIC_API_KEY is set. |
| AI-05 | Grounding / retrieval over approved fund data | P1 | Pending | Assistant answers, AI Insight cards | `Internal retrieval service` | pgvector, OpenSearch, managed vector DB | Basic grounding built (top funds + SIP date in prompt); vector retrieval pending. |
| AI-06 | Latest AI Insights feed (text + Instagram reels) | P2 | Ready | Dashboard → Latest AI Insights; Admin → Insights & Reels | `GET /insights · GET/POST /admin/insights · PUT/DELETE /admin/insights/:id` | Instagram embed (no API key); Meta oEmbed only if automatic thumbnails are wanted | Admins curate text insights and Instagram reels (links to a public account). Automatic AI-generated insights are still to come. |
| AI-07 | AI safety, cost limits & usage logging | P1 | Pending | AI Models → Model service configuration | `Gateway policies, per-user quotas` | Gateway + secrets manager | Per-plan quotas built; monthly cost cap pending. |

## Notifications & messaging (7)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| NOTI-01 | Email delivery | P0 | Mock (integrated later) | SIP reminders, receipts, password reset, campaigns | `Provider API + POST /webhooks/email (delivery, bounce)` | Amazon SES, SendGrid, Postmark | Built; mock outbox until SendGrid. |
| NOTI-02 | SMS delivery (DLT) | P1 | Mock (integrated later) | SMS reminders, OTP; Notifications → SMS preview | `Provider API + delivery receipts` | MSG91, Gupshup, Kaleyra | Built; mock outbox until MSG91 (DLT). |
| NOTI-03 | Push / in-app notifications | P1 | Mock (integrated later) | Top bar bell dropdown, “Mark all as read”, Push preview | `GET /me/notifications · POST /me/notifications/read · web push subscribe` | Firebase Cloud Messaging, OneSignal | In-app inbox built; device push mocked until FCM. |
| NOTI-04 | WhatsApp messages | P2 | Mock (integrated later) | Footer WhatsApp link, future reminders | `WhatsApp Business Cloud API templates` | Meta Cloud API, Gupshup, Twilio | Adapter built; mocked. |
| NOTI-05 | SIP reminder scheduler | P0 | Ready | “Set Reminder” (Pro / Premium), Upcoming Notifications | `Scheduled job reading published SIP date + user preferences` | Cloud Scheduler / EventBridge + queue | Built: jobs worker dispatches scheduled campaigns. |
| NOTI-06 | Templates & campaigns | P1 | Ready | Notifications → Edit template, New campaign, Preview Notification | `CRUD /admin/notification-templates · POST /admin/campaigns` | Own + provider templates | Built. |
| NOTI-07 | Consent & unsubscribe management | P0 | Ready | Settings → Notifications toggles, Privacy consents | `GET/PUT /me/preferences · one-click unsubscribe links` | Own DB (DPDP Act consent records) | Built: preferences + consent ledger; campaigns skip opted-out channels. |

## User account & support (5)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| ACC-01 | Profile & preferences save | P0 | Ready | Settings → Save Changes / Save Preferences | `GET/PATCH /me · GET/PUT /me/preferences` | Own API | Built. |
| ACC-02 | Data export request (DPDP) | P1 | Ready | Not shown in the app (removed from Settings in v23.18); handled through Help & support | `POST /me/data-export → emailed download link` | Own job + object storage | Built: request + job fulfilment. |
| ACC-03 | Account deletion request | P1 | Ready | Not shown in the app (removed from Settings in v23.18); handled through Help & support | `POST /me/deletion-request (re-auth required)` | Own workflow + retention rules | Built: 30-day grace, then anonymised by job. |
| ACC-04 | Support tickets | P1 | Mock (integrated later) | Help & FAQ → Submit request | `POST /support/tickets` | Freshdesk, Zendesk, Zoho Desk, HubSpot | Built; Freshdesk adapter ready, mocked. |
| ACC-05 | Help-centre content (FAQs) | P2 | Ready | Help & FAQ, public FAQ section | `GET /content/faqs` | Headless CMS (Sanity, Strapi, Contentful) | FAQs served from DB; CMS later. |

## Admin operations (5)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| ADM-01 | User management API (search, export, suspend) | P0 | Ready | User Management → search, filters, View, Export CSV | `GET /admin/users?q&status&kyc&page · GET /admin/users/export.csv · PATCH /admin/users/:id` | Own API (PII access audited) | Built. |
| ADM-02 | Subscriptions admin API | P0 | Ready | Subscriptions → table, filters, KPIs | `GET /admin/subscriptions?state&plan&page` | Own API + gateway | Built. |
| ADM-03 | Audit log (write, search, export) | P0 | Ready | Audit Logs → search, filters, Export logs | `Append-only event store · GET /admin/audit?q&type&from&to · export` | Postgres append-only table, CloudTrail-style store | Built: DB trigger blocks UPDATE/DELETE. |
| ADM-04 | System settings edit | P1 | Ready | System Settings → Edit | `GET/PUT /admin/settings` | Own API + config service | Built (super admin). |
| ADM-05 | Date-range filter for admin reports | P1 | Ready | Admin dashboard → date-range picker | `Query params on /admin/metrics` | — | Built. |

## Public website (5)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| PUB-01 | Public activity feed | P2 | Ready | Landing page “new member joined” toast | `GET /api/public/activity?limit=8` | Own API (aggregated, no PII) | Built (anonymous, last 48h). |
| PUB-02 | Social profile links | P2 | Pending | Footer WhatsApp, X, Instagram, YouTube, LinkedIn | `Static URLs (config)` | — |  |
| PUB-03 | Cookie consent & web analytics | P1 | Pending | Public pages | `Consent banner + analytics SDK` | Cookiebot, Osano, GA4 / PostHog |  |
| PUB-05 | SEBI compliance pages (registration, MITC, grievance, SCORES / ODR) | P0 | Pending | Footer, sign-up, invoices, grievance page | `Static content + MITC acceptance record` | — | Needs registration type (RA/IA), number, grievance officer details and approved texts. |
| PUB-04 | Legal pages (Privacy, Terms, disclosures) | P0 | Pending | Footer Privacy / Terms | `Static content / CMS` | Legal review |  |

## Platform & infrastructure (9)

| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |
|---|---|---|---|---|---|---|---|
| PLT-01 | Backend API & database | P0 | Ready | Everything that is local/demo today | `REST/GraphQL backend` | Node/NestJS or Python/FastAPI + PostgreSQL | Built: Fastify + PostgreSQL, Docker, CI/CD for stage & prod. |
| PLT-02 | File storage for uploads | P0 | Manual | Data Management uploads | `Pre-signed upload URLs` | Amazon S3, Google Cloud Storage | Uploads stored in PostgreSQL until S3/GCS. |
| PLT-03 | Secrets & encryption (KMS) | P0 | Pending | System Settings → Access & security | `—` | AWS Secrets Manager + KMS, GCP Secret Manager | Env vars from the deploy platform; secrets manager pending. |
| PLT-04 | Logging, monitoring & alerting | P0 | Pending | — | `—` | Sentry, Datadog, Grafana Cloud | Structured JSON logs; monitoring/alerting pending. |
| PLT-05 | Rate limiting & WAF | P0 | Ready | Login, OTP, public APIs | `Gateway policies` | Cloudflare, AWS WAF | App rate limiting built; WAF pending. |
| PLT-06 | Backups & disaster recovery | P0 | Pending | — | `—` | Managed DB snapshots, PITR | Depends on hosting choice. |
| PLT-08 | Cloud hosting, domains & CI/CD environments | P0 | Pending | — | `AWS Mumbai (stage + prod), DNS, GitHub environments` | AWS / GCP / Azure India region | Docker images, CI and deploy workflow are ready; accounts listed in the accounts document. |
| PLT-09 | Security testing & incident reporting (VAPT, CERT-In) | P0 | Pending | — | `—` | CERT-In empanelled VAPT firm | VAPT on stage before launch; CERT-In 6-hour incident reporting contact; SEBI CSCRF category. |
| PLT-07 | Client-side spreadsheet parsing | P1 | Ready | Data Management validation | `—` | SheetJS CE (vendored) |  |

## Still to integrate or build

- **Login page → Mobile tab** → AUTH-02 Mobile OTP login
- **Login → “Forgot Password?”** → AUTH-03 Forgot / reset password
- **Login → Google button** → AUTH-04 Google sign-in
- **Login → Apple button** → AUTH-05 Sign in with Apple
- **Settings → Personal details (email locked, mobile number)** → AUTH-08 Email & mobile verification
- **Subscription page (first paid plan), KYC dialog, KYC status strip** → KYC-01 KYC — PAN-first (PAN check → KRA → DigiLocker)
- **User Management → KYC column** → KYC-02 KYC status webhook
- **Admin → User Management → KYC** → KYC-04 KYC record retention & KRA upload confirmation
- **Pricing & Subscription → Start Pro / Premium plan** → BILL-01 Checkout / create payment order
- **Monthly / Quarterly / Yearly billing** → BILL-02 Recurring subscriptions / mandates
- **Subscriptions page statuses (Active, Past due, Cancelled)** → BILL-03 Payment & subscription webhooks
- **Subscription page; Subscriptions KPIs (refunds)** → BILL-06 Cancellation & refunds
- **Checkout** → BILL-10 SEBI centralised fee collection (CeFCoM)
- **Fund detail, Explore, dashboards; Data Management upload** → DATA-01 Daily NAV feed
- **Fund detail → Benchmark comparison** → DATA-04 Benchmark / index (TRI) data
- **Fund Info tab** → DATA-05 Factsheet data (AUM, expense ratio, holdings)
- **Settings → Privacy → Product analytics consent** → CALC-07 Product analytics events
- **SIP_Dates sheet → calendar, Best Date card, SIP Date Configuration** → AI-01 SIP date recommendation engine
- **“Ask Mod Alpha” chat bot (all user pages), Help → Chat with Mod Alpha** → AI-04 AI assistant (LLM gateway)
- **Assistant answers, AI Insight cards** → AI-05 Grounding / retrieval over approved fund data
- **AI Models → Model service configuration** → AI-07 AI safety, cost limits & usage logging
- **SIP reminders, receipts, password reset, campaigns** → NOTI-01 Email delivery
- **SMS reminders, OTP; Notifications → SMS preview** → NOTI-02 SMS delivery (DLT)
- **Top bar bell dropdown, “Mark all as read”, Push preview** → NOTI-03 Push / in-app notifications
- **Footer WhatsApp link, future reminders** → NOTI-04 WhatsApp messages
- **Help & FAQ → Submit request** → ACC-04 Support tickets
- **Footer WhatsApp, X, Instagram, YouTube, LinkedIn** → PUB-02 Social profile links
- **Public pages** → PUB-03 Cookie consent & web analytics
- **Footer, sign-up, invoices, grievance page** → PUB-05 SEBI compliance pages (registration, MITC, grievance, SCORES / ODR)
- **Footer Privacy / Terms** → PUB-04 Legal pages (Privacy, Terms, disclosures)
- **Data Management uploads** → PLT-02 File storage for uploads
- **System Settings → Access & security** → PLT-03 Secrets & encryption (KMS)
- **—** → PLT-04 Logging, monitoring & alerting
- **—** → PLT-06 Backups & disaster recovery
- **—** → PLT-08 Cloud hosting, domains & CI/CD environments
- **—** → PLT-09 Security testing & incident reporting (VAPT, CERT-In)
