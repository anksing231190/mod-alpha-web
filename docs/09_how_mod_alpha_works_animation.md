# How Mod Alpha Works — approved public explainer

## Visual reference
`how-mod-alpha-works-approved.png`

## Layout
- Centered AI POWERED badge, headline and two-line explanatory subtitle.
- Five numbered stage headings in a single horizontal row on desktop.
- Five aligned visual areas: market data cards; glowing Mod Alpha AI engine; monthly date insight; phone notification and delivery channels; illustrative timing comparison.
- Four luminous directional connectors between the visual areas.
- Five-column benefits strip at the bottom.
- Responsive stacked layout for mobile and reduced-motion fallback.

## Animation
- Stage headings and visual zones reveal sequentially on scroll.
- Directional connectors illuminate between stages.
- AI engine gently floats and pulses; notification bell floats subtly; data particle travels along connectors.
- Replay Animation restarts the sequence.
- Respect `prefers-reduced-motion`.

## Public disclosure boundary
Explain only the high-level workflow. Do not disclose internal model architecture, proprietary parameters, feature weights, scoring formulas, candidate-selection logic, or implementation details. The date illustration and comparison chart are explicitly illustrative, not a return forecast or guarantee.

## Product assumptions
- One common SIP reminder date across mutual funds for the initial release.
- The published date is a reminder; Mod Alpha does not execute investments.
- NAV source data is manually uploaded from Excel/CSV in the current prototype.
