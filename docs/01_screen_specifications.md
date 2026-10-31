# 01 — Screen-by-Screen UX Specification

## Shared design system

- Visual direction: premium AI fintech; midnight navy/near-black backgrounds; blue, cyan and violet gradient accents.
- Cards: subtle glass-like surfaces, fine borders, restrained glow and consistent radius.
- Typography: high-legibility sans-serif; consistent numeric typography for financial figures.
- Charts: animate on first render, support hover/tap tooltips, accessible labels, clear units, visible date ranges and “data as of” labels.
- Motion: short, purposeful transitions; respect reduced-motion preferences.
- Responsive: desktop dashboard, tablet adaptation and mobile-first stacked layouts.
- AI assistant: persistent floating orb at bottom-right on user-facing pages; opens a contextual panel.
- Avoid excessive neon, decorative chart motion that obscures data, and fake live data.

## A. Public website

### A1. Landing page
**Purpose:** Explain Mod Alpha and convert visitors to signup.
- Header: logo, Why Mod Alpha, Features, How It Works, Pricing, FAQ, Login, Get Started.
- Hero: “Invest at the Right Time with AI” or approved final headline.
- Subcopy: historical mutual-fund data analysis and SIP date intelligence; state that users invest independently.
- Hero visual: animated historical-performance line, data nodes and AI orb.
- Trust/metrics strip: only verified counts and properly sourced platform statistics. No unsupported “average extra earnings” claims.
- Feature previews: Fund Explorer, What If Calculator, MOD Alpha SIP, AI Insights.
- How it works: Explore funds → understand historical patterns → receive reminder → invest independently.
- Sample charts must be labelled illustrative if not using live production data.
- Pricing preview, FAQ, support and footer disclosures.
- Activity toast: only genuine aggregate signup/subscription event, privacy-safe, opt-out and no fabricated identities.

### A2. Login / signup
- Email or mobile tab.
- Email/password or OTP flow as selected; mobile OTP for phone verification.
- Password reset, resend OTP cooldown, rate limits and abuse protection.
- Consent links: terms, privacy, communication preferences.
- Optional social login only after provider and account-linking design are approved.
- Animated charts/AI illustration in a side panel; no misleading performance promise.
- Do not request PAN/Aadhaar merely to create an account unless a documented legal requirement applies.

### A3. Pricing
- Monthly, quarterly and annual billing options.
- Feature comparison, renewal amount/date, tax treatment, cancellation and refund terms.
- Hosted checkout redirect; show payment pending until verified server-side webhook arrives.
- Restore/manage subscription and invoice history.
- Do not grant paid access based solely on browser redirect success.

### A4. FAQ / support
- Product scope, how historical returns are calculated, backtest assumptions, no trade execution, notification preferences, subscriptions/refunds, data/privacy and contact.
- Support ticket form with category, message and optional attachment; avoid collecting sensitive financial credentials.

## B. Authenticated user portal

### B1. Overview (default after login)
**This is an intelligence dashboard, not a portfolio dashboard. No personal holdings or portfolio value.**
- Welcome header and global search (“Search funds, categories, or ask anything”).
- KPI cards:
  1. Top Performing Fund — selected lookback period and return metric.
  2. Best Historical SIP Date — current month's published reminder date and methodology context; do not imply future certainty.
  3. Average Category Return — explicitly defined category, period and aggregation method.
  4. Funds Tracked — number of active schemes in the platform database.
- Main chart: Top Performing Mutual Funds; selectable 1Y/3Y/5Y/10Y and comparison series.
- Calendar: monthly SIP reminder date published by admin; show date status and other historically interesting dates only if method supports them.
- What If Calculator preview: date + amount quick inputs.
- MOD Alpha vs Traditional SIP preview: historical comparison with total invested, final hypothetical value and difference.
- Latest AI Insights: grounded, timestamped summaries with links to evidence.
- Upcoming reminder / notification status for current subscriber.
- Floating AI assistant.
- Every metric displays period, methodology and data freshness.

### B2. Explore Funds
- Search by scheme name, AMC, category and identifiers.
- Filters: category, equity/debt/hybrid, market-cap grouping where valid, plan (Direct/Regular), option (Growth/IDCW), AMC and inception/data availability.
- Sort by selected return period, risk/volatility metric (only if validated), AUM if licensed and available.
- Cards/table: fund name, category, plan/option, 1Y/3Y/5Y CAGR or absolute return with exact label, data date.
- Pagination or cursor-based loading; no huge client-side list.
- Clearly separate direct and regular plans and Growth/IDCW options.

### B3. Fund Detail
- Header: scheme name, AMC, category, plan, option, scheme identifiers.
- Tabs: Overview, Performance, NAV History, AI Insights, Fund Information.
- Performance chart with monthly/quarterly/yearly and 1Y/3Y/5Y/10Y controls.
- Return table: period, absolute return, CAGR where applicable, start/end dates and data freshness.
- NAV chart/table with date-range selector.
- Compare with benchmark/category peers only when data is available and comparison is methodologically sound.
- AI explanation with source facts and uncertainty.
- No buy/sell CTA unless separately approved by legal/compliance.

