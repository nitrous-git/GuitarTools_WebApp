# Guitar Tools — Architecture & Invariants

Updated 2026-10-24. Distinguish **implemented Stage B** from **planned Stage C**; target module names below are guidance, not existing source until coded.

## Implemented today (`master`)

- `index.html` + `src/main.js`: one-page Stage B player test bench; currently owns all DOM and control wiring.
- `src/services/alphaTabAdapter.js`: alphaTab `AlphaTabApi` lifecycle, imports, playback, layout, looping, audio-only pitch and events.
- `src/services/fretboardModel.js`: original source note string/fret/measure mapping and MIDI-channel protection.
- `src/ui/fretboard.js`: **diagnostic table**, not the approved production vector fretboard.
- `src/styles/app.css`: prototype styling. `tests/model.test.mjs` and `tests/browser.test.mjs`: meaningful regression assertions.
- `assets/vendor/alphatab/`: **alphaTab 1.8.4 + one documented local getter fix** with ESM entry/core, worker/worklet, Bravura music font, Sonivox SF2 and separate licenses. Do not upgrade in C0–C1. Read `assets/vendor/README.md` before modification.

The POC imports files into memory (20 MiB limit); there is **no song database, tuning database or production routing yet**. Automated tests used self-authored alphaTex + SDK-generated GP7 only. GP5/GPX have successful user manual reports; additional native formats are unverified.

## Immediate target: Stage C0–C1

```
index.html                      app host (replace prototype structure)
src/main.js                     slim bootstrap
src/app/App.js                  page lifecycle, shared UI and player ownership
src/app/router.js               dependency-free hash routes
src/ui/pages/TuningPage.js      honest placeholder for C2–C5
src/ui/pages/LibraryPage.js     honest placeholder for Stage D
src/ui/pages/PlayerPage.js      existing Stage B controls integrated, one player
src/styles/tokens.css           palette/typography/spacing
src/styles/layout.css           nav, responsive shell and placeholders
src/styles/player.css           isolate/adapt Stage B player styles
src/services/alphaTabAdapter.js [PRESERVE behavior and vendor paths]
src/services/fretboardModel.js  [PRESERVE source string mapping]
```

Do not create unused empty modules to satisfy the diagram. Separate views from SDK lifecycle. Do not create a second copy of the player to keep tests passing. Make `?test` route to the integrated player with the existing `window.stageB` test adapter hook, or provide fully equivalent test coverage explicitly.

**Recommended lifecycle:** create the alphaTab adapter only on first Player navigation, keep one instance and its live DOM subtree attached when visiting other pages, pause playback when the Player becomes hidden, retain imported score, track choices, position, zoom and pitch, and refresh its layout on return after the host becomes visible. Avoid duplicate listener registration on re-entry. Only dispose it on full application shutdown if the SDK explicitly supports it. Ensure a hidden player does not continue unwanted audio.

Routing: `#/tuning` (default), `#/library`, `#/player`; `hashchange` and browser Back/Forward. Implement idempotent route transitions, focus behavior and unknown-route fallback. Routes need no server rewrites and must work under GitHub Pages `/GuitarTools_WebApp/`. The C0–C1 UI is dark graphite/charcoal with restrained copper accent, inspired by approved Stage A designs; no fake library entries or headstock controls until their stages.

## Future stages (not part of C0–C1)

- C2–C5: `domain/notes.js`, `domain/tunings.js`, original vector headstocks and interactive tuning UI, `storage/db.js`, `storage/tuningRepository.js`, tuning JSON import/export and Web Audio audition service.
- D: stored original GP Blobs in IndexedDB, song/collection metadata, duplicate detection, portable backup.
- E: production track/transport/fretboard components consuming the existing adapter/score model.

## Non-negotiable musical contracts

1. alphaTab's `staff.tuning` runs **high-to-low**. `Note.string` is **1-based low-to-high**. `position(note)` maps to conventional guitar string labels. Future tuning records use canonical MIDI pitches ordered by **string identity low-to-high**, without reordering by pitch (non-monotonic tunings are valid).
2. Import the user's original binary; do not rewrite or silently transpose it. Player pitch transposition uses `changeTrackTranspositionPitch(...)` on supported melodic MIDI channels. Staff/TAB/fret numbers and original fretboard positions remain invariant. Shared/percussion channels may be coupled or excluded.
3. Playback position, score rendering and fretboard source positions follow alphaTab's expanded tick timeline, including repeats; do not derive beats by wall-clock guesses or scrape rendered SVG.
4. Change speed without changing pitch; change synthesizer pitch without changing speed or notation. Imported score tempo changes remain meaningful.
5. Preserve licensed local font, worker, AudioWorklet and SoundFont asset resolution under a GitHub Pages subpath. Autoplay requires a direct user gesture.
6. Browser storage in later stages is not a permanent guaranteed backup: include explicit exports/imports and quota/error handling before claiming durable user library storage.

## Engineering quality

Scope asset/style selectors to page roots, use `textContent` for untrusted GP metadata, provide focusable controls and visible focus, keep responsive page widths contained, and retain portable test fixtures and automated Stage B regressions. Actual Pages deployment and platform audio remain to be verified after user push.
