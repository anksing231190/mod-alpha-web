# 03 — Database & Data Model

## 1. Primary database

Use managed PostgreSQL as the transactional system of record. It is suitable for users, plans, subscriptions, notification state, fund metadata, NAV history and audit metadata.

Use object storage for raw source files, upload reports, generated exports and immutable backup artefacts. Do not store large CSV/Excel source files as database blobs.

## 2. Main entities

### Identity and access
- `users`: id (UUID), email_normalized, phone_e164, password_hash (if first-party password auth), status, created_at, updated_at, last_login_at.
- `user_verifications`: user_id, channel, destination_hash/masked destination, verified_at, provider_reference, attempt_count.
- `roles`, `permissions`, `user_roles`, `role_permissions`.
- `sessions` or managed-identity references; store refresh tokens only as hashes if first-party.
- `consents`: user_id, purpose, channel, notice_version, consent_status, captured_at, source, revoked_at.

### Plans and billing
- `plans`: id, name, billing_interval, price_minor_units, currency, tax_policy, active.
- `plan_features`: plan_id, feature_key, limit/value.
- `subscriptions`: user_id, plan_id, provider, provider_subscription_id, status, current_period_start/end, cancel_at_period_end.
- `payment_orders`: internal_order_id, provider_order_id, amount_minor_units, currency, status, idempotency_key.
- `payment_events`: provider_event_id unique, event_type, signature_valid, received_at, processed_at, payload_reference.
- `invoices`, `refunds`, `payment_reconciliations`.

Store currency amounts in integer minor units (paise), not floating-point. Never store card PAN/CVV or UPI PIN.

### Fund catalogue and NAV
- `amcs`: id, name, identifiers.
- `fund_schemes`: id, scheme_code, isin where available, amc_id, scheme_name, category_id, plan_type, option_type, inception_date, status, source_metadata.
- `fund_categories`: id, name, parent_id.
- `nav_records`: scheme_id, nav_date, nav_value numeric, source_id, ingestion_batch_id, created_at. Unique key: `(scheme_id, nav_date, source_id or canonical_source_policy)`.
- `data_sources`: source name, licence/terms reference, update cadence, permitted use.
- `ingestion_batches`: id, filename, object_key, sha256, source, uploaded_by, status, total_rows, accepted_rows, rejected_rows, started_at, completed_at.
- `ingestion_errors`: batch_id, row_number, scheme identifier, error_code, message.
- `market_calendar`: calendar_date, market, is_business_day, holiday_name, source/version.

For NAV scale, range-partition `nav_records` by `nav_date` (e.g. monthly or quarterly) when volume and query patterns justify it. Add BRIN on date for append-heavy scans and B-tree indexes on `(scheme_id, nav_date DESC)`; validate with real query plans. Avoid premature over-partitioning.

### Analytics and backtests
- `calculation_methods`: method_key, version, description, parameters_json, approved_by, approved_at.
- `fund_return_snapshots`: scheme_id, period_key, as_of_date, start_nav_date, end_nav_date, start_nav, end_nav, absolute_return, cagr, calculation_version.
- `category_return_snapshots`: category_id, period_key, as_of_date, aggregation_method, return_value.
- `sip_backtest_runs`: scheme_id, method_version, start_date, end_date, sip_amount, baseline_day, status, inputs_hash, created_at.
- `sip_backtest_results`: run_id, strategy_key, contribution_count, total_contributions, final_value, return_metrics, series_object_key or result rows.
- `sip_recommendations`: month_key, selected_date, method_version, explanation_summary, confidence_definition, status, published_by, approved_by, published_at, version.
- `sip_recommendation_candidates`: recommendation_id, candidate_date, score components, eligibility flags, evidence references.

Persist sufficient data to reproduce published backtests. Large chart series may be stored as compressed object files with database metadata/checksum; keep summary metrics in PostgreSQL.

### Notifications
- `notification_templates`: channel, template_key, provider_template_id, version, language, active.
- `notification_campaigns`: campaign_type, month_key, recommendation_id, scheduled_at, status, audience_rule_version, created_by, approved_by.
- `notification_deliveries`: campaign_id, user_id, channel, provider_message_id, status, attempt_count, sent_at, delivered_at, failure_code.
- Unique idempotency constraint: `(campaign_id, user_id, channel)` unless an explicit resend campaign is created.

### AI and audit
- `ai_conversations`, `ai_messages` with retention policy and user deletion path.
- `ai_prompt_versions`, `ai_model_configs`, `ai_evaluations`, `ai_usage_events`.
- `audit_events`: actor_id, actor_role, action, entity_type, entity_id, before/after references, reason, timestamp, request_id, source_ip/device metadata subject to privacy policy.

## 3. Database topology by growth

### Initial (5k registered users)
- One managed PostgreSQL primary with automated backups and point-in-time recovery.
- One Redis cache if required by measured session/cache/queue load.
- Object storage for NAV files and chart exports.
- Read replicas not mandatory at launch; add when read load requires them.

### Growth (50k users)
- PostgreSQL primary + one read replica for read-heavy analytics/API queries.
- Connection pooler (PgBouncer or managed equivalent).
- Redis for hot fund metadata, chart series and rate-limit counters.
- Partition NAV records if row count/query plans justify it.
- Separate worker database role and resource limits.

### Scale (1M users)
- Horizontally scale stateless APIs and workers.
- Multiple read replicas or workload-specific read stores.
- Precompute common returns and charts; cache aggressively.
- Partition large append-heavy tables and archive old operational events.
- Consider a columnar analytics warehouse for BI and heavy ad hoc analytics; keep PostgreSQL as transactional source of truth.
- Consider dedicated time-series/columnar storage only after benchmark proves PostgreSQL is insufficient.
- Multi-region read strategy only if latency/availability requirements justify the complexity; keep write ownership and consistency model explicit.

## 4. Data correctness rules

- Use decimal/numeric types for NAV and money calculations; define precision/rounding.
- Dates use ISO date; timestamps stored UTC; display Asia/Kolkata.
- Never overwrite a published NAV row silently; corrections are versioned and audited.
- Scheme identifiers must distinguish Direct/Regular and Growth/IDCW.
- Missing NAV dates must not be interpolated silently.
- Calculate return periods using actual available NAV dates and document the convention.
- All charts show as-of date and data-quality status.
- Store the source file hash and batch provenance for every imported NAV row.
