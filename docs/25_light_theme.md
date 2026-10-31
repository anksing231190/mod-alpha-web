# 25 — Light theme "Sand" (beige + cream)

The site now has two themes:
- **Midnight** — the original dark theme, and still the default.
- **Sand** — a light theme in beige and cream.

## Switching theme
- Use the **sun/moon button** in the top bar. It's on the public site and inside the app, for users and admins.
- Or go to **Settings → Preferences → Appearance** and choose *Midnight* or *Sand*.

The browser remembers the choice (`localStorage['mod-alpha-theme']`). It is applied before the first paint, so the page doesn't flash.

## Palette
| Token | Hex | Used for |
|---|---|---|
| page | `#f4ecdd` | page background (beige) |
| page2 | `#efe4cf` | footer and bands |
| card | `#fffaf1` | cards (cream) |
| card2 | `#fbf4e7` | inner panels and inputs |
| line / line2 | `#e4d6bf` / `#d6c3a3` | hairlines, control borders |
| text | `#2b2118` | headings and body text (espresso) |
| sub / muted | `#5c4b3b` / `#8a7560` | secondary text |
| caramel | `#a8692f` (deep `#7f4b22`) | primary accent, active nav, primary buttons |
| plum | `#8e4a6c` | second chart series, gradient end |
| sage | `#5a7d43` | positive values, success |
| terracotta | `#b4472f` | negative values, errors |
| ochre | `#b98019` | warnings, upgrade chip |
| teal | `#3f7c79` | third chart series |

### Charts
Series colours follow the dark theme's order, so meaning carries across themes:
- blue → caramel
- violet → plum
- cyan → teal
- green → sage
- red → terracotta
- amber → ochre

Gridlines are `#eadcc5`. Tooltips are cream cards with a soft shadow.

### Icons
The colourful icon tiles keep their original colours in both themes.

## How it is built
| File | Role |
|---|---|
| `apps/web/js/theme-palette.js` | One colour-mapping function: dark colour → Sand colour, by what the colour is used for (surface, text, border, shadow, chart). |
| `scripts/build-light-theme.mjs` | Reads `styles.css` and `v22.css` and re-emits every colour declaration under `html[data-theme="light"]`. Writes **`apps/web/theme-light.css`**, which is generated, so don't edit it by hand. |
| `apps/web/theme-light-design.css` | Hand-designed refinements: sidebar, buttons, inputs, tables, tooltips, toggle, upgrade chip, login. |
| `apps/web/js/theme.js` | The toggle and the Appearance cards. Re-colours charts drawn at runtime (SVG `fill`/`stroke`/`stop-color`, legend dots) and restores them when you switch back. |
| `apps/web/v22-ui.js` | The animated login background uses Sand colours in light mode. |

**After changing `styles.css` or `v22.css`**, regenerate the light theme. `npm run build` also does this automatically.
```bash
npm run theme:build
```
