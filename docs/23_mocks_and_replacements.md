# 23 — Mocks and what replaces them

**Status:** v23 (31 Oct 2026) · **Owner:** engineering · **Audience:** engineering, QA, product, compliance

The Mod Alpha API is fully built. Every external service sits behind one adapter with two implementations:

| | Mock | Real |
|---|---|---|
| Used on | stage (default) and local development | prod; stage while testing a vendor |
| Behaviour | Works end to end without the vendor. Anything it "sends" is written to the **mock outbox** table. | Calls the vendor's API. |
| Switch | `<PROVIDER>=mock` | `<PROVIDER>=<vendor>` + that vendor's credentials |

Switching from the mock to the real vendor is **configuration only**: set the environment variables and restart. No code changes, no frontend redeploy (except the two public keys in §4).

You can see this live in **Admin → System Settings → External providers**. Every mocked provider shows the badge **"Integrated later"**, the vendor that will replace it, and the env vars needed. The panel reads `GET /api/v1/admin/integrations`, so it updates automatically when a provider is switched on.

### Safety rails

- **Prod refuses to start** if payments, KYC, email or SMS are still on `mock`. A temporary exception must be listed explicitly: `ALLOW_MOCK_PROVIDERS=kyc`.
- If you select a real provider without its credentials, the API fails at startup and names the missing variable.
- Stage-only test endpoints (`/billing/mock/complete`, `/kyc/mock/complete`) return 404 in prod and whenever the real provider is active.
- The stage OTP is returned in the API response (`devCode`) only when SMS is mocked and `APP_ENV` is not prod.
- Mock Google tokens (`mock:<email>`) are rejected in prod.

---

## 1. Mocked providers (API built — vendor integrated later)

| # | Area | Mock today (what testers see on stage) | Replaced by | Switch with | Backlog |
|---|---|---|---|---|---|
| 1 | **Payments & subscriptions** | Checkout opens a **"Test payment (stage)"** dialog with *Pay* and *Simulate failure*. The API signs a webhook exactly as Razorpay would and processes it through the same code path: subscription activated, invoice created, notification sent. | **Razorpay** Orders + Checkout (`checkout.js`), signed webhooks. Later: Razorpay Subscriptions for UPI Autopay / e-mandates. | `PAYMENT_PROVIDER=razorpay`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; web: `WEB_RAZORPAY_KEY_ID`. Webhook URL: `POST https://api.<env>/api/v1/webhooks/payments` | BILL-01/02/03/06 |
| 2 | **KYC / identity** | "Start KYC" redirects to a stage page with **Approve** / **Reject**, which posts a signed webhook. The user's KYC status updates and they get a notification. | **Digio** KYC (PAN, DigiLocker / Aadhaar offline eKYC, CKYC) with webhook. | `KYC_PROVIDER=digio`, `DIGIO_CLIENT_ID`, `DIGIO_CLIENT_SECRET`, `DIGIO_BASE_URL`, `KYC_WEBHOOK_SECRET`. Webhook: `POST /api/v1/webhooks/kyc`. KYC template name `MODALPHA_KYC` must exist in Digio. | KYC-01/02 |
| 3 | **Transactional email** | Verification, password-reset, receipt and campaign emails are written to the **mock outbox**, which is visible in Admin → Notifications → Mock outbox. QA copies reset/verify links from there. | **SendGrid** (or Amazon SES) with domain authentication (SPF/DKIM) and bounce webhooks. | `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY`, `EMAIL_FROM` | NOTI-01, AUTH-03/08 |
| 4 | **SMS & OTP** | OTP and SMS reminders go to the mock outbox. On stage the login screen shows the **test OTP** under the field. | **MSG91** Flow API with a DLT-registered sender ID and templates (OTP + SIP reminder). | `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID`, `MSG91_SMS_TEMPLATE_ID` | AUTH-02, NOTI-02 |
| 5 | **Push notifications** | The **in-app inbox (bell) is real**. Device push goes to the mock outbox. | **Firebase Cloud Messaging** (web push; service worker + token registration still to add). | `PUSH_PROVIDER=fcm`, `FCM_SERVER_KEY` | NOTI-03 |
| 6 | **WhatsApp** | Template messages go to the mock outbox. | **WhatsApp Business Cloud API** with Meta-approved templates. | `WHATSAPP_PROVIDER=meta`, `META_WA_TOKEN`, `META_WA_PHONE_ID` | NOTI-04 |
| 7 | **AI assistant** | Rule-based answers **grounded in the live database**: this month's SIP date, CAGR explanation, fund look-up by name. Plan quotas are enforced (Free = 1 query/day). | **Anthropic Claude** via the server-side gateway. The same system prompt and grounding context are already sent. | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MONTHLY_BUDGET_INR` | AI-04/07 |
| 8 | **Daily NAV feed** | The nightly job (23:30 IST) **synthesises** the next business day's NAV from the last stored value. Admins can also upload the workbook. | **AMFI `NAVAll.txt`** (free, public). The adapter and parser are built; set `funds.amfi_code` for each fund. Later: a licensed vendor (CAMS/KFintech, Value Research, Morningstar). | `NAV_PROVIDER=amfi` (optional `AMFI_NAV_URL`) | DATA-01 |
| 9 | **Google sign-in** | Clicking **Google** prompts for an email and signs in with the token `mock:<email>` (stage only). | **Google Identity Services** — the ID token is verified server-side. | `OAUTH_GOOGLE=google`, `GOOGLE_CLIENT_ID`; web: `WEB_GOOGLE_CLIENT_ID` + add the GIS script tag | AUTH-04 |
| 10 | **Helpdesk tickets** | Tickets are stored in the database (`support_tickets`) and copied to the mock outbox. | **Freshdesk** (or Zendesk / Zoho Desk) ticket API. | `SUPPORT_PROVIDER=freshdesk`, `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY` | ACC-04 |

