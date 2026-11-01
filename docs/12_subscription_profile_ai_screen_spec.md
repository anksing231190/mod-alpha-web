# Subscription, Profile & Settings, and Mod Alpha AI — screen specification

These three screens are implemented against the user-supplied references in `reference-mockups/`.

## Subscription / Pricing
- Three plan cards: Free (₹0/month), Pro (₹299/month), Premium (₹499/month).
- Monthly / Yearly toggle; yearly pricing displays a 20% discount, expressed as a monthly equivalent billed annually.
- Pro is visually emphasized as Most Popular.
- Feature lists focus on fund discovery, charts, analytics, AI queries, historical SIP comparisons, reports, support and early access.
- Do not include portfolio tracking, holdings, broker/demat connection, or transaction tracking.
- First paid subscription requires KYC before activation; the current prototype explains this but does not collect documents.
- Pricing is synthetic test data and must not be treated as final commercial terms.

## Settings / Profile
- Dedicated user Settings page, reachable from the left navigation and the profile menu.
- Tabs: Profile (personal details, KYC, billing details), Notifications. (Preferences and Data & Privacy were removed in v23.18.)
- Profile includes name/email, Change Password action, mobile and country fields, default investment amount (₹10,000) and default SIP amount (₹5,000).
- These amounts only prefill the calculators; they do not create SIP orders or track investments.
- Preferences include default return period and theme placeholder.
- Notification settings include SIP reminder, email, SMS, in-app and optional product announcements.
- Privacy includes consent controls, data export and account deletion request placeholders.
- All save actions are local demo behaviour only; no backend persistence is connected.

## Mod Alpha AI
- Dedicated assistant workspace rather than a grid of generic insight cards.
- Left rail: new conversation, suggested prompts and recent conversation placeholders.
- Main panel: assistant identity/status, conversation thread, structured fund comparison table and composer.
- The demo comparison uses the synthetic catalogue only and labels source/as-of context.
- Assistant responses must remain grounded in available catalogue/calculation data, explain limitations, and avoid guaranteed returns or personalized investment advice.
- The proprietary SIP algorithm, parameters and scoring logic remain internal and are not exposed in chat or public content.

## Technical state
- Static frontend with synthetic local data.
- No authentication, account persistence, password changes, billing, KYC provider, AI model API, or notification service is connected.
