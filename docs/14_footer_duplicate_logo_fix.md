# Footer correction — duplicate logo

The footer previously included both light-theme and dark-theme logo assets inside one lockup. A later high-specificity footer image rule overrode the earlier `display:none` for the light asset, so both images stacked vertically. This caused the first dark-on-transparent logo to appear low contrast and pushed the description/social links downward.

Correction:
- Removed the unused light-theme logo from the footer markup entirely. The current release is dark-only.
- Kept the approved high-contrast gold-and-white logo.
- Added explicit selectors for the dark logo and hidden light logo as a defensive safeguard.
- Retained the existing three-column footer grid and legal row.
