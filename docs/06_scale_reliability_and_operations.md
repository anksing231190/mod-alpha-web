# 06 — Scale, Reliability & Operations

## 1. Scale assumptions

The milestones below are planning scenarios, not capacity guarantees:
- Stage A: 5,000 registered users.
- Stage B: 50,000 registered users.
- Stage C: 1,000,000 registered users.

Registered users are not the same as concurrent users. Capacity planning must use peak concurrent sessions, requests per second, chart query patterns, daily NAV rows, notification burst size and AI requests per user. Measure these before selecting final instance sizes.

## 2. Stage A — Launch / 5k users

### Topology
- One production region.
- CDN/WAF.
- 2 stateless API/frontend instances or managed autoscaling minimum.
- Managed PostgreSQL primary with automated backups/PITR.
- Redis only for measured cache/rate-limit/session needs.
- Object storage for uploads and exports.
- Managed queue and 1–2 worker pools.
- Managed secrets and centralized monitoring.

### Operational posture
- Daily NAV ingestion.
- Precompute common fund return snapshots.
- Cache popular fund pages and charts.
- Queue SMS/email campaigns; do not send synchronously inside web request.
- Basic on-call alerts and runbooks.
- Restore test before public launch.

## 3. Stage B — Growth / 50k users

- Autoscale stateless API replicas.
- Add PostgreSQL read replica for read-heavy analytics.
- Introduce connection pooling and query performance dashboards.
- Split background worker queues by workload: NAV, backtest, notifications, AI.
- Add Redis cache for hot fund data, chart series and rate limits.
- Add CDN caching for public read-only chart endpoints.
- Introduce load tests for signup bursts, fund search and notification campaigns.
- Add data freshness SLOs and payment/notification reconciliation dashboards.

## 4. Stage C — Scale / 1M users

- Multiple API and worker pools with autoscaling and queue backpressure.
- Multiple read replicas or a dedicated read/analytics store.
- Precomputed daily/monthly chart aggregates; avoid running expensive NAV calculations per page view.
- Partition NAV and event tables based on measured data volume and query plans.
- Consider a warehouse/columnar analytics platform for BI and batch research.
- Use event-driven ingestion and notifications with dead-letter queues.
- Multi-AZ database, tested failover and point-in-time recovery.
- Consider multi-region CDN and read paths; multi-region writes only with a defined consistency/ownership model.
- Dedicated SRE/security/compliance processes and vendor capacity commitments.

Do not scale by simply increasing database size. Optimize chart query shape, precompute analytics, cache results and move expensive jobs off the request path.

## 5. Performance targets (initial SLO proposals)

Targets must be validated with realistic load tests:
- Public landing page LCP: target < 2.5s at p75 on representative mobile network.
- Typical cached fund/chart API: p95 < 500ms.
- Typical uncached API: p95 < 1s where feasible.
- Interactive calculator: p95 < 2s for standard calculation.
- Admin upload validation: asynchronous for large files; show progress and final report.
- Notification queue: publish and enqueue campaign quickly; delivery SLA depends on provider and campaign size.
- Monthly availability target: start at 99.5%; move to 99.9% only with appropriate architecture and operational coverage.

## 6. Reliability controls

- Timeouts, retries with jitter, circuit breakers and bulkheads for provider calls.
- Idempotency for payments, imports and notifications.
- Dead-letter queues and replay tools with authorization.
- Database migrations backward-compatible and reversible where possible.
- Graceful degradation: fund analytics remains usable if AI provider is down.
- Cached last-known fund data labelled with stale timestamp if NAV ingestion is delayed.
- Do not show a recommendation if its required input data is stale or invalid.
- Status page and incident communications.

## 7. Backup and disaster recovery

Initial proposed objectives, to be approved:
- Database PITR and daily snapshots.
- Object storage versioning and lifecycle policies.
- Encrypted backup copy in separate account/project.
- Quarterly restore exercise at launch; increase cadence based on risk.
- Initial RPO target: 15 minutes or better where supported.
- Initial RTO target: 4 hours or better.
- Test queue recovery, payment event replay, NAV re-ingestion and notification deduplication.

## 8. Monitoring

Dashboards and alerts:
- API request rate, p50/p95/p99 latency, 4xx/5xx.
- DB CPU, connections, locks, slow queries, storage and replica lag.
- Cache hit ratio and evictions.
- Queue depth, oldest message age, retries and DLQ count.
- NAV batch freshness, accepted/rejected rows and outlier count.
- Fund chart cache age and calculation job duration.
- Payment webhook lag, duplicate events, reconciliation mismatch.
- SMS/email provider acceptance, delivery receipts, error rates and spend.
- AI requests, latency, token cost, refusal/grounding feedback and errors.
- Admin login failures, privilege changes and sensitive exports.

## 9. Cost management

- Set per-user and per-feature AI budgets.
- Cache repeat fund explanations and deterministic calculations.
- Use smaller models for classification/summarization; reserve stronger models for complex questions.
- Keep AI context minimal and avoid sending full NAV series to the model.
- Negotiate SMS pricing and monitor OTP abuse.
- Set budgets/alerts for cloud, database, logs, storage, CDN, AI and messaging.
- Produce monthly cost per active user and cost per subscriber.
