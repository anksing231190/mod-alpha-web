# 07 — Delivery Roadmap & Test Strategy

## 1. Recommended delivery phases

### Phase 0 — Discovery and compliance gate
- Confirm business model and intended marketing claims.
- Obtain securities-regulatory advice for paid fund analytics/SIP timing recommendations.
- Confirm NAV data provider, licence and permitted use.
- Decide auth, cloud, payment gateway, SMS provider and email provider.
- Finalize calculation methodology and baseline strategy.
- Confirm notification date rule and holiday fallback.

**Exit:** signed product scope, vendor shortlist, legal/compliance action list and approved calculation specification.

### Phase 1 — Foundation
- Design system and responsive shell.
- User signup/login and RBAC.
- Admin authentication with MFA.
- PostgreSQL schema, migrations, object storage and CI/CD.
- Audit logging, secrets, monitoring and backup.
- Fund master and NAV ingestion pipeline.

**Exit:** secure staging environment, repeatable NAV import and verified login flows.

### Phase 2 — Fund analytics
- Fund Explorer and Fund Detail.
- NAV history and return calculations.
- Category summaries and ranking.
- Chart APIs, caching and data freshness.
- Admin upload workflow with staging, validation and publish.

**Exit:** calculation outputs reconcile against independent test fixtures and sample schemes.

### Phase 3 — Simulators and SIP methodology
- What If Calculator.
- Traditional SIP baseline.
- MOD Alpha date-selection/backtest engine.
- Reproducibility and methodology versioning.
- Admin monthly SIP date configuration and maker-checker publishing.

**Exit:** no look-ahead leakage; test cases cover holidays, missing NAV, scheme inception and underperformance.

### Phase 4 — Billing and notifications
- Plans and entitlements.
- Hosted payment checkout and webhook processing.
- Invoices, renewals, cancellation and refunds.
- DLT/SMS setup, email and in-app notification.
- SIP campaign scheduling, delivery tracking and retry.

**Exit:** payment reconciliation passes; notification deduplication and consent rules verified.

### Phase 5 — AI assistant and public launch
- Retrieval-grounded AI assistant.
- AI safety and cost controls.
- FAQ/support.
- Accessibility, responsive, SEO and performance optimization.
- Security testing, penetration test, load test and legal sign-off.
- Production readiness and support runbooks.

**Exit:** launch checklist approved by product, engineering, operations and legal/compliance.

## 2. Testing strategy

### Unit tests
- NAV parsing, decimal precision, return calculations and CAGR.
- SIP cash-flow dates, unit allocation and valuation.
- Holiday/weekend fallback.
- Subscription state transitions.
- Consent eligibility and notification audience rules.
- Webhook signature and idempotency.
- RBAC permission matrix.

### Integration tests
- Data provider file formats and malformed uploads.
- PostgreSQL migrations and transaction boundaries.
- SMS/email provider sandbox and delivery callbacks.
- Payment provider test mode, duplicate/out-of-order webhooks and refunds.
- AI retrieval source attribution and prompt injection.

### Financial correctness tests
- Golden datasets with manually verified NAVs.
- Compare outputs against an independent calculation implementation.
- Verify same inputs + same methodology version produce same result.
- Verify no future data influences historical recommendations.
- Verify benchmark and scheme comparisons use matching periods and categories.
- Verify missing NAVs and holidays are not silently fabricated.
- Test both winning and losing historical windows.

### Non-functional tests
- Load tests at launch and projected 50k/1M request profiles.
- Spike test for simultaneous login and monthly notification campaign.
- Soak tests for memory/connection leaks.
- Failover and backup restore.
- Accessibility and keyboard navigation.
- Browser/device responsiveness.
- Security scans and penetration test.

## 3. Release gates

No production release unless:
- Financial methodology reviewed and approved.
- Data source and display rights approved.
- Legal/compliance review completed for features and claims.
- Payment and notification webhooks verified.
- Privacy notice and consent flows approved.
- Backup restore tested.
- Admin MFA and RBAC verified.
- Monitoring and incident runbooks ready.
- No critical/high security vulnerabilities outstanding.
