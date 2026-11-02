# 24 — Code structure, environments and API

## 1. Repository layout

```
mod-alpha/
├── apps/
│   ├── api/                      # Backend — Node 22 + TypeScript + Fastify + PostgreSQL
│   │   ├── migrations/           # SQL migrations (001_init.sql, 002_fund_metrics.sql …)
│   │   ├── src/
│   │   │   ├── config.ts         # env validation, stage/prod rules, provider credentials
│   │   │   ├── app.ts            # Fastify app (security headers, CORS, cookies, rate limit, errors)
│   │   │   ├── server.ts         # HTTP entrypoint
│   │   │   ├── db.ts             # pg pool + transactions
│   │   │   ├── shared/           # errors, validation, audit log, dates
│   │   │   ├── providers/        # external adapters, one file per vendor: mock + real (docs/23)
│   │   │   ├── modules/          # one folder per feature: routes.ts (+ helpers)
│   │   │   │   ├── auth/         routes · session (cookies, timeouts) · admin-mfa · helpers
│   │   │   │   ├── account/  billing/  kyc/  funds/ (+ analytics)  sip/  data/ (+ workbook)
│   │   │   │   └── admin/  notifications/  content/
│   │   │   ├── jobs/             # NAV import, campaign dispatch, subscription lifecycle, DPDP requests, custom reminders
│   │   │   └── cli/              # migrate, seed, jobs worker
│   │   ├── test/                 # integration tests against a real PostgreSQL
│   │   └── Dockerfile
│   └── web/                      # Website (static HTML/CSS/JS) — structure: apps/web/README.md
│       ├── index.html            # the only page; script load order explained inside
│       ├── src/core/             # state, router, layout, icons, start-up registry, boot, API client
│       ├── src/shared/           # charts, date picker, fund logos, dataset
│       ├── src/features/<feature>/  # <feature>.js (screens) + <feature>.live.js (API mode)
│       ├── src/styles/           # base.css, app.css, theme-light(.generated).css
│       ├── config/env.js         # generated per environment at build time
│       ├── config/env.{local,stage,prod}.json
│       ├── data/                 # test workbook + blank template
│       └── Dockerfile            # nginx image
├── infra/                        # docker-compose (local/stage), nginx.conf
├── scripts/                      # build-web.mjs, data-tools (test data + backlog generators)
├── docs/                         # product, design and engineering docs (this file)
├── .github/workflows/            # ci.yml, deploy.yml
├── .env.stage.example  .env.prod.example
```

**Frontend modes.** When `config/env.js` sets `API_BASE_URL`, the website runs against the API (stage, prod or local). Without it, the site is the original static demo, which is still useful for design reviews.

## 2. Environments

| | local | **stage** | **prod** |
|---|---|---|---|
| Website | `localhost:8081` | `https://stage.modalpha.in` | `https://modalpha.in` |
| API | `localhost:8080` | `https://api.stage.modalpha.in` | `https://api.modalpha.in` |
| Database | docker Postgres | managed Postgres (stage) | managed Postgres, TLS, PITR backups |
| Deploys | manual | every push to `main` | on release tag `v*` + GitHub Environment approval |
| Providers | mocks | mocks by default; vendor sandboxes when testing | real vendors (payments/KYC/email/SMS required) |
| Test workbook | yes | yes (`npm run seed -- --workbook=…`) | **refused** |
| Users/Subscriptions sheets in uploads | allowed | allowed | **rejected** (they come from real sign-ups/payments) |
| Stage-only endpoints (`/billing/mock/complete`, `/kyc/mock/complete`, OTP `devCode`) | on | on | **off** |
| UI badge | none (removed) | none (removed) | none |

All differences are driven by `APP_ENV` and provider env vars, so the **same images** run in both environments.

## 3. Running locally

See **`RUN_LOCALLY.md`** in the repository root. It covers Docker and Node + PostgreSQL, login details, how to test mocked flows, and troubleshooting. Local settings live in `.env.local`, created from `.env.local.example`. The API loads that file automatically.

## 4. Deploying

