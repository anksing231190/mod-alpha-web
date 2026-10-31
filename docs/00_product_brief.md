# 00 — Product Brief

## 1. Product vision

**Mod Alpha helps people make more informed mutual-fund SIP timing decisions using historical fund data and transparent analytics.**

The platform has three connected jobs:
1. Help users discover and understand mutual funds using historical performance analytics.
2. Let users explore hypothetical outcomes for different investment dates and compare fixed-date SIP with a date-selection strategy.
3. Send subscribers a reminder on the single common SIP date configured and published by the platform administrator for the initial release.
4. Require first-time subscribers to complete the approved KYC/identity-verification flow before subscription activation. The specific provider and verification route are subject to legal review.

The product should feel like an AI-driven fintech intelligence platform: premium dark UI, electric blue/cyan/violet accents, animated but readable charts, clear explanations, and a contextual AI assistant.

## 2. Product boundary — what Mod Alpha is and is not

### In scope
- Mutual fund discovery, categories, filters and rankings.
- Historical NAV and return analytics (monthly, quarterly, yearly, 1Y, 3Y, 5Y, 10Y where data permits).
- Date-based hypothetical lump-sum calculator.
- SIP backtesting: fixed calendar date versus a defined Mod Alpha date-selection methodology.
- Admin-controlled monthly SIP reminder date and notification campaign.
- AI explanations grounded in platform data and approved methodology.
- Subscription plans, payment lifecycle and customer support.
- Admin user, subscription, data, notification and audit management.

### Explicitly out of scope
- Personal portfolio aggregation or tracking.
- Holdings, broker/demat integrations, transaction imports or trade execution.
- Personal asset allocation, portfolio value, personal P/L or realized/unrealized gains.
- Holding customer funds or executing SIP orders.
- Claiming that a historical backtest guarantees future outperformance.

**Critical UX rule:** Do not show a portfolio dashboard or portfolio-related labels. The logged-in overview is a fund/SIP intelligence dashboard, not a personal wealth dashboard.

## 3. User roles

| Role | Description | Main access |
|---|---|---|
| Visitor | Not authenticated | Landing, public explainer, limited fund preview, pricing, FAQ |
| Registered user | Authenticated free account | Fund explorer, available analytics, calculators subject to plan |
| Subscriber | Active paid plan | Paid insights, reminders, premium analytics and support entitlements |
| Admin | Operations staff | Admin portal, users, subscriptions, SIP date, uploads and notifications |
| Super Admin | Platform owner | All admin functions, role/permission management, sensitive configuration and audit |

Roles and permissions must be enforced by the backend. Hiding a menu item is not authorization.

## 4. Core user journey

1. Visitor opens landing page and understands the product and its limitations.
2. Visitor signs up with email or mobile OTP; verifies contact channel.
3. User lands on the Mod Alpha Overview page.
4. User explores funds, opens fund analytics, uses the What If calculator and compares SIP strategies.
5. User reviews subscription plans and pays through a hosted payment checkout.
6. Payment webhook confirms subscription entitlement.
7. Admin publishes the monthly SIP reminder date.
8. Notification scheduler targets eligible, consented, active subscribers.
9. User receives an informational reminder and invests independently through their own chosen channel.

## 5. Product terminology

Use consistent terms:
- **Fund Explorer** — searchable catalogue of supported mutual-fund schemes.
- **Fund Performance** — historical returns over a selected period.
- **What If Calculator** — hypothetical investment value for a chosen date and amount.
- **Traditional SIP** — recurring investment on a fixed calendar day, with clearly stated assumptions.
- **MOD Alpha SIP** — historical backtest of the configured date-selection methodology.
- **Recommended SIP Reminder Date** — date published by admin for the month; it is a reminder, not an order.
- **AI Insight** — generated explanation based on traceable data and a versioned analysis.
- **Subscriber** — user with a valid, active entitlement.

Avoid calling a reminder date a “guaranteed best date”. Prefer “historically favourable date under the stated method”.

## 6. Data and calculation principles

- Store source NAV values with source, scheme identifier, NAV date, ingestion timestamp and file/batch provenance.
- Calculate returns from NAV values using explicit formulas and calendar conventions.
- Use total-return assumptions carefully; NAV-only returns may not include all distributions or tax effects unless the source series supports it.
- Handle weekends, exchange/fund holidays, missing NAVs, scheme mergers, plan/option differences, inception dates and stale data explicitly.
- Backtests must avoid look-ahead bias: only information available at the simulated decision date may influence that date's recommendation.
- Include transaction assumptions, SIP instalment date convention, valuation date, skipped/non-business-day handling and rounding rules.
- Version the methodology and retain inputs/results so published outputs can be reproduced.
- Show “data as of” timestamps and disclaimers on every performance page.
- AI should explain computed results; it must not invent NAVs, returns or unsupported fund facts.

## 7. Commercial model

Initial plan examples in mockups are placeholders. Final prices, taxes, renewal terms, trial policy, refund policy and feature entitlements require business approval.

Suggested entitlements:
- Free: registration, limited fund exploration and selected historical views.
- Monthly: core fund analytics and SIP reminders.
- Quarterly: core features plus expanded comparisons and insights.
- Annual: best-value plan, premium analytics and priority support.

Do not hard-code entitlements into UI components. Use database-backed plans and feature flags.

## 8. Success metrics

- Signup completion and verified-account rate.
- Active users and weekly/monthly engagement.
- Fund detail views and calculator completion.
- Subscription conversion, renewal and churn.
- Payment success/failure/refund rates.
- SIP reminder delivery, provider acceptance and failure rate.
- NAV freshness, ingestion success and data-quality error rate.
- Calculation reproducibility and chart/API latency.
- AI answer grounding rate, feedback and escalation rate.
- Support response time and security incidents.

Do not treat a fabricated “users online” toast as a real metric. Any social-proof notification must be derived from genuine, privacy-safe events and must not expose personal data.
