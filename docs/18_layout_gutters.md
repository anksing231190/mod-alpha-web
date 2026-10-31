# v18 — page width and horizontal gutters

## Change
- Reduced excessive left/right whitespace across public pages and authenticated/admin content.
- Increased the shared content maximum from 1,450px to 1,800px so wide desktop screens use more of the available viewport.
- Standardized equal horizontal gutters: 16–28px on desktop, 18px on tablet, and 14px on mobile.
- Reduced public navigation horizontal padding from 5.5% to a compact responsive 18–38px.
- Applied the same centered page frame to landing sections, How Mod Alpha Works, pricing, FAQ, disclosure, and footer.
- Kept the authenticated app sidebar as a separate navigation rail; the main content now uses the available width with matching left/right inner gutters.

## Validation
- CSS stylesheet parsed with no syntax errors.
- `app.js` passed `node --check`.
- Layout change is CSS-only and retains the existing component/page structure.
- A full visual browser regression test remains to be run in the user's local browser.
