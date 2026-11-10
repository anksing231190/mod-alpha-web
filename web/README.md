# Mod Alpha — website (`web`)

Plain HTML + CSS + JavaScript (no framework, no bundler). `index.html` loads every file with a
`<script>` tag; the build (`scripts/build-web.mjs`) only copies the folder, writes `config/env.js`
and adds cache-busting `?v=` to the file names.

- **Demo mode** — no `API_BASE_URL` in `config/env.js`: everything runs in the browser on the
  bundled test workbook (`data/mod-alpha-test-data.xlsx`).
- **Live mode** — `API_BASE_URL` set (local, stage, prod): the `*.live.js` files take over and use the API.

## Folder structure (one folder per feature)

```
web/
├── index.html                 the only page; lists every script in load order (commented)
├── config/env.*.json          per-environment settings → config/env.js at build time
├── assets/                    brand images, fund house logos (assets/funds/manifest.js), xlsx library
├── data/                      bundled test workbook + blank template (demo mode)
└── src/
    ├── core/                  used by every screen
    │   ├── startup.js         MA_STARTUP(order, label, fn) — start-up steps registry
    │   ├── state.js           page elements, shared UI state, toast / modal / navigation helpers
    │   ├── format.js          dates, Indian number formats, small UI pieces (pills, selects, …)
    │   ├── icons.js           SVG icons and the α brand mark
    │   ├── router.js          #/address → screen
    │   ├── layout.js          top bar, sidebar menus, signed-in page shell, page headers, pager
    │   ├── events.js          page-wide click / change handlers that serve several screens
    │   ├── boot.js            runs the start-up steps, then draws the first screen
    │   ├── api-client.js      fetch wrapper for the API (cookies, silent token refresh)
    │   ├── live.js            live mode: shared helpers for the *.live.js files (window.MA_LIVE)
    │   ├── notifications-bell.live.js
    │   └── boot.live.js       live mode: load session + data, then draw the first screen
    ├── shared/                building blocks used by several features
    │   ├── charts.js · fund-logos.js · datepicker.js
    │   └── dataset.js (+ dataset.live.js)   the data the screens show (workbook / API)
    ├── data/demo-data.js      demo content (funds, plans, insights, FAQs)
    ├── features/
    │   ├── landing/           #/landing
    │   ├── public-pages/      #/pricing, #/faq, public footer
    │   ├── pricing/           pricing cards
    │   ├── auth/              #/login, #/signup, admin 2-code sign-in, session timeout
    │   ├── dashboard/         #/user/overview, SIP calendar, Set Reminder
    │   ├── funds/             #/user/funds (+ detail)
    │   ├── what-if/           #/user/whatif (+ live calculators)
    │   ├── sip/               #/user/sip (Mod Alpha SIP vs fixed date)
    │   ├── assistant/         AI chat panel
    │   ├── subscription/      #/user/subscription, checkout, KYC
    │   ├── settings/          #/user/settings
    │   ├── help/              #/user/help
    │   ├── theme/             light / dark theme
    │   ├── i18n/              Hindi
    │   └── admin/             dashboard · users · subscriptions · sip-date · data ·
    │                          notifications · ai-models · audit · settings
    └── styles/                base.css → app.css → theme-light.generated.css → theme-light.css
```

Inside a feature folder:
- `<feature>.js` — the screen(s): functions that return HTML and their helpers (demo + shared).
- `<feature>.live.js` — what changes in live mode (API calls). Runs only when the API is configured.
- other files — self-contained parts of that feature (e.g. `auth/session-timeout.js`).

## How the code fits together

1. Every core / shared / feature file only **defines** functions and constants (global, as before).
2. Code that must **run** when the page opens (event listeners, values read from the page) is a
   start-up step: `MA_STARTUP(order, 'label', () => { … })`. `core/boot.js` runs all steps in
   ascending order, then calls `route()` to draw the screen for the address. The numbers keep the
   original order, so steps can live next to the feature they belong to.
   In the browser console, `MA_STARTUP.list()` shows them.
