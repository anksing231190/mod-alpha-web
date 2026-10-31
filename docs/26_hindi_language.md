# 26 — Hindi (हिन्दी) version

The whole website, including the public site, sign-in, user app and admin console, can be viewed in **English** or **Hindi**.

## Switching
- **A / अ** button in the top bar, next to the theme toggle. It's on the public site and inside the app.
- **Settings → Preferences → Language**: *English (India)* or *हिन्दी*.

The choice is remembered in the browser (`localStorage['mod-alpha-lang']`) and applied before the page is shown. Switching re-renders the current page.

## What is translated
- **Interface text:** menus, buttons, headings, help text, FAQs, popups and dialogs, toasts and error messages, input placeholders and tooltips.
- **Dates and charts:** dates (`12 अक्टू 2026`, `गुरुवार, 12 नवंबर`), chart axes and tooltips, and calendar weekdays.
- **Headlines:** headlines with coloured words are re-written in Hindi word order. For example, the hero becomes "**AI** के साथ **सही समय पर** निवेश करें".

## What stays as it is
- **Data:** fund names, people's names, e-mails, IDs, amounts and numbers. Western digits are used, the usual choice in Indian finance apps.
- **Terms kept in English:** SIP, NAV, CAGR, KYC, AI, GST, AMC, ELSS and the brand name Mod Alpha.
- **Admin → System Settings → Integration readiness:** the technical backlog of vendor names and API contracts is engineering reference material, so it stays in English.

## Typography
- **Font:** **Noto Sans Devanagari** is loaded from Google Fonts and paired with Inter.
- **Spacing:** Hindi headings get taller line spacing so vowel marks aren't clipped.
- **Labels:** letter-spacing and uppercase styling are switched off for Hindi labels.

## How it works (for developers)
| File | Role |
|---|---|
| `apps/web/js/i18n-hi.js` | Dictionary for the public site, sign-in and user app. It also holds name patterns (e.g. "Welcome back, *name*") and headline blocks. |
| `apps/web/js/i18n-hi-admin.js` | Dictionary for the admin console, plus month and weekday words. |
| `apps/web/js/i18n.js` | The engine. It translates text nodes and attributes as they are rendered (MutationObserver). It adds the A/अ switch and wires the Settings language select. `MA_T('…')` translates a string from code. |

Matching order:
1. **Exact string.**
2. **Number template.** `"{n} joined this month"` → `"इस महीने {n} जुड़े"`. Numbers fill `{n}` in order; `{0}`, `{1}`… re-order them.
3. **Name pattern.**
4. **Date words.**

Anything else is shown unchanged.

**Adding a new screen or message:** add its English text as a key, with the Hindi as the value, to one of the dictionaries.

**Checking coverage:** run `node scripts/qa/truncation-audit.js "" light hi` to confirm nothing is clipped in Hindi. The contrast audit (`scripts/qa/contrast-audit.js`) works the same way in either language.

**API mode:** screens drawn from live API responses use the same English labels, so they are covered too. Any new wording returned by the API must be added to the dictionary.
