# Guitar Tools — Stage A · Visual Design v1

Status: **For visual review; not implementation-approved**
Target: Desktop 1760×1000 reference compositions.

## Visual direction
- Understated professional music-workstation interface, not a promotional or game-like dashboard.
- Charcoal/graphite panels, restrained copper accent, cool grey secondary text, warmer active-note highlights.
- Tight, legible metadata; minimal ornamental graphics; persistent navigation between exactly three primary pages.
- Selected state visible via border + contrast, not color alone.

## Included screens
1. `01-Tuning-Library.png`: 6-string view of a vector concept headstock (3+3), six independent note selectors with octave, adjacent play controls, tuning list and editor on one page.
2. `02-Song-Library.png`: sidebar collections, searchable file list, prominent upload, selected song inspector and shortcuts to player/tuning.
3. `03-Tab-Player.png`: page-flow notation with 2–4 bars per line selector, track selection/mute/solo, original song metadata, synchronized fretboard and player settings.
4. `04-Tab-Player-Horizontal.png`: same reader in horizontally scrolling notation mode.

## Essential behavioral contracts for later implementation
- Headstock config for 6/7/8 strings: 3+3, 3+4, 4+4 are proposed *visual* defaults, pending approval. Every string must map to exactly one visible pitch/octave control, physical peg, and audition action.
- Notes in tuning data are MIDI note numbers with octave-specific labels; displayed notes low-to-high are unambiguous.
- The Song Library is local-first. Import actual GP binaries and preserve originals; separate user metadata and collections; include export/import backup.
- The Tab Player uses alphaTab for notation and playback, not images or custom notation markup.
- The `−2 semitones` demo means **audio-only transposition**. It must not rewrite any score pitch, tab fret, or fretboard coordinate.
- Playback fretboard: active notes in warm gold; remaining measure notes in neutral grey. The illustration is not a verified musical transcription.
- Display mode Page and Horizontal must preserve zoom, track selection, and playback position.

## Accuracy notes
- These are **static design mockups**: clicks, selectors, imports and audio are not functional.
- Song data is illustrative, derived in part from the user's screenshots and filled in with demonstration values. It is not extracted from a GP file.
- The notation illustrations are crops of user-supplied reference screenshots, not rendered by alphaTab. The final app must replace these with live, correctly parsed scores.
- The vector 6-string headstock is original UI concept art. Its silhouette and placement must be refined for the 7/8-string versions during the implementation-ready visual pass.
- The layouts are desktop-first. Mobile/tablet views are a separate responsive design pass, not represented here.

## Review decisions to resolve
1. Approve or revise the neutral charcoal + copper visual palette.
2. Approve the Tuning Library's three-column composition and size of the headstock.
3. Approve Song Library's compact table + persistent detail inspector.
4. Approve the player layout: track list left, notation middle, playback/display controls right, fretboard below notation, transport fixed at bottom.
5. Confirm the default notation view (page vs. horizontal) and whether track mixer should auto-collapse at smaller widths.

The `.html` + `.css` files are static desktop comps only. Do not use as working app logic or production-ready responsive layouts.