1. Create two GitHub Environments, **stage** and **prod** (with required reviewers on prod).
2. Per environment, set the variables `WEB_API_BASE_URL`, `WEB_RAZORPAY_KEY_ID`, `WEB_GOOGLE_CLIENT_ID` and `DEPLOY_HOOK_URL`, and the secret `DEPLOY_HOOK_TOKEN`.
3. On the hosting platform, run two services from the **api** image:
   - `api` — `node dist/server.js` with `MIGRATE_ON_START=true`
   - `jobs` — `node dist/cli/jobs.js`

   Run the **web** image (nginx) as the website. Runtime secrets (`DATABASE_URL`, `JWT_SECRET`, provider keys) go into the platform's secret store, never into git.
4. Push to `main` deploys stage. Tag `vX.Y.Z` deploys prod after approval.
5. The first prod deploy creates the super admin from `ADMIN_BOOTSTRAP_*`. Remove those variables afterwards.

Migrations are plain SQL, applied in order, and protected by an advisory lock, so several replicas can start at once. Each migration runs in a transaction.

## 5. Scheduled jobs (`node dist/cli/jobs.js`)

| Job | When | What |
|---|---|---|
| `dispatchDueCampaigns` | every minute | sends scheduled campaigns (SIP reminders are scheduled automatically on publish), consent-aware |
| `subscriptionLifecycle` | hourly | ends plans cancelled at period end, marks overdue renewals past due, expires abandoned checkouts |
| `processDataRequests` | hourly | fulfils data exports; anonymises accounts 30 days after a deletion request |
| `customSipReminders` | 09:00 IST daily | reminds paid subscribers who chose their own SIP day (in-app + email/SMS per their channels); a day past the month's end (e.g. 31 in November) falls on the last day; one reminder per user per date |
| `importNav` | 23:30 IST daily | imports NAVs from the provider (AMFI or mock), recomputes fund metrics |

Run one job on demand:

```bash
node dist/cli/jobs.js --once importNav
```

## 6. API reference (v1)

Base path: `/api/v1`. Auth uses httpOnly cookies (`ma_at` for the access token, `ma_rt` for the rotating refresh token); `Authorization: Bearer` is also accepted. Errors are returned as `{ error: { code, message, details } }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` · `/auth/login` · `/auth/login/verify` · `/auth/login/resend` · `/auth/logout` · `/auth/logout-all` · `/auth/refresh` · `/auth/otp/send` · `/auth/otp/verify` · `/auth/password/forgot` · `/auth/password/reset` · `/auth/verify-email` · `/auth/oauth/google` · `/auth/oauth/apple` (501) · `GET /auth/me` |
| Me | `PATCH /me` · `POST /me/password` · `POST /me/verify-email` · `GET/PUT /me/preferences` (incl. `sipReminder`) · `PUT /me/consents` · `GET /me/notifications` · `POST /me/notifications/read` · `GET/POST/DELETE /me/watchlist[/:fundId]` · `POST /me/data-export` · `GET /me/data-export/:id` · `POST /me/deletion-request` · `GET /me/entitlements` |
| Plans & billing | `GET /plans` · `POST /billing/checkout` · `POST /billing/verify` · `POST /billing/mock/complete` (stage) · `POST /webhooks/payments` · `GET /billing/subscription` · `POST /billing/subscriptions/:id/cancel` · `GET /billing/invoices[/:id]` · `GET /billing/invoices/:id/pdf` (GST tax invoice) |
| KYC | `GET /kyc/status` · `POST /kyc/sessions` · `POST /webhooks/kyc` · `POST /kyc/mock/complete` (stage) |
| Funds & calculators | `GET /funds` (search, category, sort, paging) · `GET /funds/categories` · `GET /funds/:id` · `GET /funds/:id/nav` · `POST /calc/lumpsum` · `POST /calc/sip-compare` |
| SIP dates | `GET /sip-dates/current` · `GET /sip-dates` (the day of the current and future months only for paid subscribers and admins — see §7a) |
| Content | `GET /faqs` · `GET /insights` · `GET /insights/:id/cover` · `GET /public/activity` · `POST /assistant/messages` · `POST /support/tickets` |
| Admin — reporting | `GET /admin/metrics?from&to&granularity` · `GET /admin/recent` · `GET /admin/data/summary` |
| Admin — users & billing | `GET /admin/users` (+`format=csv`) · `GET/PATCH /admin/users/:id` · `POST /admin/kyc/:userId/decision` · `GET /admin/subscriptions` · `PUT /admin/plans/:id` · `POST /admin/payments/:id/refund` |
| Admin — SIP dates | `POST /admin/sip-dates/validate` · `POST /admin/sip-dates/publish` |
| Admin — data | `POST /admin/data/uploads` (multipart) · `GET /admin/data/uploads[/:id]` · `POST /admin/data/uploads/:id/publish` · `/discard` · `GET /admin/data/export.xlsx` · `POST /admin/data/recompute-metrics` · `GET /admin/data/schema` |
| Admin — messaging | `GET /admin/notification-templates` · `PUT /admin/notification-templates/:key` · `POST …/:key/preview` · `GET/POST /admin/campaigns` · `POST /admin/campaigns/:id/cancel` · `GET /admin/mock-outbox` |
| Admin — governance | `GET /admin/audit` (+`format=csv`) · `GET/PUT /admin/settings` · `GET /admin/integrations` · `GET /admin/data-requests` · `GET /admin/models` · `PUT /admin/models/:v/gates` · `POST /admin/models/:v/approve` |
| Ops | `GET /health` · `GET /ready` |