3. A few screens are built in two layers and say so in their names, e.g. `renderUserPage()`
   (draws the screen) and `renderUser()` (adds behaviour around it); `shellLayout()` →
   `shellWithIcons()` → `shell()`.
4. Live mode: `core/live.js` creates `window.MA_LIVE` (API client, signed-in state `S`, helpers).
   Each `*.live.js` file reads what it needs from it and adds its own exports. They run in the
   order listed in `index.html` and must stay in that order.

## Run locally

```bash
node scripts/serve-web.mjs web 8092
```

Open `http://localhost:8092` for the demo, or use `scripts/start-local.sh` for the full app with the API.

## Routes

Public: `#/landing` (default) · `#/pricing` · `#/faq` · `#/login` · `#/signup`
Demo entry: `#/guest/user` · `#/guest/admin`
User: `#/user/overview` · `funds` · `whatif` · `sip` · `subscription` · `settings` · `help`
Admin: `#/admin/dashboard` · `users` · `subscriptions` · `sipdate` · `data` · `notifications` · `methodology` · `audit` · `settings`

---

# Version history (UI work v1–v22)

This prototype is being built against the approved visual mockups in `docs/reference-mockups/`. It includes the public website, login/signup, guest User and Admin previews, all specified user screens and all specified admin screens. All data and actions are local demo simulations.

## Run locally

```bash
cd test
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Public pages (no login)
- `/` or `#/landing` — public landing page (default route)
- `#/pricing` — pricing
- `#/faq` — public FAQ
- `#/login` and `#/signup` — demo authentication

## Guest entry points
- `#/guest/user` — user portal preview
- `#/guest/admin` — admin portal preview

## User portal
- `#/user/overview`
- `#/user/funds`
- `#/user/fund/MA001`
- `#/user/whatif`
- `#/user/sip`
- `#/user/insights` — Mod Alpha AI assistant workspace
- `#/user/subscription`
- `#/user/settings` — Profile, Preferences, Notifications, Data & Privacy
- `#/user/help`

## Admin portal
- `#/admin/dashboard`
- `#/admin/users`
- `#/admin/subscriptions`
- `#/admin/sipdate`
- `#/admin/data`
- `#/admin/notifications`
- `#/admin/methodology`
- `#/admin/audit`
- `#/admin/settings`

## Visual implementation notes
- Public landing page is the default route; visitors do not need to log in to view it.
- Design reference: `docs/11_visual_fidelity_and_page_layout.md` and `docs/reference-mockups/`.
- The user overview and admin dashboard have been rebuilt to follow the supplied reference compositions more closely: fixed left rail, workspace top bar, compact KPI cards, chart/calendar sections and operational panels.
- The public How Mod Alpha Works explainer animates five high-level stages in sequence, with a replay control and reduced-motion support. Proprietary algorithm details remain private.
- Explore Funds uses compact three-column scheme cards with sparklines and return summaries.
- Subscription follows the supplied Free / Pro / Premium pricing reference with monthly/yearly billing display.
- Profile & Settings is a dedicated page with Profile, Preferences, Notifications and Data & Privacy tabs.
- Mod Alpha AI is a conversation workspace with suggested prompts and a structured sample fund comparison. See `docs/12_subscription_profile_ai_screen_spec.md`.

## Product constraints
- No personal portfolio/holdings tracker, broker/demat integration, transaction tracking or SIP order execution.
- Initial assumption: one common SIP reminder date across all mutual funds.
- NAV data is manually uploaded by admins via Excel/CSV, with validation before publish.
- KYC is required before the first paid subscription; this prototype does not collect identity documents.
- All figures are synthetic demonstration values, not live market data or actual investment performance. Do not use sample returns as marketing claims.

## Not connected yet
Authentication/OTP, identity verification provider, payment gateway, production database, licensed NAV source, actual Excel row-level processing, email/SMS/push delivery and AI model APIs are not connected. Admin actions are local simulations only.

