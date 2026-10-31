# Public footer rebuild — v17

## Reference-matched layout
- Footer now uses the reference's simple **Mod Alpha** text wordmark, not the tall corporate logo lockup.
- The corporate logo remains available for the website's brand/header identity; it is not repeated as a large footer image.
- Brand description and five social marks are grouped in the left column.
- Platform and Help links occupy their own middle/right columns.
- Copyright, historical-performance disclaimer, and Privacy/Terms are in a distinct lower row.
- Footer spans the viewport; inner content is centered on the same 1,450px frame.
- Tablet/mobile breakpoints stack the brand, links, and legal information without overlap.

## Test results
- `app.js`: Node syntax check passed.
- `data.js`: Node syntax check passed.
- `styles.css`: tinycss2 stylesheet parse passed with no top-level parse errors.
- HTTP smoke test: `index.html`, `styles.css`, `app.js`, `data.js`, and the corporate brand image returned HTTP 200 from the local static server.
- Footer markup check: one `publicFooter()` implementation; zero footer image elements; explicit content wrapper, main grid, and legal row present.
- Full browser visual test: not completed. Chromium could not run in this execution environment (GPU/runtime startup failure), and the browser sandbox blocked navigation to localhost. Please visually verify in the target browser after replacing the source.