## 7. SIP reminders: Mod Alpha's date or the subscriber's own day

**Dashboard → AI Recommended SIP Dates → Set Reminder**

1. **Free users** are sent to **Subscription** to choose a plan.
2. **Subscribers** can tap any day in the calendar. **Set Reminder** then asks: *"Do you want your customised SIP notification instead of the Mod Alpha notification?"* Answering **Yes** saves the setting below.

   ```json
   { "sipReminder": { "mode": "custom", "day": 20 } }
   ```

   It is sent with `PUT /api/v1/me/preferences`. Free accounts get **402 `subscription_required`**.
3. **Switching back:** choosing Mod Alpha's date while a custom day is active offers to switch back to `{ "mode": "modalpha" }`.
4. **Who gets which reminder:**
   - The monthly **Mod Alpha SIP reminder campaign** skips subscribers in `custom` mode.
   - The **`customSipReminders`** job reminds those subscribers on their own day instead.
5. **Audit:** every change is written to the audit log as `SIP_REMINDER_PREFERENCE_CHANGED`.

**Demo mode** (no API) keeps the plan and the choice in the browser. The Subscription page can activate a demo Pro or Premium plan, so the subscriber flow can be tried without payments.

## 7a. The best SIP date is a paid feature (v23.18)

- `GET /sip-dates` and `GET /sip-dates/current` return the recommended day and the alternative days of the **current and future months** only to admins and to users with an **active paid plan**. Everyone else gets those fields as `null` plus `locked: true`; the uplift % stays visible. Past months stay visible to everyone.
- The reason and the publishing admin are returned to admins only.
- The dashboard shows a blurred placeholder card with **See plans** (the blurred number is not the real day; the real day never reaches the browser). The KPI tile shows the same lock.
- The AI assistant (mock and LLM) is only given the day for subscribers.
- The in-app broadcast after publishing no longer contains the day. Campaigns sent to audiences other than `active_subscribers` replace `{{date}}` with "on your dashboard".
- The website reloads the SIP dates after sign-in and after a payment, so the date appears straight after subscribing.
- Demo mode: locked until a demo plan is activated on the Subscription page.

## 7b. GST tax invoices (v23.18)

Every captured payment creates a GST tax invoice (`apps/api/src/modules/billing/invoice.ts`), downloadable as an A4 PDF from **Subscription → Billing history** (`GET /billing/invoices/:id/pdf`).