## Appearance and typography
- Dark theme is the default. Use the sun/moon control in the top bar or go to **Settings → Preferences → Appearance** to switch between Dark and Light. The selection persists in this browser.
- Typography uses a consistent Inter-first UI stack with DM Sans/system fallbacks, tabular numerals for financial values, and a more readable minimum size for compact labels.
- Theme and typography changes are frontend-only prototype behaviour; no backend preference sync is connected.


## Brand identity and appearance (v6)

- The supplied Mod Alpha Ventures LLP logo is integrated as the website brand mark in the public header, user/admin navigation and footer.
- Transparent PNG assets are stored in `assets/brand/`: `mod-alpha-mark.png`, `mod-alpha-ventures-light.png`, and `mod-alpha-ventures-dark.png`.
- A favicon uses the supplied brand emblem.
- Dark and light appearances use separate surface, text, border, navigation, form, chart-panel, pricing, settings, AI workspace, modal and public-page treatments. Light mode is a complete light interface rather than a few isolated color overrides.
- The selected theme is stored in browser local storage under `mod-alpha-theme`; dark remains the default. Use the top-bar theme toggle or Settings → Preferences → Appearance.
- The official lockup is displayed in the public footer; the compact emblem and wordmark are used in navigation to preserve legibility at small sizes.

All logo artwork is based on the image supplied by the user. The prototype remains local/demo-only; the theme preference is browser-local.


## Public-site polish (footer, login layout and pricing parity)

- Public landing, pricing and FAQ pages now share the same three-column footer: official Mod Alpha Ventures LLP lockup, product description/social marks, Platform links and Help links.
- The login/signup page's browser-session note is contained within the authentication card instead of rendering as a detached side element.
- Public landing pricing and the dedicated Pricing page use the same Free / Pro / Premium plan-card component, monthly/yearly switch and price calculation.
- Yearly pricing shows the discounted monthly equivalent and annual total; plan feature lists and card styling remain identical across public pricing surfaces.


## v8 visual corrections

- The public-site footer is a shared, normal-flow component used on public-facing pages (landing, login/signup, pricing and FAQ); it is not fixed/sticky and is not inserted into authenticated dashboard workspaces.
- Theme switching has been removed from public and workspace top bars. Appearance is controlled only from User Settings. The prototype is dark-only for now; the Light theme option and its stylesheet have been removed until a complete, verified light design is ready.
- The How Mod Alpha Works section has been rebuilt against `docs/how-mod-alpha-works-approved.png`: centered AI-powered heading, five numbered stages, five visual zones, glowing directional connectors, phone notification illustration, comparison graphic and five-part benefit strip.
- The public explainer uses high-level descriptions only and does not disclose proprietary model parameters or internal decision rules.
- The explainer animation reveals the five stages and connectors in sequence, supports replay, and respects reduced-motion preferences.


## v9 brand mark fix
- Fixed the oversized alpha symbol in the navigation by constraining the supplied mark to a 34px square (29px on compact mobile headers).
- Replaced the run-together all-caps navbar wording with a two-line Mod Alpha / Ventures LLP wordmark.
- Kept the full corporate logo lockup for the public footer, with explicit sizing and dark-only asset visibility.


## v10 public footer layout repair
- Rebuilt the footer using a responsive three-column CSS grid: corporate lockup/description/socials, Platform links, Help links.
- Moved copyright, disclaimer, Privacy and Terms into a distinct full-width bottom row.
- Added explicit sizing, spacing, line wrapping and mobile breakpoints to prevent inline links and footer legal text from running together.


## v11 How it works flow animation
- Replaced the faint static connector effect with animated left-to-right energy beams between all five explainer visual stages.
- Each connector uses a moving cyan particle, animated blue/violet/cyan gradient, glowing arrowhead and subtle receiving-stage pulse.
- Connectors activate in the same sequence as the stage reveal and loop continuously after activation.
- Reduced-motion preference disables continuous motion while retaining a clear connected flow.
- Added the latest supplied reference screenshot under `docs/how-mod-alpha-works-flow-reference.png`.


