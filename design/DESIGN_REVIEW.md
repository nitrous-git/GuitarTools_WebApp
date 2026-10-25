# Guitar Tools — Stage A Visual Direction

**Status: APPROVED by product owner** (October 24, 2026). Desktop reference mockups are design targets, not a working application or exact layouts at every breakpoint.

## Approved visual system

- Professional guitarist's workstation, not a marketing hero page, learning game, or overly decorative dashboard.
- Charcoal/graphite layered surfaces, restrained **copper** interaction accent, cool muted supporting labels, clear status contrast and keyboard focus.
- Compact readable controls, minimal decorative text, strong information hierarchy and practical laptop/mobile adaptation.
- Three top-level destinations: **Tuning Library**, **Song Library**, **Tab Player**.

## Approved page compositions

1. **Tuning Library:** left preset/saved list, large central original vector headstock with per-string note/playing controls, right tuning details/editor. A single page; designed around 6, 7 and 8 strings. Stage C2–C5 will implement it.
2. **Song Library:** compact searchable table and collection navigation, selected-song details/action panel. Build in a later stage; C1 shows an honest placeholder, not simulated song data.
3. **Tab Player:** notation-first primary workspace; tracks to the left, practice settings to the right, synchronized fretboard beneath score, fixed transport at the bottom. Page and continuous horizontal notation modes. **C1 retains Stage B player controls in a simple integrated view; production player redesign comes later.**

Stage A delivered four standalone 1760×1000 visual references: `01-Tuning-Library.png`, `02-Song-Library.png`, `03-Tab-Player.png`, `04-Tab-Player-Horizontal.png`. They are distributed in a **separate design pack**, not bundled here. Some score images are cropped from user-supplied reference screenshots: do not publish or embed as app assets without appropriate rights. The app must render real notation through alphaTab, not screenshots.

## Technical and UX guardrails

- Future 6-string 3+3, 7-string 3+4, 8-string 4+4 peg designs are the proposed visual configurations; peg-to-string mapping and practical dimensions must be verified when implementing the actual headstocks.
- Use explicitly labeled semitone offset for **MIDI playback only**. Original TAB fingering, notation and fretboard positions remain unchanged.
- Active fretboard notes use warm gold/yellow; other notes from the current source measure use neutral gray.
- Responsive reflow and accessibility must take priority over pixel-perfect fixed-width screenshot matching.
