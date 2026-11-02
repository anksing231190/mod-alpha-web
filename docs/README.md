# Mod Alpha — Product & Technical Documentation

**Version:** 0.1 (planning baseline)  
**Prepared:** 31 October 2026  
**Status:** Product concept documented; architecture is a proposed baseline, not an implementation.

This folder is the working source of truth for the Mod Alpha website concept, UX screens, operating model, infrastructure, data model, integrations, security/compliance gates, and scale plan.

## Product definition

Mod Alpha is an AI-assisted mutual-fund analytics and SIP-timing intelligence platform. It analyses historical mutual-fund NAV behaviour and calendar constraints, provides fund analytics and hypothetical investment calculators, compares a fixed-date SIP with a historically selected date strategy, and sends a configured SIP-date reminder to subscribers.

**Mod Alpha does not track users' personal portfolios, holdings, broker accounts, demat accounts, transactions, or personal investment P/L.** It does not place trades or move customer money.

## Contents

| File | Purpose |
|---|---|
| `00_product_brief.md` | Vision, scope, personas, product rules and terminology |
| `01_screen_specifications.md` | Screen-by-screen requirements for public, user and admin portals |
| `02_system_architecture.md` | Proposed architecture, services, environments and deployment topology |
| `03_database_and_data_model.md` | PostgreSQL model, time-series NAV storage, indexes and retention |
| `04_integrations.md` | SMS/OTP, email/push, payment gateway, KYC/identity and data providers |
| `05_security_privacy_and_compliance.md` | Security, privacy, consent, financial-regulatory review gates |
| `06_scale_reliability_and_operations.md` | 5k → 50k → 1M scale stages, SLOs, monitoring, backups and DR |
| `07_delivery_roadmap_and_testing.md` | Phased implementation plan, acceptance criteria and test strategy |
| `08_decisions_and_assumptions.md` | Open decisions, assumptions, risks and decision log |
| `09_how_mod_alpha_works_animation.md` | Approved public-facing explainer direction and animation requirements |
| `architecture.mmd` | Mermaid system architecture diagram |
| `assets/screenshots/` | Generated visual design concepts captured during planning |

## Important implementation caveats

1. All figures shown in the mockup screenshots are illustrative only. They are not validated fund returns, live users, revenue, NAV records, or model outputs.
2. Do not advertise “extra returns”, “best date”, “confidence”, or performance uplift until the methodology is validated, reproducible, and appropriately qualified.
3. Before launching paid fund insights or recommendations in India, obtain specialist legal advice on the applicable SEBI framework (including whether the service constitutes investment advice, research analysis, or another regulated activity). Product disclaimers alone do not determine regulatory status.
4. First-time subscribers must complete KYC/identity verification before subscription activation as a product requirement. The legal basis, permitted verification route, provider and minimum data must be confirmed with specialist counsel; any Aadhaar-based verification must use an authorised, consent-based route.
5. The platform should never store raw card data, CVV, UPI PIN, Aadhaar number, or Aadhaar OTP.
6. This documentation describes a proposed cloud-neutral architecture. Select a cloud, vendors, data licence and final sizing after load tests, vendor due diligence and legal review.

## Screenshot index

- `01_initial_visual_direction_collage.png` — initial landing/login and public marketing direction.
- `02_expanded_user_screens_collage.png` — public site, fund explorer, fund detail, calculators, pricing and AI chat.
- `03_logged_in_user_overview.png` — proposed user landing dashboard after login; no personal portfolio tracking.
- `04_detailed_user_journey_collage.png` — expanded user journey and screen family.
- `05_admin_dashboard_concept.png` — separate admin operations dashboard.
- `06_how_mod_alpha_works.png` — approved public-facing five-stage explainer visual; implement as an accessible animation per `09_how_mod_alpha_works_animation.md`.

## Suggested working convention

Keep this directory in the project repository as `/docs`. Update the version/date and decision log whenever scope or architecture changes. Screenshots are design references; approved Figma/design-system source files should be added when available.
- [27 · Backup and recovery](27_backup_and_recovery.md)
- [28 · Stage deployment (step by step)](28_stage_deployment.md)