| On the invoice | Where it comes from |
|---|---|
| Seller name, registered address, GSTIN, PAN, LLPIN, SEBI registration, support email | `INVOICE_SELLER_*`, `INVOICE_SEBI_REG`, `INVOICE_SUPPORT_EMAIL` (GSTIN and address are required in prod) |
| Invoice number | `MA/26-27/00001`: prefix, financial year (April–March), running number per year (gap-free, advisory lock) |
| Customer name, email, mobile, address, state, GSTIN | the account + **Settings → Profile → Billing details** (`PATCH /me` `billingStateCode`, `billingAddress`, `billingGstin`) |
| Place of supply | the customer's state; else the state of their GSTIN; else the seller's state (B2C rule) |
| Tax | prices include 18% GST. Same state as the seller → CGST 9% + SGST 9%; other state → IGST 18% |
| SAC | `INVOICE_SAC` (default 997156 — **confirm with the company's CA**) |
| Description, service period, payment reference, amount in words, reverse charge "No", authorised signatory, SEBI disclaimer | generated |

Everything printed is stored on the invoice row when it is issued (`seller`, `buyer`, tax split — migration `006_gst_invoices.sql`), so an invoice never changes afterwards. Invoices issued before v23.18 are shown with the current seller details.

GST e-invoicing (IRN / QR code through the GST portal) is only mandatory above ₹5 crore annual turnover; when needed, the invoice data can be sent to a GSP such as ClearTax or Zoho Books.

## 7c. Accounts: login vs create account, and admin accounts (v23.19)

**Login only signs in existing accounts.** The Login screen sends `intent: 'login'` with `POST /auth/otp/send`, `/auth/otp/verify` and `/auth/oauth/google`. An unknown mobile number or Google account gets **404 `no_account`** ("No Mod Alpha account uses this … Create an account first.") and the screen links to Create account. No SMS is sent for an unknown number. **Create account** sends `intent: 'signup'`, which creates the account (a mobile number or Google account that already has one simply signs in).

**Admin accounts.**

| Step | How |
|---|---|
| First super admin (each environment) | Set `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` and `ADMIN_BOOTSTRAP_MOBILE` in the environment's secrets. On start the API creates the super admin (or fills in its mobile number). Change the password after the first sign-in, then remove `ADMIN_BOOTSTRAP_PASSWORD` from the secrets. |
| More admins | A super admin opens **Admin → Users → Add admin** (name, work email, mobile, role). `POST /admin/admins` creates the account without a password and emails a 3-day link to set one; opening it also confirms the email. On stage without real email, the screen shows the link to pass on. |
| Existing user → admin | **Admin → Users → open the user → Role** (super admins only, reason required, audited). The account needs both an email and a mobile number. You cannot change your own role. |
| Remove an admin | Change the role back to User, or Suspend the account (ends their sessions at once). |

Every admin signs in with password + a code by email + a code by SMS. Stage uses its own demo admins; prod admins are real staff only.

## 7d. Latest AI Insights: text cards and Instagram reels (v23.21)

**Admin → Insights & Reels** (`#/admin/insights`, any admin) manages what users see in the dashboard tile **Latest AI Insights**.

| | |
|---|---|
| Add a reel | Post it on Mod Alpha's **public** Instagram account (business/creator) → on Instagram ⋯ → *Copy link* → **Add Instagram reel** → paste, title, optional caption and cover (PNG/JPEG/WebP ≤ 600 KB) → tick *Published*. A live preview shows while you paste. |
| Add text | **Add text insight**: title, text, icon. |
| Manage | Edit, Pin / Unpin, Publish / Hide, Delete, Order (lower first). New items start as **Draft** unless *Published* is ticked. Every change is audited (`INSIGHT_CREATED / _UPDATED / _DELETED`, category Content). |
| Tile | Pinned first, then order, then newest; 4 on the tile, all under **View All**. A reel shows its cover (or an Instagram-style card) with a play button and opens Instagram's own player (`…/reel/<id>/embed/`) in a dialog with **Open on Instagram** as a fallback. A disclaimer sits under the tile. |
| Storage | Table `insights` (migration 007): `kind` text/instagram, `url` (normalised), `media_id`, `cover` (bytea), `pinned`, `sort`, `status` Draft/Published/Hidden. Only the link is stored — the video stays on Instagram. |
| API | `GET /insights` (public, max 12) · `GET /insights/:id/cover` · `GET/POST /admin/insights` · `PUT/DELETE /admin/insights/:id`. Links accepted: `instagram.com/reel/…`, `/reels/…`, `/p/…`, `/tv/…` (with or without the account name or `?igsh=`). |

No Instagram API key or Meta app is needed. If a reel is deleted, archived or the account turns private, the player is empty — hide or delete the item. Production website security headers must allow `frame-src https://www.instagram.com` (TODO §4).

Demo mode keeps the list in the browser (localStorage).

## 8. Security notes

- **Passwords:** bcrypt (cost 11).
- **Admin sign-in uses three factors:** password, a code by **email** and a code by **SMS**.
  1. `POST /auth/login` checks the password. For admins it returns `{ mfaRequired, challengeId, email, mobile }`, with the email and mobile masked, instead of a session.
  2. One 6-digit code goes to the admin's email and another to their mobile.
  3. `POST /auth/login/verify { challengeId, emailCode, smsCode }` starts the session only when **both** codes match.
  - **Limits:** codes expire after 10 minutes, 5 wrong tries end the challenge, and up to 3 resends are allowed (`POST /auth/login/resend`).
  - **Other sign-in routes:** mobile-OTP and Google sign-in for admins go through the same step.
  - **Audit trail:** `ADMIN_LOGIN_CHALLENGE`, `ADMIN_LOGIN_CODE_FAILED` and `ADMIN_LOGIN`.
  - **Contact details:** admins need both an email and a mobile on file. The first admin's mobile comes from `ADMIN_BOOTSTRAP_MOBILE`, required in prod.
  - **Stage only:** while email and SMS are mocked, the codes are also shown on screen on stage. That never happens in prod.
- **Sessions:** a 15-minute access JWT plus a rotating refresh token (stored hashed).
  - **Session check:** the access token carries its session id, and **every request re-checks that session**. An access token stops working the moment its session is revoked or the account is suspended, not just when it expires after 15 minutes.
  - **Inactivity:** no activity for `SESSION_IDLE_MINUTES` (default 15) ends the session. The browser shows "Are you still there?" 60 seconds before, with *Stay signed in*. Activity = user-triggered requests plus a heartbeat (`POST /auth/activity`) while the person uses the page; activity in one tab keeps all tabs signed in. The server enforces it even if the tab is closed.
  - **Absolute limit:** `SESSION_MAX_HOURS_USER` (12) / `SESSION_MAX_HOURS_ADMIN` (8) after sign-in, whatever the activity; refreshing never extends it. A notice appears 5 minutes before.
  - **Audit:** `SESSION_TIMEOUT_IDLE`, `SESSION_TIMEOUT_ABSOLUTE`. "Remember my email" only pre-fills the email.
  - **Theft detection:** reusing a rotated or logged-out refresh token revokes every session of that user (timeouts, password changes and suspensions do not trigger this).
  - **Password change** ends the user's other sessions; this browser stays signed in.
- **Logout:** `POST /auth/logout` revokes the current session server-side, clears both cookies and is audited (`LOGOUT`).
  - The **Log out** button is in the sidebar for users and admins. The profile popup still has **Sign out** too.
  - Other open tabs follow to the login page.
  - API responses are sent with `Cache-Control: no-store`.
- **Sign out of all devices:** Settings → Profile calls `POST /auth/logout-all`, which revokes every session and is audited (`LOGOUT_ALL_DEVICES`).
- **KYC (PAN-first):** `POST /kyc/pan { pan, name, dob, consent }` → PAN check → KRA lookup → verified at once, or full KYC (DigiLocker) at the provider. Only the masked PAN (`ABCDE••••F`), an HMAC of the PAN (duplicate detection), method, KRA reference and match flags are stored — never the full PAN, Aadhaar or images. 5 attempts a day; a PAN already verified on another account goes to admin review. Logs redact `pan` and `dob`.
- **Public activity feed:** anonymous ("A new member") unless the member opted in (the opt-in toggle was removed from Settings in v23.18, so everyone is shown as "A new member"; `PUT /me/preferences` `showInActivityFeed` still works); then first name + last initial only.
- Cookies: httpOnly, `SameSite=Lax`, `Secure` on https. CORS is restricted to the website origin.
- Rate limits: global 300/min; auth endpoints 10/min; OTP 5/hour per number with 5 attempts per code.
- Webhooks: HMAC signature verified on the raw body; idempotent by event id.
- Audit log: append-only, enforced by a database trigger. Viewing a user record, exports, publishes, pricing, roles and refunds are all logged.
- Prod refuses mock providers and the default JWT secret, and rejects importing user/subscription data.
- PII: test data must stay synthetic. Data-export and deletion requests follow the DPDP Act.
