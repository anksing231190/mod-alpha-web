# 02 — Proposed System Architecture

## 1. Architecture principles

- Start with a modular monolith and well-defined internal modules; split high-load services only when measured bottlenecks justify it.
- Stateless API tier, asynchronous jobs, managed database, object storage and CDN.
- Separate public/user and admin route groups; enforce RBAC and MFA for privileged roles.
- Financial calculations are deterministic backend services; AI explains results rather than inventing numbers.
- All external integrations sit behind adapters so SMS, payment and AI vendors can be replaced.
- Use infrastructure-as-code, separate environments and automated deployment pipelines.

## 2. Proposed stack (vendor-neutral)

| Layer | Initial recommendation | Reason |
|---|---|---|
| Web frontend | Next.js + TypeScript | SEO landing pages, responsive app, reusable components |
| UI | Tailwind CSS + accessible component library | Consistent design system and fast iteration |
| Charts | ECharts / Highcharts / Recharts (licence review) | Interactive time-series charts |
| Backend API | Python FastAPI or TypeScript NestJS | Typed APIs, modular services, background integration |
| Primary DB | Managed PostgreSQL | Transactions, relational entities, JSONB where appropriate |
| Cache | Managed Redis | Sessions/rate limits/cache/short-lived locks |
| Object storage | S3-compatible object storage | Raw uploads, processed files, exports, backups |
| Async jobs | Managed queue (SQS/Pub/Sub/Service Bus/RabbitMQ) | NAV ingestion, notifications, report jobs |
| CDN/WAF | Managed CDN + WAF | Static delivery, bot protection and edge caching |
| Auth | Managed identity provider or secure first-party auth | OTP, password lifecycle, MFA and sessions |
| Observability | OpenTelemetry + managed logs/metrics/traces | Troubleshooting and SLO tracking |
| Secrets | Managed secrets/KMS | No secrets in source code or config files |
| Deployment | Containers + managed app runtime | Simple operations at early scale; Kubernetes only if justified |

Do not commit to Kubernetes on day one. Use managed container services/serverless containers initially; introduce Kubernetes only if deployment, workload diversity or platform requirements justify its operational cost.

## 3. Logical services/modules

1. Identity & Access — users, sessions, OTP, roles, permissions, MFA.
2. User & Consent — profiles, communication preferences, privacy requests.
3. Fund Catalogue — scheme master, categories, AMC, plan/option and identifiers.
4. NAV Data — ingestion, validation, versioning and historical series.
5. Analytics Engine — period returns, category aggregates and fund comparisons.
6. What If Engine — point-in-time lump-sum simulation.
7. SIP Backtest Engine — fixed-date and Mod Alpha strategy simulation.
8. Recommendation Publisher — monthly date selection, review, publish and version.
9. Notification Orchestrator — campaign creation, scheduling, retries and delivery tracking.
10. Subscription & Billing — plans, entitlements, invoices and payment state.
11. AI Gateway — retrieval, model routing, grounding, safety and cost controls.
12. Admin & Audit — operational UI, RBAC, approvals and immutable audit events.
13. Support — FAQ, tickets and contact workflows.

## 4. Runtime flow

- Browser → CDN/WAF → frontend.
- Frontend → API gateway/backend API.
- API → PostgreSQL, Redis and analytics services.
- NAV source/file → object storage raw zone → queue → ingestion worker → staging DB → validation/reconciliation → production NAV tables.
- Published monthly SIP date → notification campaign record → queue → notification workers → SMS/email/push provider → delivery callbacks.
- Payment checkout → provider → signed webhook → billing event processor → subscription entitlement.
- AI request → AI gateway → permission-aware retrieval from approved fund/analytics data → model → grounded response with references.

## 5. Environments

- Local development: synthetic/test NAV data only.
- Development: shared integration environment; test payment and SMS credentials.
- Staging: production-like configuration, masked/synthetic personal data, load and UAT testing.
- Production: isolated account/project, restricted access, backups, WAF, alerting and change approval.

No production PII in developer laptops or lower environments unless explicitly approved and protected.

## 6. API surface (illustrative)

Public/user:
- `POST /v1/auth/signup`
- `POST /v1/auth/otp/request`
- `POST /v1/auth/otp/verify`
- `GET /v1/funds`
- `GET /v1/funds/{schemeId}`
- `GET /v1/funds/{schemeId}/nav`
- `GET /v1/funds/{schemeId}/returns`
- `POST /v1/calculations/what-if`
- `POST /v1/calculations/sip-backtest`
- `GET /v1/sip/recommendation/current`
- `GET /v1/subscriptions/me`
- `POST /v1/billing/checkout`
- `POST /v1/ai/chat`

Admin:
- `GET /v1/admin/metrics`
- `GET /v1/admin/users`
- `GET /v1/admin/subscriptions`
- `POST /v1/admin/sip-dates/drafts`
- `POST /v1/admin/sip-dates/{id}/publish`
- `POST /v1/admin/data-uploads`
- `GET /v1/admin/data-uploads/{batchId}`
- `POST /v1/admin/notifications/preview`
- `POST /v1/admin/notifications/campaigns`
- `GET /v1/admin/audit-logs`

All endpoints require schema validation, pagination, rate limiting, authorization and idempotency where relevant. Webhook endpoints require signature verification and replay protection.

## 7. Data delivery for charts

- Do not send millions of daily NAV rows to the browser.
- Return precomputed chart series at appropriate granularity (daily/weekly/monthly) and selected date range.
- Cache public fund chart responses by scheme, period and data-version.
- Use ETags or version IDs to invalidate cache after a successful NAV load.
- Return metadata: source, last updated, currency, period, calculation method and missing-data flags.
- Use server-side pagination for NAV tables and fund search.

## 8. Architecture diagram

See `architecture.mmd`.
