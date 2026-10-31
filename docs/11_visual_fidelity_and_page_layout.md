# Mod Alpha — visual fidelity and page layout specification

## Source of truth
The approved visual references are stored in `docs/reference-mockups/`. Treat these as high-fidelity layout references, not loose inspiration. The prototype must reproduce the overall composition, hierarchy, spacing, card proportions, chart placement, typography, borders, gradients and navigation patterns while keeping the UI responsive and accessible.

## Shared design language
- Deep midnight/navy base with subtle blue-violet radial light, not flat black.
- Thin blue borders, restrained glass surfaces, soft inner highlights and controlled neon glow.
- Bright cyan/blue/violet gradients for primary actions and selected navigation.
- Green/turquoise for positive or selected states; gold for premium/payment-related accents.
- Manrope for display headings and DM Sans for UI/body copy.
- Compact, consistent labels; clear spacing rhythm; no oversized empty cards or generic default browser controls.
- Charts must be real SVG/CSS visualizations using synthetic local data, with axes/legends and sample-data disclosure.
- Avoid generic emoji-heavy interfaces; use consistent iconography and visual weights.

## Public landing page
- Public page is the root route `/`; it must not redirect to login.
- Header: logo left, Why Mod Alpha / Features / How it works / Pricing / FAQ center, Login and Get Started right.
- Hero: left aligned AI-powered SIP intelligence label, large two-line headline with cyan and violet emphasis, concise supporting copy, primary/secondary actions.
- Hero artwork: large glowing historical chart occupying the right half, subtle grid, floating data callouts and Mod Alpha robot/orb at lower right.
- Four metric blocks below hero, clearly marked as illustrative/sample if values are not live.
- Feature cards, animated five-stage explainer, pricing cards, FAQ and disclosure follow in that order.

## Login and signup
- Two-column dark composition: product story/chart on left and a compact, vertically centered authentication card on right.
- Keep Login and Signup as separate states with a visible toggle.
- Guest User and Guest Admin links must remain available in the demo.
- Authentication and KYC are demo-only until providers are integrated.

## User portal overview
- Fixed 226px left navigation rail with logo, active blue-violet gradient selection and bottom demo/exit controls.
- Main top bar contains wide search/ask field, Upgrade Plan, notification icon and profile.
- Welcome heading and contextual AI question field.
- Four KPI cards in one row: top fund, common monthly reminder date, category metric and tracked fund count.
- Primary row: wide historical fund comparison chart on left; month calendar and published date summary on right.
- Lower row: What If quick calculator, MOD Alpha vs fixed-date SIP chart, latest insights.
- This is a fund/SIP intelligence dashboard, never a personal portfolio/holdings dashboard.

## Explore Funds and Fund Detail
- Explore Funds uses search/filter/sort controls and a three-column grid of compact fund cards on desktop.
- Cards show scheme name, plan/option, category, risk label, compact sparkline, selected period return and NAV-as-of metadata.
- Fund Detail uses scheme identity header, tab row (Overview, Performance, NAV History, AI Insights, Fund Info), metric strip and a large performance chart.

## Calculators
- What If uses a two-column layout: inputs and date presets left, investment journey chart and results panel right.
- MOD Alpha SIP uses amount/date inputs at top, a wide two-series comparison chart and four result cards below.
- Inputs and outputs must be clearly marked as historical/hypothetical. Do not imply future returns or guaranteed outperformance.

## Pricing and AI assistant
- Pricing uses three visually differentiated plan cards with Monthly / Quarterly / Yearly billing selector.
- AI Insights uses a clear chat/insight layout, suggested prompts and grounded-answer disclosure. Floating assistant remains bottom-right on user-facing pages.

## Admin portal
- Separate dark admin shell with fixed left rail and main top bar.
- Dashboard composition: four KPI cards with mini trends; two side-by-side trend charts; SIP date configuration and NAV Excel/CSV upload panels; recent signups, subscriptions and data summary.
- Admin pages use consistent tables, filters, status chips, action panels and clear draft/validation/publish states.
- Never show production success for a demo action; clearly label local simulation.

## Animation: How Mod Alpha Works
- Five public stages: Market Data Collection → AI Analysis → Monthly Date Insight → Timely Notification → You Stay in Control.
- Reveal stages sequentially as the section enters the viewport; animate connectors/data arrival and a notification pop.
- Provide Replay control and honor `prefers-reduced-motion`.
- Do not disclose proprietary model logic, features, weights, scoring thresholds or implementation details.

## Data and compliance guardrails
- All values in this prototype are synthetic and must carry sample/demo context.
- Do not reproduce mockup claims such as “higher returns” as factual product claims.
- One common monthly reminder date is the current assumption for all mutual funds.
- NAV data starts with admin Excel/CSV upload and validation.
- KYC is required before a user's first paid subscription; no real identity documents are collected in this prototype.
- No personal portfolio, broker/demat holdings, transaction execution or order placement.
