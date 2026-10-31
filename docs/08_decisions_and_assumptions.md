# 08 — Decisions, Assumptions & Open Questions

## 1. Confirmed product decisions from the planning discussion

- Product name: Mod Alpha.
- Core proposition: AI-powered mutual-fund analytics and SIP timing intelligence.
- Public landing page with animated financial charts and a short product explanation.
- Login/signup using email and/or mobile.
- User portal and admin portal are separate role-based experiences.
- User portal includes Fund Explorer, What If Calculator, MOD Alpha SIP comparison, AI Insights, subscription and help.
- No personal portfolio tracking, broker/demat connection, holdings, personal portfolio value or P/L.
- Persistent floating AI chatbot on user-facing pages.
- Subscription billing options should include monthly, quarterly and yearly.
- Admin dashboard must show signup counts, subscriber counts and related operating metrics.
- Admin can configure the monthly SIP reminder date.
- Admin can upload data used by the site's charts and analytics.
- Initial planning scale: 5,000 users, then 50,000, then 1 million.
- Save project documentation and screenshots under `/docs`.

## 2. Working assumptions (not yet approved)

- One platform-wide SIP reminder date per month, shared by all eligible subscribers.
- Notification is a reminder only; Mod Alpha does not place an investment order.
- India is the initial target market; timezone Asia/Kolkata.
- Website is responsive; desktop dashboard is the primary design reference.
- PostgreSQL is the transactional database.
- Hosted payment checkout is preferred.
- Email/mobile OTP is the initial account verification mechanism.
- First-time subscribers must complete the Mod Alpha KYC/identity-verification step before subscription activation. The exact legally valid verification method, data fields, provider and retention policy must be approved with counsel; do not assume direct Aadhaar e-KYC access.
- Admin publishing uses draft → preview → approve/publish.
- NAV and related source data are manually uploaded by an administrator using Excel files for the initial release; no automated NAV provider feed is assumed.
- Initial SIP reminder configuration uses one common platform-wide date for all mutual funds. Fund-specific dates are deferred and may be reconsidered later.
- Initial implementation is a modular monolith with asynchronous workers.

## 3. Decisions required before implementation

### Product and calculation
1. **Deferred:** should a future version support fund-specific dates, or retain one common platform-wide date? The initial release uses one common date for all mutual funds.
2. Is the recommendation based on one platform-wide model, fund category, or individual scheme?
3. What does “best date” optimize: next-day/period return, volatility-adjusted return, downside risk, or a weighted score?
4. What is the fixed-date SIP baseline day (e.g. 1st, 5th, 10th)?
5. How are weekends and market/fund holidays handled?
6. Does the user choose any scheme in SIP comparison, or is the comparison platform-wide?
7. Which return periods and risk measures are approved for public display?
8. What is the source of benchmark and category data?
9. What is the exact definition of “average category return” (simple mean, asset-weighted, median, or another method)?

### Data
10. Which NAV data provider/source will be used and what commercial display/redistribution rights are granted?
11. Which fund universe is included (all schemes, active only, Direct Growth only, etc.)?
12. How frequently will data be uploaded/refreshed?
13. **Initial decision:** admin manually uploads NAV/reference data using Excel files. What automated ingestion, if any, should be considered in a later phase?
14. Who approves corrections to production NAV/fund master data?

### Commercial
15. Final plan names, prices, tax display, trial and feature entitlements?
16. Payment gateway preference: Razorpay, Cashfree or another provider?
17. Auto-renewal/mandate support required at launch?
18. Refund, cancellation, grace-period and failed-renewal policy?

### Identity, communications and compliance
19. Is email OTP, mobile OTP, or both required at signup?
20. Which channels are required for SIP reminders: SMS, email, web push?
21. What explicit consent and opt-out rules apply to each channel?
22. What legal entity will operate Mod Alpha?
23. Does the intended paid recommendation/insight model require SEBI registration or another regulated arrangement?
24. First-time subscribers must complete KYC/identity verification. Confirm the applicable legal basis, eligible provider/route, minimum data, retention and deletion rules with specialist counsel before implementation.
25. Minimum age and supported countries?

### Infrastructure and operations
26. Preferred cloud provider and region?
27. Expected peak concurrent users, page views per user and AI messages per user?
28. Required availability, RPO and RTO?
29. Who will own on-call, support, data operations and compliance approvals?
30. Is a mobile app planned, or web-only for initial launch?

## 4. Key risks

- Regulatory classification of paid fund insights and SIP date recommendations.
- Data licence/redistribution restrictions for NAV and derived analytics.
- Backtest bias or misleading performance presentation.
- SMS DLT onboarding and template/consent delays.
- Payment webhook/reconciliation errors.
- KYC over-collection or use of an unauthorized Aadhaar flow.
- Scaling costs driven by AI usage, SMS volume and chart queries.
- Misleading social proof or unverified performance claims.

## 5. Decision log

| Date | Decision | Status |
|---|---|---|
| 2026-10-31 | Mod Alpha is not a portfolio tracker | Confirmed |
| 2026-10-31 | Separate user and admin experiences | Confirmed |
| 2026-10-31 | Admin configures monthly SIP reminder date | Confirmed; scope of date still to decide |
| 2026-10-31 | Admin uploads chart/analytics data | Confirmed |
| 2026-10-31 | Plan for 5k → 50k → 1M registered users | Planning assumption |
| 2026-10-31 | First-time subscribers complete KYC before subscription activation | Product requirement; verification route subject to legal/provider approval |
| 2026-10-31 | Initial NAV/reference data updates are manual Excel uploads | Confirmed for initial release |
| 2026-10-31 | Initial SIP reminder date is common across all mutual funds | Working assumption; fund-specific dates deferred |
| 2026-10-31 | Public “How Mod Alpha Works” uses high-level five-stage animated explainer | Confirmed visual direction; proprietary algorithm details remain private |
| 2026-10-31 | Use `/docs` as project documentation home | Confirmed |


## Public landing page activity notification

The landing page includes an animated, dismissible activity toast. It consumes `GET /api/public/activity?limit=8`. The backend must return only verified, recent signup and successful subscription activation events. The frontend renders generic messages only (no names, email/mobile, precise location, or payment details), ignores events older than 48 hours, rotates slowly and hides when the browser tab is not visible.

The current static prototype has no activity API. Therefore the toast remains hidden until a real backend endpoint is connected; do not populate it with fabricated users or sample events. Confirm the applicable privacy notice/legal basis and any opt-out requirement before enabling public activity display.
