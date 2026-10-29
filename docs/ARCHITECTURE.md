# Guitar Tools — Architecture

## Runtime & existing modules

Static `index.html` plus vanilla ES modules, deployable to a GitHub Pages repository subpath. `src/main.js` bootstraps `src/app/App.js` and `src/app/router.js`. Four hash routes: `#/tuning` (default), `#/library`, `#/player`, `#/drum-assistant`. `App` retains page instances. `src/ui/pages/PlayerPage.js` owns its page controls and hosts a **single, lazy** `AlphaTabAdapter`, preserving player state across navigation; leaving Player pauses audio. Tuning and Song pages evolve independently. Shared CSS: `src/styles/tokens.css`, `layout.css`, `player.css`.

`src/services/alphaTabAdapter.js` owns SDK lifecycle, file import, playback, score settings, looping, channel pitch shift and events. `src/services/fretboardModel.js` maps **original** note/string/fret data. `src/ui/fretboard.js` is a Stage B *diagnostic table*, not the production SVG fretboard.

The local SDK bundle `assets/vendor/alphatab/` is alphaTab **1.8.4 with a one-line `loadedMidiInfo` worker getter fix**; retain its license, JS module, worker/worklet, Bravura and Sonivox assets exactly unless upgrading under a separate test gate. Details: `assets/vendor/README.md`.

## Musical correctness

1. Stored guitar tuning arrays are MIDI pitches ordered by **string identity from lowest-sounding convention to highest-string convention** (index 0 = low string). Do **not sort notes by pitch**; atypical tunings may be non-monotonic.
2. alphaTab's `staff.tuning` is high-to-low. `Note.string` is 1-based low-to-high. Conventional displayed guitar string 1 is the highest string. Convert explicitly, especially for 7/8 strings and capo.
3. Playback pitch offset uses alphaTab's `changeTrackTranspositionPitch(...)` on safe melodic channels only, excluding percussion/protected channels. Do not rewrite score serialization, staff/TAB, original tuning/string/fret, or speed. Shared MIDI channel coupling remains a known limitation.
4. Fretboard positions come from the score model and playback beat/tick events, never SVG scraping or transposed MIDI note guessing. Repeats/loops use the expanded playback tick timeline. Active beat positions are not guaranteed to be sample-accurate note sustains.
5. Playback speed changes must not alter pitch; changing playback pitch must not alter speed.

## Data boundaries and future modules

The personal Tuning Library owns its own domain (`src/domain/notes.js`, `tunings.js` when implemented), using independent objects instead of alphaTab score classes. Built-in presets are immutable; a user's modification is a custom record. Stage C adds original SVG headstock controls for 6 (3+3), 7 (3+4), 8 (4+4) strings, IndexedDB storage and independent Web Audio note audition in separate steps.

Later, the Song Library will store original GP blobs plus independent user metadata, collections and backup/export. Browser storage may fail, be cleared or evicted; protect users with clear errors and portable backup. Do not implement a new engraving engine.

## Test, accessibility & deployment invariants

Keep the original `tests/model.test.mjs`, `tests/browser.test.mjs`, `tests/router.test.mjs` and `tests/shell.test.mjs` meaningful. The browser regression uses `?test` and `window.stageB`, plus certain Player control DOM IDs; preserve or explicitly migrate tests with equivalent coverage. Optional Playwright is a development-only dependency.

Use correct relative/module URLs for `.../GuitarTools_WebApp/`; worklets need HTTPS or localhost and user activation. Don't claim actual deployed Pages or native GP3/4/7/8 compatibility without evidence. Label controls accessibly, maintain focus/contrast/responsive layouts, avoid injecting untrusted metadata as HTML, and retain third-party license notices.

## Drum reference workstation

`DrumAssistantPage` retains its own shared-clock Web Audio transport and pauses it on hide. Processing excerpt, visible viewport and absolute-time hit regions are independent. Original audio and imported drum stems share a timeline; a nonnegative stem offset supports excerpt exports. Audio stays in memory and is never uploaded by this workstation. The separation-provider contract is deliberately unavailable until a real provider is integrated.

The dependency-free STFT estimator measures persistent resonant tones from 120 ms–2 s regions. A measurable lower harmonic can override a stronger overtone; noisy or unstable regions remain uncertain. Only confirmed, usable, non-outlier measurements enter a drum's median reference. These are not validated acoustic fundamentals or head-tension measurements.

Database v3 adds `drumProjects` without altering existing stores. References save labels, source fingerprints, markers, measurements and excerpts, without audio bytes. Reimport is required for playback or re-analysis; source replacement invalidates affected measurements. Existing Song Library ZIP backups do **not** include drum references.