## v12 flowchart icon match
- Replaced placeholder Unicode characters with consistent inline SVG pictograms that match the supplied reference's visual language and semantic icon choices.
- Updated the market-data inputs, AI analysis tags, monthly date marker, notification channels and bottom benefit strip.
- No external icon font, remote image or third-party icon library is required.


## v13 flowchart icon dimensions
- Matched icon tiles, icon wells, pictogram dimensions and number badges to the reference screenshot.
- The icon containers now scale as well as the SVG artwork; they are not merely glyph substitutions.
- Responsive laptop/mobile sizes preserve alignment and prevent clipping.


## v14 footer duplicate-logo correction
- Removed the unused light-theme logo from the footer markup.
- Kept one high-contrast gold-and-white Mod Alpha Ventures LLP lockup.
- Added specific footer logo visibility rules to prevent theme image stacking.
- This restores the intended order: one logo, short description, social links; Platform and Help remain in their own columns.


## v15 How It Works flow connectors
- Replaced tiny CSS arrows with curved SVG energy streams between each explainer stage.
- Connectors are visible immediately and animate continuously; they no longer depend on scroll-triggered class timing to appear.
- Mobile layout displays vertical connector links between stacked stages.


## v16 global layout and typography normalization
- Unified public, user and admin page content widths around a 1,450px desktop reference frame.
- Normalized page gutters, heading hierarchy, body text, card headings, KPI labels, tables, settings, pricing, forms and AI chat font sizes.
- Preserved responsive behavior for tablet and mobile.


## v17 public footer rebuild
- Rebuilt the public footer with an explicit three-column content area and separate legal/disclaimer row.
- Removed duplicate-logo risk by rendering one footer logo image.
- Corrected legal text placement and responsive stacking.
- See `docs/17_public_footer_rebuild.md`.


## Run the website locally
From the extracted `test` folder:
```bash
./run-local.sh
```
Then open http://localhost:8080. If port 8080 is already in use:
```bash
./run-local.sh 8081
```


## v21 visual alignment update (31 Oct 2026)

The latest screenshots supplied on 31 Oct 2026 are now the approved visual source of truth. See `docs/assets/reference-v21/README.md` and its 11 reference images.

The v21 pass aligns the Explore Funds list, Fund Detail metrics/performance chart, What If calculator, MOD Alpha SIP comparison, dashboard chart/calendar panels, login card and How Mod Alpha Works visual flow with the supplied references. It also restores working category selection and fund pagination, preserves the local demo calculator/SIP interactions, and standardizes the navy/cyan/violet component styling.

All values remain local synthetic test data. No live NAV feed, payment gateway, authentication provider, AI model or notification provider is connected.


## v22 reference-fidelity pass (31 Oct 2026)

Screens are rebuilt to match `docs/assets/reference-v21/` (layout, Inter type scale, icon set, chart styling):

| Reference | Route |
|---|---|
| 01/04 Fund detail | `#/user/fund/QSC01` |
| 02/03 Explore Mutual Funds | `#/user/funds` |
| 05 What If calculator | `#/user/whatif` |
| 06 MOD Alpha SIP vs Traditional SIP | `#/user/sip` |
| 07 User dashboard | `#/user/overview` |
| 08 Login / signup | `#/login`, `#/signup` |
| 09 Landing hero, 11 How Mod Alpha Works | `#/landing` |
| 10 Admin dashboard (+ expandable Data Management nav) | `#/admin/dashboard` |

