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
│   │   │   ├── lib/              # auth (JWT cookies, RBAC), audit log, validation, dates, errors
│   │   │   ├── providers/        # external adapters: mock + real (docs/23)
│   │   │   ├── modules/          # one file per domain (routes + logic)
│   │   │   │   ├── auth.ts  me.ts  billing.ts  kyc.ts  funds.ts  analytics.ts
│   │   │   │   ├── sip.ts  data.ts  workbook.ts  admin.ts  notifications.ts  content.ts
│   │   │   ├── jobs/             # NAV import, campaign dispatch, subscription lifecycle, DPDP requests
│   │   │   └── cli/              # migrate, seed, jobs worker
│   │   ├── test/                 # integration tests against a real PostgreSQL
│   │   └── Dockerfile
│   └── web/                      # Website (static HTML/CSS/JS)
│       ├── index.html  app.js  v22*.js  v22.css   # UI (screens, components)
│       ├── js/api-client.js      # fetch wrapper: cookies, auto-refresh, errors
│       ├── js/v23-api.js         # integration layer: wires every screen to the API
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
| UI badge | LOCAL | STAGE (bottom-left) | none |

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
| `importNav` | 23:30 IST daily | imports NAVs from the provider (AMFI or mock), recomputes fund metrics |

Run one job on demand:

```bash
node dist/cli/jobs.js --once importNav
```

## 6. API reference (v1)

Base path: `/api/v1`. Auth uses httpOnly cookies (`ma_at` for the access token, `ma_rt` for the rotating refresh token); `Authorization: Bearer` is also accepted. Errors are returned as `{ error: { code, message, details } }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` · `/auth/login` · `/auth/logout` · `/auth/refresh` · `/auth/otp/send` · `/auth/otp/verify` · `/auth/password/forgot` · `/auth/password/reset` · `/auth/verify-email` · `/auth/oauth/google` · `/auth/oauth/apple` (501) · `GET /auth/me` |
| Me | `PATCH /me` · `POST /me/password` · `POST /me/verify-email` · `GET/PUT /me/preferences` · `PUT /me/consents` · `GET /me/notifications` · `POST /me/notifications/read` · `GET/POST/DELETE /me/watchlist[/:fundId]` · `POST /me/data-export` · `GET /me/data-export/:id` · `POST /me/deletion-request` · `GET /me/entitlements` |
| Plans & billing | `GET /plans` · `POST /billing/checkout` · `POST /billing/verify` · `POST /billing/mock/complete` (stage) · `POST /webhooks/payments` · `GET /billing/subscription` · `POST /billing/subscriptions/:id/cancel` · `GET /billing/invoices[/:id]` |
| KYC | `GET /kyc/status` · `POST /kyc/sessions` · `POST /webhooks/kyc` · `POST /kyc/mock/complete` (stage) |
| Funds & calculators | `GET /funds` (search, category, sort, paging) · `GET /funds/categories` · `GET /funds/:id` · `GET /funds/:id/nav` · `POST /calc/lumpsum` · `POST /calc/sip-compare` |
| SIP dates | `GET /sip-dates/current` · `GET /sip-dates` |
| Content | `GET /faqs` · `GET /insights` · `GET /public/activity` · `POST /assistant/messages` · `POST /support/tickets` |
| Admin — reporting | `GET /admin/metrics?from&to&granularity` · `GET /admin/recent` · `GET /admin/data/summary` |
| Admin — users & billing | `GET /admin/users` (+`format=csv`) · `GET/PATCH /admin/users/:id` · `POST /admin/kyc/:userId/decision` · `GET /admin/subscriptions` · `PUT /admin/plans/:id` · `POST /admin/payments/:id/refund` |
| Admin — SIP dates | `POST /admin/sip-dates/validate` · `POST /admin/sip-dates/publish` |
| Admin — data | `POST /admin/data/uploads` (multipart) · `GET /admin/data/uploads[/:id]` · `POST /admin/data/uploads/:id/publish` · `/discard` · `GET /admin/data/export.xlsx` · `POST /admin/data/recompute-metrics` · `GET /admin/data/schema` |
| Admin — messaging | `GET /admin/notification-templates` · `PUT /admin/notification-templates/:key` · `POST …/:key/preview` · `GET/POST /admin/campaigns` · `POST /admin/campaigns/:id/cancel` · `GET /admin/mock-outbox` |
| Admin — governance | `GET /admin/audit` (+`format=csv`) · `GET/PUT /admin/settings` · `GET /admin/integrations` · `GET /admin/data-requests` · `GET /admin/models` · `PUT /admin/models/:v/gates` · `POST /admin/models/:v/approve` |
| Ops | `GET /health` · `GET /ready` |

## 7. Security notes

- Passwords: bcrypt (cost 11).
- Sessions: access JWT for 15 min plus a rotating 30-day refresh token stored hashed. Refresh-token reuse revokes every session of that user.
- Cookies: httpOnly, `SameSite=Lax`, `Secure` on https. CORS is restricted to the website origin.
- Rate limits: global 300/min; auth endpoints 10/min; OTP 5/hour per number with 5 attempts per code.
- Webhooks: HMAC signature verified on the raw body; idempotent by event id.
- Audit log: append-only, enforced by a database trigger. Viewing a user record, exports, publishes, pricing, roles and refunds are all logged.
- Prod refuses mock providers and the default JWT secret, and rejects importing user/subscription data.
- PII: test data must stay synthetic. Data-export and deletion requests follow the DPDP Act.