### B4. What If Calculator
- Inputs: scheme, investment date, amount, investment type (one-time), valuation date.
- Presets (e.g. 1Y/3Y/5Y ago) plus custom date.
- Results: units derived, NAV at purchase, valuation NAV, hypothetical value, absolute gain/loss, return percentage and CAGR where valid.
- Show calculation assumptions, unavailable-date handling and fees/tax exclusions.
- Use backend calculation API; do not calculate authoritative financial outputs only in browser.

### B5. MOD Alpha SIP vs Traditional SIP
- Inputs: scheme, monthly SIP amount, start date, end date, fixed SIP day for baseline, date-selection method/version.
- Compare two clearly defined strategies on same cash-flow and valuation basis.
- Chart: cumulative hypothetical value over time.
- Metrics: total contributions, final hypothetical value, difference, return metric and number of instalments.
- Explain which dates were selected and why, including constraints and data coverage.
- Show out-of-sample or walk-forward results where appropriate; label in-sample backtest distinctly.
- Prominent disclosure: historical results are not a forecast or guarantee.

### B6. AI Insights / Chat
- Suggested prompts: compare funds, explain historical returns, explain selected SIP date, summarize category trends.
- Context can include current fund/scheme, visible date range and calculator inputs.
- Retrieval-grounded answers only; cite in-product fund/NAV records and methodology version.
- No fabricated live data, personal portfolio analysis, guaranteed returns or unsupported individualized advice.
- Guardrails: answer scope, risk disclaimers, prompt injection handling, rate limits, moderation and human support escalation.
- Store conversation only under clear retention and privacy policy; provide deletion/export controls where applicable.

### B7. Subscription

- First-time subscription activation is gated on successful completion of the approved KYC/identity-verification flow. Show status, secure provider handoff, retry/manual-review state and clear privacy/consent information. Do not collect identity documents directly unless the approved legal/provider design requires it. / Account
- Current plan, entitlement, renewal date, payment history, invoices, cancel/renew/manage.
- Profile: email/mobile verification, notification preferences, sessions and account deletion request.
- Users can choose email/SMS/push preferences and opt out of non-essential communications.

## C. Admin portal (separate role-based application experience)

### C1. Admin Overview
- KPI cards: total registered users, active subscribers, conversion rate, subscription revenue.
- Trends: registrations, subscriptions, revenue, churn/refunds.
- Date range filters and timezone label.
- Recent signups, recent subscription events, data health and notification delivery summary.
- Avoid displaying user PII in dashboard summaries.

### C2. User Management
- Search by internal user ID, verified email/mobile, status and signup date.
- View profile, verification status, consent history, subscription entitlement and notification preferences.
- Suspend/reactivate with reason; account deletion workflow.
- Role changes restricted to Super Admin with MFA and audit trail.
- Export only with explicit permission and purpose logging.

### C3. Subscription Management
- Plans, prices, billing intervals, feature entitlements.
- Active, trial, past-due, cancelled, expired, refunded and disputed states.
- Payment gateway reference IDs, invoice records and webhook event history.
- Admin must not manually mark a payment successful without a reconciled payment-provider record and audited override process.

### C4. SIP Date Configuration
- One platform-wide date per month is the current proposed business rule.
- Admin selects date/month/year and sees calendar/market-holiday validation.
- Preview target audience count and notification content.
- Workflow: Draft → Validate → Preview → Approve/Publish → Schedule notifications.
- Published record is immutable; changes create a new version with reason and audit event.
- Store timezone (Asia/Kolkata), effective month, selected date, publisher, approver, status, methodology/version and notification campaign ID.
- Prevent publishing past dates, dates outside allowed month, or non-business dates unless fallback policy explicitly permits.
- Define what happens when the date is a weekend/holiday or a fund has no NAV: notify the configured date, or state a fallback business date. This must be a product decision.
- The reminder does not place or schedule an investment order.

### C5. Data Management
- Upload NAV CSV/Excel, fund master and calendar/holiday datasets.
- Upload staging area, schema validation, preview, row-level errors and duplicate detection.
- Import into staging tables; reconcile; publish atomically to production tables.
- Never partially overwrite valid production NAV history.
- Batch ID, source, file hash, uploader, timestamps, row counts, rejected rows and rollback/compensation plan.
- Fund master CRUD with maker-checker approval for production changes.
- Data freshness dashboard and failed ingestion alerts.

### C6. Notifications
- Templates, channels, consent, scheduling, retries, delivery receipts, provider response codes and suppression list.
- Campaign preview and test send.
- Idempotent campaign execution and per-user delivery deduplication.
- Do not resend OTPs or SIP reminders without policy-controlled retry.

### C7. AI / Methodology / System
- Methodology version and configuration, model/provider configuration, prompt versions, evaluation reports and cost limits.
- Publish a model/methodology version only after validation and approval.
- Audit logs, security events, feature flags and service health.
- No direct production database editing from admin UI.

## D. Navigation model

### User
Overview | Explore Funds | What If Calculator | MOD Alpha SIP | AI Insights | Subscription | Help & FAQ

### Admin
Dashboard | Users | Subscriptions | SIP Date Configuration | Data Management | Notifications | AI & Methodology | Audit Logs | System Settings

The user and admin portals share brand identity but use separate route groups and permission policies.