Implementation:
- New files `v22.js` and `v22.css`, loaded after `app.js`/`styles.css`. They replace the v21 render functions for the screens above; all other screens are unchanged.
- Inline SVG icon set (no unicode glyph icons) and a shared chart engine that scales uniformly (no stretched labels or oval data points). Charts include axes, gradients, glows, tooltips and end-value badges as in the references.
- `data.js` adds the reference fund catalogue (24 funds → 5 pages of results).
- Interactions: category chips, search (keeps focus while typing), category select, pagination, fund tabs and period buttons, What If date/amount presets with live recalculation (dd/mm/yyyy + calendar picker), SIP amount/date inputs with live recalculation, dashboard period/month controls, login validation, password reveal, email/mobile switch, admin SIP date update, notification preview, NAV file picker / drag-and-drop with type/size checks.
- Calculators are tuned so the default inputs reproduce the reference numbers (₹1,00,000 on 15/01/2021 → ₹4,44,171; ₹10,000/month SIP 2021–2026 → ₹11,71,377 vs ₹6,80,000).
- Where the reference images contradict themselves, the computed value is shown: SIP extra returns are ₹4,91,377 (+72.3%), and the SIP period is 5.0 years.

All figures remain synthetic, illustrative test data. Fund names follow the reference mock-ups, but the returns are **not** real performance.

### v22.1 landing and assistant update
- **What Mod Alpha covers:** the four feature cards now play animated previews when they scroll into view: fund search typing, the What‑If growth chart drawing, Fixed vs MOD α SIP bars growing, and an AI chat exchange. Each card has a colourful icon and a link into the feature.
- **How Mod Alpha Works:** the "Replay animation" button is removed. The sequence plays automatically when the section comes into view.
- **Pricing:** the plan cards stay within the page width, and the Monthly/Yearly switch slides, with animated price changes and the yearly total shown. Plans have colourful icons, Free shows the features it doesn't include, and there's a trust strip (no orders placed, one-time KYC, security).
- **FAQ:** a two-column layout with category filters (All / Product / Pricing & KYC / Data), an animated accordion with colourful icons, and a "Still have questions?" card. The `#/faq` page uses the same component.
- **Footer:** the social links use brand-coloured WhatsApp, X, Instagram, YouTube and LinkedIn icons.
- **Assistant:** the chat panel is larger (440×660), uses 15px text, and has suggested prompts, a typing indicator and Esc to close.
- **Button sizes:** an older global rule forced every button to 13–15px. v22 now overrides it so buttons use their intended sizes.

## v22.2 — Settings, Help & FAQ, admin pages and top bar
- **Settings:** a profile card with a completeness meter, and a side navigation with colourful icons. The Preferences tab has number-format/period pickers and theme preview cards; Notifications has channel cards and topic toggles; Data & Privacy has consent switches plus data-export and delete actions. A sticky save bar sits at the bottom.
- **Help & FAQ:** a search hero, topic cards that filter the questions, an animated accordion, and a support form with validation, a character counter and a local reference number. It also has quick links to the chat assistant and to plans.
- **Admin pages restyled** (Users, Subscriptions, SIP Date Configuration, Data Management, Notifications, AI Models & Insights, Audit Logs, System Settings). They all share the same KPI cards, filters, tables and status pills. The SIP date page has a day picker and a 4-step publishing stepper. Notifications switches the preview between Email, SMS and Push. AI Models has a live release-gate checklist. Audit Logs is a filterable timeline.
- **Top bar:** Upgrade Plan has a colourful crown. The notification bell shows an unread badge and opens a dropdown (with "mark all read"). Admins see an "Admin Console" chip instead of Upgrade Plan.

## v22.3 — Data from an Excel test workbook (no hard-coded admin numbers)
- `data/mod-alpha-test-data.xlsx` is loaded at start-up and cached in the browser (IndexedDB). It contains 24 funds, 10 years of daily NAV, 12,568 users, 3,925 subscriptions and the monthly SIP dates.
- **Calculated from that data:**
  - Admin dashboard: the four KPIs with month-on-month change and sparklines, the User Growth and Subscription Trends charts (7D/30D/3M/1Y now work), the SIP date, recent signups and subscriptions, and the data summary.
  - The Users and Subscriptions pages (searchable and paginated) and the SIP Date page.
  - Fund returns (1Y/3Y/5Y/10Y CAGR, Sharpe, NAV charts), the user dashboard KPIs and calendar, and the Explore sparklines.
