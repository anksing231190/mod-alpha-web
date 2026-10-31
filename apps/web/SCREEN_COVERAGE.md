# Mod Alpha prototype screen coverage

| Area | Screen | Route |
|---|---|---|
| Public | Full public landing page (default `/`, no login required) with nav, hero, features, pricing preview, FAQs and disclosures | `/` or `#/landing` |
| Public | Animated five-step How Mod Alpha Works explainer with replay and reduced-motion support | `#/landing` → How it works section |
| Public | Login | `#/login` |
| Public | Signup | `#/signup` |
| Public | Pricing | `#/pricing` |
| Public | FAQ | `#/faq` |
| User | Intelligence overview | `#/user/overview` |
| User | Explore Funds + search/filter/sort | `#/user/funds` |
| User | Fund detail: Overview, Performance, NAV History, AI Insights, Fund Information | `#/user/fund/MA001` |
| User | What If Calculator | `#/user/whatif` |
| User | MOD Alpha SIP vs Traditional SIP | `#/user/sip` |
| User | AI Insights + suggested prompts | `#/user/insights` |
| User | Subscription, plans, KYC gate, account, preferences | `#/user/subscription` |
| User | Help, FAQ, support request | `#/user/help` |
| Admin | Admin dashboard | `#/admin/dashboard` |
| Admin | User management + filters + detail modal | `#/admin/users` |
| Admin | Subscription management + plans | `#/admin/subscriptions` |
| Admin | Common monthly SIP date configuration | `#/admin/sipdate` |
| Admin | Excel/CSV NAV upload validation demo | `#/admin/data` |
| Admin | Notification templates + campaigns | `#/admin/notifications` |
| Admin | Internal AI/methodology governance | `#/admin/methodology` |
| Admin | Audit logs | `#/admin/audit` |
| Admin | System settings + integration readiness | `#/admin/settings` |

All routes can be opened directly by entering the hash route after the site URL. Guest entry points are available on the login page for both user and admin.

## Reference-layout implementation pass (v3)

The current test build has an additional high-fidelity styling pass for the following reference compositions:
- Public landing hero, navigation, metric strip, feature cards and How Mod Alpha Works explainer.
- Login/signup two-column layout with guest entry cards.
- User overview: fixed left navigation, workspace search header, four KPI cards, performance chart, monthly date calendar, What If quick calculator, SIP comparison preview and insights.
- Explore Funds: three-column scheme cards with return sparklines.
- Admin dashboard: four KPI cards, growth/subscription charts, SIP date configuration, NAV upload panel, recent signups/subscriptions and data summary.

The remaining detailed screens are retained and use the same shared navy/cyan/violet design system. Compare the rendered pages against `docs/reference-mockups/` at desktop width (1536px) and mobile width before treating the visual pass as final.


## Latest reference-driven screens (31 Oct 2026)
- Subscription / Pricing: Free, Pro and Premium plan cards; monthly/yearly switch; first-subscription KYC notice.
- Profile & Settings: Profile, Preferences, Notifications, Data & Privacy tabs; profile fields and default calculator amounts.
- Mod Alpha AI: assistant conversation workspace, suggested prompts, sample fund comparison table and grounded-data disclaimer.
- Original screenshots are preserved in `docs/reference-mockups/` and detailed requirements in `docs/12_subscription_profile_ai_screen_spec.md`.


## v21 screenshot alignment status

| Reference screen | v21 implementation |
|---|---|
| Explore Mutual Funds | Screenshot-aligned filter/search row, category chips, compact ranked rows, sparkline, return value and pagination |
| Fund Detail | Screenshot-aligned title/tags, watchlist action, five metrics, period controls, performance chart and summary strip |
| What If Calculator | Screenshot-aligned investment date/amount selectors, journey chart, results and AI insight panel |
| MOD Alpha SIP vs Traditional SIP | Screenshot-aligned monthly amount/date controls, two-series comparison chart and final results |
| User dashboard | Updated KPI, multi-series fund performance chart, published-date calendar and three insight/calculator panels |
| Login / Signup | Centered dark authentication card, email/mobile switch, social login placeholders and guest entry links |
| How Mod Alpha Works | Five-step flow, icon sizing, matching stage labels and animated connector paths |
| Admin dashboard | Existing local demo admin workspace retained with consistent v21 panel tokens |

Visual references are stored in `docs/assets/reference-v21/`. Exact chart values and example metrics are still illustrative; production NAV calculations and third-party services are intentionally not connected.
