# Stage C — Production Shell and Tuning Library

**Status:** Planned, starting with **C0–C1 only**.  
**Repository:** https://github.com/nitrous-git/GuitarTools_WebApp  
**Current baseline:** latest `master` (includes Stage B); **new feature branch:** `stage-c-app-foundation`, created by the user from master.

## Goal and delivery boundaries

Stage C will eventually deliver the first finished user-facing module: the personal 6/7/8-string **Tuning Library**, alongside the preserved working Guitar Pro reader and a placeholder for a future Song Library. Visual design from Stage A is approved.

Execute Stage C as **three separate ZIP deliveries**, each followed by testing and an audit:

| Delivery | Work | Exit state |
|---|---|---|
| 1 | **C0–C1** foundation + app shell | Three navigable pages; Stage B Player still works; other pages honestly labeled placeholders |
| 2 | **C2–C3** music domain + headstock/editor | Accurate original SVG 6/7/8 peg controls, presets and tuning UI; persistence/audio not yet complete |
| 3 | **C4–C5** storage, backup, audition, QA | Usable persistent custom tuning library; correct audio preview and backup |

## C0 — Baseline safeguard

- Start from owner-created `stage-c-app-foundation` based on latest **`master`**. Inspect latest files before editing. Do not create or move branches as part of the coding delivery.
- Preserve patched, pinned alphaTab 1.8.4, its worker, AudioWorklet, Bravura/Sonivox, licenses, original fixture files, original-score pitch behavior and tracking.
- Read `docs/STAGE_B_AUDIT.md` and `docs/STAGE_B_RESULTS.md`; establish current baseline without claiming extra GP format conformance.
- Inventory Stage B test assumptions (`?test`, global `window.stageB`, IDs and expected events). Define a preservation strategy and run model/browser tests if possible.

**C0 exit:** no unrelated SDK/runtime changes; preserved ability to load the original exercise, render score, initialize audio, play and apply audio-only pitch. If anything cannot be tested, mark NOT TESTED.

## C1 — Production application shell (the first implementation assignment)

- A single static `index.html` shell using `src/main.js` bootstrap, small `src/app/App.js` and `src/app/router.js` (or equivalent clear modules). Avoid framework dependencies, complex state libraries and shadow versions of the reader.
- Three functional hash destinations: `#/tuning` **default**, `#/library`, `#/player`. Support direct hash navigation, reload, browser Back/Forward and unknown routes sensibly.
- A readable top navigation and restrained charcoal/copper palette consistent with Stage A. Accessible focus state, active destination, semantic elements and a 390px mobile fallback. Keep routes isolated from one another by page root/scoped styles.
- **Tuning route:** professionally presented Stage C2–C5 placeholder. No fake working headstock or fake saved records yet.
- **Song Library route:** honest Stage D placeholder. No mock uploads, permanent metadata or collection persistence yet.
- **Tab Player route:** retain the existing working Stage B reader, controls, diagnostics, file picker, error handling, sample and `?test` mode. Extract the prototype controller from the monolithic `src/main.js` into `src/ui/pages/PlayerPage.js` (or a comparably clear separation) without rewriting the SDK's validated algorithms.
- Single lazily-created `AlphaTabAdapter`. Keep its score and settings when switching away and back; no duplicate worker/synth or repeated listeners. Pause audio when leaving Player, then allow user-controlled resume on return. Re-render/resize after view becomes visible as needed; don't render into an unavailable root.
- Protect old Playwright selector/adapter contracts (`#score`, `#audio`, `#fretboard`, `window.stageB` on `?test`) or update tests explicitly to cover the same behavior. Retain node model tests.

**C1 exit:** repeat all three navigation routes and browser history without errors; Player can import GPX/GP5 manually, play/pause/seek, loop, change layout/zoom, use pitch-only transposition, and retain score across navigation; Stage B browser/model tests remain meaningful. Document test results in `docs/STAGE_C0_C1_RESULTS.md`.

## C2 — Tuning music domain (later delivery)

Pure modules for note MIDI numbers with octaves and string identities, immutable factory presets (6 Standard/Drop D/Drop C/DADGAD/Open G, 7 Standard B, 8 Standard F#), validation and no in-place preset edits. Store custom notes ordered **low-string to high-string**, never sort by pitch. Tests for 6/7/8, alternately tuned non-monotonic strings and accurate string-number convention.

## C3 — Original SVG Tuning Library UI (later delivery)

Implement the Stage A approved three-column Tuning page: library presets at left, original large vector headstock center, details editor right. Physical pegs and live note/octave selectors for 6 (3+3), 7 (3+4), and 8 (4+4), with correct one-control-per-string mapping, responsive controls, category/search and unsaved state. No microphone pitch tuner.

## C4 — Tuning persistence (later delivery)

Versioned IndexedDB custom tunings and categories. Built-in presets remain in code. Create/edit/rename/duplicate/favorite/delete with confirmation; unsaved edit safeguards, search/filter/sort, created/updated timestamps, safe JSON export/import with schema and collision validation. Do not falsely imply browser storage is permanent.

## C5 — Audition and Stage C regression (later delivery)

Per-string plucked-style Web Audio note preview (concert A4 = 440 Hz), Play All low-to-high, volume and cleanup. Correct low extended-range notes and user gesture rules, without mutating alphaTab audio state. Then full persistence/reload/backup/manual browser/Pages and Stage B regression checks. Stage C final report: `docs/STAGE_C_RESULTS.md`.

## Production module shape (create only what C0–C1 needs)

```
index.html
src/main.js                      small bootstrap
src/app/App.js                   routes, page ownership/lifecycle
src/app/router.js                small hash router
src/ui/pages/TuningPage.js       C1 placeholder
src/ui/pages/LibraryPage.js      C1 placeholder
src/ui/pages/PlayerPage.js       integrated Stage B UI/controller
src/styles/tokens.css            shared theme
src/styles/layout.css            shell/nav/responsive
src/styles/player.css            Stage B player styles isolated
src/services/alphaTabAdapter.js  preserve tested SDK behavior
src/services/fretboardModel.js   preserve musical mapping
assets/vendor/alphatab/          preserve as-is
```

No need to create future tuning/storage/audio modules or unused folders in this delivery. Source user state is not persisted in the current Player; do not claim it is. GitHub Pages runtime remains static, build-free, and at a repository subpath.

**Out of scope C0–C1:** actual tuner/headstock UI, IndexedDB, song library imports and binary storage, redesigned player workstation, new notation/fretboard engine, audio recording, score editing/conversion, accounts, backend, and SDK upgrades.
