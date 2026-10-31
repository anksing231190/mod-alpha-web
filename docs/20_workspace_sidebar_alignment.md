# v20 — workspace/sidebar alignment fix

## Screenshot diagnosis
The authenticated workspace sidebar is fixed to the viewport, but the main content was also laid out from the viewport's left edge. This caused the search bar, chart titles, calculator and cards to sit underneath the sidebar. At the opposite edge, wide grid children could also exceed the usable workspace width.

## Fix
- Define one shared 248px sidebar width using `box-sizing:border-box`.
- Keep the sidebar fixed on desktop.
- Offset the main workspace by exactly the sidebar width and set its width to the remaining viewport.
- Remove the old centered max-width constraint from the main workspace/page content.
- Keep the topbar full-bleed only within the workspace, not underneath the sidebar.
- Constrain dashboard grids and cards to the available width using `minmax(0, ...)`.
- Collapse the overview grids at narrower desktop widths.
- On tablet/mobile, return the sidebar to the normal top navigation layout and remove the desktop offset.

## Validation
- CSS stylesheet parse check.
- JavaScript syntax check.
- ZIP integrity check.
- Live browser visual regression is not available in this execution environment; verify the dashboard at 100%, 125%, and 150% browser zoom.
