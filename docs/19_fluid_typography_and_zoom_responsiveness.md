# v19 — fluid typography and zoom responsiveness

## Changes
- Introduced fluid font scales using CSS `clamp()` so text remains proportionate across viewport sizes.
- Increased body copy, page headings, panel headings, navigation, form controls, table text, KPI values, settings labels and AI chat text.
- Increased card padding on wide screens so available canvas is used by readable content rather than oversized empty gaps.
- Added compact-desktop rules for zoomed-in browser viewports; grids collapse before their contents become cramped.
- Retained the v18 equal, minimal left/right gutters and full-width content frame.

## Zoom behavior
Browser zoom already scales CSS pixels. As the user zooms in, the CSS viewport becomes narrower and the existing responsive breakpoints reflow columns/navigation. Fluid `clamp()` sizes keep text readable at each viewport width; no CSS `zoom` or transform scaling is used, avoiding distorted hit targets and layout.

## Validation
- CSS parsed with no syntax errors.
- `app.js` passed `node --check`.
- Full visual browser regression testing remains pending.
