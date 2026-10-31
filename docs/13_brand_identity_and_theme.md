# Mod Alpha brand identity and theme system

## Official logo

The user-provided Mod Alpha Ventures LLP logo is the source of truth for the brand identity. The website uses:

- `assets/brand/mod-alpha-mark.png` — compact emblem for the public header, workspace sidebar, and favicon.
- `assets/brand/mod-alpha-ventures-light.png` — transparent full lockup with dark navy lettering for light surfaces.
- `assets/brand/mod-alpha-ventures-dark.png` — transparent full lockup with light lettering for dark surfaces.

The compact navigation lockup pairs the emblem with the official `MOD ALPHA` and `VENTURES LLP` wordmark. The complete logo lockup is shown in the public footer. Preserve the gold emblem and serif wordmark; do not replace it with a generic gradient letter or unrelated icon.

## Typography

Use Inter for interface text and headings, with system fallbacks. Maintain a consistent type scale, normal letter spacing for controls and body copy, modest negative tracking only for display headings, and tabular numerals for financial values. Avoid arbitrary per-card font sizes or condensed/expanded transformations.

## Theme behaviour

Dark is the default theme and preserves the approved midnight-navy, cyan and violet visual direction. Light is a complete semantic theme, not a small set of isolated overrides. It must cover:

- page canvas, navigation/sidebar, top bar and footer;
- all cards, charts, analytics panels, calendars, forms and tables;
- subscription/pricing, profile/settings, AI workspace and chat;
- menus, dialogs, toasts, inputs, disabled and hover states.

Light palette: soft neutral page canvas, white elevated surfaces, dark slate text, muted slate secondary text, subtle cool-grey borders, and the same blue/violet action accents. Charts retain their series colors and readable axes. Dark-mode-only ambient glows are subdued rather than allowed to tint the entire light page.

The selected theme is persisted in browser local storage as `mod-alpha-theme`. It is switchable from the top bar and Settings → Preferences → Appearance. Dark remains the first-visit default. Theme choice must survive route changes and refreshes.