- **Admin → Data Management:**
  1. Upload an `.xlsx` workbook (or a single-sheet CSV).
  2. Validation runs per sheet: required columns, types, allowed values, duplicates, cross-sheet references and future dates. Errors are listed with row numbers, and the full list downloads as a CSV.
  3. Publish the dataset (sheets in the file replace the matching sheets), or reset to the bundled data.
  4. Download the blank template, the sample data, or the active dataset.
- **Format spec for the testing team:** `docs/21_test_data_excel_format.md`.
- **Regenerate the sample:** `python3 tools/generate_test_data.py` (needs `openpyxl`).
- The spreadsheet parser (SheetJS CE 0.18.5, Apache-2.0) is vendored in `assets/vendor/`, so no CDN is needed.
- The site must be served over HTTP (`./run-local.sh`) for the bundled workbook to load. When opened as a file, the admin pages show an "upload a workbook" message instead.

## v22.5 — Branding, simplification, login, date range, pricing config, integration backlog
- **Brand:** the α mark keeps its own 530×471 aspect ratio, so it is no longer squashed. The wordmark is larger, and the nav uses bigger text. The favicon and app icon are proper squares (`assets/brand/mod-alpha-icon-*.png`). The logo shows a focus ring only for keyboard users.
- **Removed:** the Mod Alpha AI page (old `#/user/insights` links now open the chat bot), the dashboard "Ask Mod Alpha anything" box, the workspace search bar, and the profile chevron.
- **Profile:** clicking the profile name opens Settings → Profile for users, and an Admin profile card for admins.
- **Login:** a larger card (540px wide) with an animated particle-network and wave background (canvas). It respects reduced-motion settings.
- **Dashboard date-range picker:** presets plus custom dates. KPIs compare with the previous period of equal length, and the charts switch between daily, weekly and monthly buckets automatically.
- **Pricing configuration:** Manage plans / Edit plan opens an editor for monthly, quarterly and yearly prices, tagline, entitlements and whether a plan is active. It updates the public pricing. Changes are stored in this browser until the API (BILL-04) exists.
- **Integration readiness:** a catalogue of 72 live APIs/services across 11 categories, each with priority, status, UI touchpoints, API contract and provider options. It is searchable, filterable and exportable to CSV. The data lives in `v22-integrations.js`; `docs/22_integration_backlog.md` is generated by `node tools/export_integrations.js`.

## v22.6
- **Logo:** `assets/brand/mod-alpha-mark.png` is replaced by a cleaned version. The original had a large semi-transparent white glow that smeared the α on dark backgrounds; it is kept as `mod-alpha-mark-original.png`. The favicon and app icons were regenerated from the clean mark.
- **Removed:** the pricing disclaimer lines (landing and `#/pricing`), the "Important information" box, and the "View subscription details" button.
- **Feature cards:** they now use most of the page width (up to 1,720px).

## v22.8
- Public footer: the Mod Alpha α mark sits to the left of the brand block (name, description and social icons). It is 150px tall on desktop and 96px on phones.

## v22.9 — Thin hero lines and hero alternatives
- **Hero chart:** thinner lines (1.6px line, 3px points, finer light beams and waves).
- **Alternatives to compare** (open the URL; a switcher appears at the bottom of the screen):
  - `#/landing/hero-a` — current growth chart with the robot, thin lines
  - `#/landing/hero-b` — date spotlight: animated calendar with the AI-picked date pulsing, a Fixed vs AI comparison bar and a reminder toast
  - `#/landing/hero-c` — SIP comparison: two thin lines (MOD Alpha vs fixed date) that draw themselves, with end values and +72%
  - `#/landing/hero-d` — phone reminder: lock screen with the monthly notification and the best-date card
- The plain `#/landing` URL still shows A. To make another option the default, change the fallback `'hero-a'` in `v22HeroVariant()` (v22-ui.js).

## v22.10
- Hero option D (phone reminder) is now the default on `#/landing`. The preview switcher is removed. On tablets and phones the phone mockup sits below the headline and stats.
- Options A, B and C are still in the code and reachable at `#/landing/hero-a`, `#/landing/hero-b` and `#/landing/hero-c` for reference.