> The real adapters are written against each vendor's public API documentation but have **not been run against live vendor accounts** (no credentials were available). Before turning each on in prod, enable it on **stage with sandbox/test keys** and run the checklist in §3.

---

## 2. Not built yet (planned)

These are also listed under "Not built yet — planned" in System Settings.

| Item | Interim behaviour | Planned replacement | Backlog |
|---|---|---|---|
| Sign in with Apple | Button shows "coming later"; API returns 501 | Apple Services ID + OIDC callback | AUTH-05 |
| Admin MFA | RBAC enforced (user / admin / superadmin) | TOTP enrolment for admins | AUTH-09 |
| GST e-invoicing | GST-inclusive in-app invoices (printable) | Gateway invoices or Zoho Books / ClearTax e-invoice IRN | BILL-07 |
| Recurring mandates | One payment order per billing cycle | Razorpay Subscriptions (UPI Autopay / e-NACH) | BILL-02 |
| Proration on plan change | New plan replaces the old one immediately | Proration via gateway subscription change | BILL-05 |
| Object storage | Uploaded workbooks stored in PostgreSQL (`bytea`) | Amazon S3 / GCS with pre-signed uploads | PLT-02 |
| Benchmark / TRI data | — | NSE Indices licensed feed | DATA-04 |
| SIP-date model engine | Dates are entered by admins (publish flow) or in the workbook | Model service writes proposals → admin validates & publishes | AI-01 |
| AI insights generation | Seeded insight cards in the database | Scheduled LLM generation + human review | AI-06 |
| Product analytics | Consent flag is stored | PostHog / GA4 behind the consent flag | CALC-07 |
| Help-centre CMS | FAQs served from the `faqs` table | Headless CMS | ACC-05 |
| Secrets manager & KMS | Env vars injected by the deploy platform | AWS Secrets Manager / GCP Secret Manager | PLT-03 |
| Monitoring & alerting | Structured JSON logs, `/health`, `/ready` | Sentry + Grafana/Datadog alerts | PLT-04 |
| Web push registration | — | Service worker + FCM token endpoint | NOTI-03 |

---

## 3. Go-live checklist for each provider

1. Get **sandbox/test** credentials. Put them in the **stage** environment's secret store and set `<PROVIDER>=<vendor>`.
2. Register the webhook URL in the vendor dashboard (payments, KYC) and copy the webhook secret into the env.
3. Restart the API. Startup fails if a credential is missing.
4. **Admin → System Settings → External providers** should now show **Live** for that provider.
5. Run the provider's QA script:
   - **Payments:** successful payment, failed payment, duplicate webhook (ignored), refund from admin, cancel at period end.
   - **KYC:** approve, reject, abandoned session.
   - **Email/SMS:** deliverability to Gmail/Outlook, DLT template approval, OTP expiry and retry limit.
   - **AI:** quota per plan, refusal of personalised advice, latency.
   - **NAV:** fund `amfi_code` mapping coverage, holiday handling, metrics recomputed.
6. Repeat with **live** credentials in **prod** (remove the provider from `ALLOW_MOCK_PROVIDERS` if it was listed).
7. Update the status in `apps/web/src/features/admin/settings/integrations-catalogue.js` from `Mock` to `Ready` and regenerate `docs/22_integration_backlog.md`:

   ```bash
   node scripts/data-tools/export_integrations.js
   ```

---

## 4. Where the mocks live in code

| Concern | File |
|---|---|
| All adapters (mock + real) — one file per provider; registry and catalogue shown in System Settings | `apps/api/src/providers/` (`index.ts` = registry) |
| Rule-based assistant | `apps/api/src/providers/mock-ai.ts` |
| Prod guard (refuses mocks) and required credentials per provider | `apps/api/src/config.ts` |
| Stage-only payment confirmation | `POST /api/v1/billing/mock/complete` in `apps/api/src/modules/billing/routes.ts` |
| Stage-only KYC decision | `POST /api/v1/kyc/mock/complete` in `apps/api/src/modules/kyc/routes.ts`; page `#/kyc/mock` in `apps/web/src/features/subscription/kyc.live.js` |
| Mock outbox | table `mock_outbox`; `GET /api/v1/admin/mock-outbox`; Admin → Notifications |
| Public keys the browser needs | `apps/web/config/env.<env>.json` or CI vars `WEB_RAZORPAY_KEY_ID`, `WEB_GOOGLE_CLIENT_ID` |
