# Guitar Tools — Stage C: Application Foundation + Tuning Library
Status: Proposed for approval, 2026-10-24
Start: new branch `stage-c-app-foundation` from `stage-b-alphatab-poc` HEAD (`e49436ea1b26c8a8fb6d6d2b693519c654c59e68` at audit time; confirm latest head before branching).

## Goal
Deliver the first usable, polished Guitar Tools module — **one-screen Tuning Library** — inside a resilient, minimal three-page application shell. Keep Stage B's functional tab reader accessible and non-regressed; leave Song Library as a clearly labeled next-stage empty-state shell. Match the approved Stage A charcoal/copper desktop visual direction without trying to build the entire song library/player UI now.

## Work split (one small Astra deliverable at a time)

### C0 — Foundation safeguard / baseline (small)
- Branch from Stage B head. Preserve vendored alphaTab and patch, licenses, alphaTex and GP7 test fixtures.
- Archive `docs/STAGE_B_RESULTS.md` as evidence; annotate user manual GPX/GP5 confirmations without altering automated results. Correct branch references to `master`.
- Establish smoke test baseline and map Stage B DOM/test selector dependencies before replacing markup. No functionality regressions.
**Gate:** Stage B sample renders and audio+pitch smoke tests still work in new branch before UI redesign.

### C1 — Production application shell (UI infrastructure)
- Desktop top navigation: **Tuning Library / Song Library / Tab Player**. Use simple `#/tuning`, `#/library`, `#/player` hash routes for GitHub Pages static hosting; browser back/forward and direct hash loads work. Default to Tuning Library.
- Modular `App.js`, `router.js`, `TuningPage.js`, `LibraryPage.js`, `PlayerPage.js`. Theme tokens & components in small CSS files; no new framework or Vite.
- Player route initially wraps the existing Stage B player controls, with all behavior available. Keep one alphaTab adapter lifecycle managed lazily; do not create synthesizer instances on every navigation. Re-measure and call layout/resize as needed when entering after hidden state. Cleanup listeners correctly.
- Song Library route is an explicit 'next stage' empty state, not a fake imported catalog.
- Keyboard-visible focus, readable desktop and responsive navigation; initial mobile fallback (390px) without entire-page horizontal overflow.
**Gate:** switch 3 routes repeatedly without console errors, broken audio or import and without losing the currently loaded player score unnecessarily.

### C2 — Pure music/tuning domain (logic first)
- `notes.js` defines MIDI pitch numeric conversion, sharps/flats display rules, octave labels, note validation and low-to-high ordering. Store 6/7/8 `notesLowToHigh[]`. Never sort pitches: non-monotonic tunings are valid.
- Immutable factory presets (not user records): 6 Standard E, Drop D, Drop C, DADGAD, Open G; 7 Standard B; 8 Standard F#. Add additional presets only when musically validated.
- `tunings.js` creates validated new records, duplicate/edit/preset clone; custom data `{id,name,stringCount,notesLowToHigh,categoryIds,description,favorite,createdAt,updatedAt}` with schemaVersion 1 as backup payload. Built-in presets are not editable/deletable in place; editing a preset requires Save As a new user record.
- String mapping functions: stored array 0 = lowest sounding string; conventional guitar string 1 = highest; each visible peg has a unique physical anchor. Any alternate drop/open tuning that is not monotonic must still preserve assigned strings.
**Gate:** unit tests for 6/7/8 string ordering, MIDI note→label (with octave), preset correctness, physical peg mapping, invalid data rejection, and no in-place preset mutation.

### C3 — High-fidelity Tuning Library UI
- Follow Stage A approved `01-Tuning-Library` screenshot: compact left tuning/preset library, prominent center SVG headstock, right editing and detail inspector. Charcoal surfaces and restrained copper states.
- Author **original SVGs**, responsive and crisp, for 6-string 3+3, 7-string 3+4, 8-string 4+4. Avoid branded real-guitar logos and copyrighted headstock silhouettes. All pegs and guitar strings must be visually correct — no six-control mockups in 7/8 modes.
- Each string has a nearby editable note+octave dropdown, audition action, clear string label. Controls/peg count and mapping derive from same configuration object. Visual string paths connect to actual tuning pins.
- Functional preset chooser, mode 6/7/8, custom tuning form, search and category/filter/sort, create/edit/clone/delete, unsaved changes indicator. Do not add microphone tuner, auto-detection, learning gamification or a separate tuning editor page.
- Responsive fallback: compact laptop layout and mobile stacking or scroll where appropriate; headstock/peg controls must not overlap. No forced desktop 1760px layout.
**Gate:** all 6/7/8 pegs and pitch selectors work; no invisible/unreachable controls, good readability at 1280px desktop and 390px mobile; keyboard controls are labeled and reachable.

### C4 — Local-first persistence and data protection
- IndexedDB repository with versioned schema; factory presets remain in code and user tunings/categories are stored as records. Store preferences separately if needed. Creation/updates must be transactional; surface storage errors honestly.
- Load, save, rename, duplicate, favorite, delete confirmation, date labels, search/filter/sort, and prompt on discarding unsaved edits when changing preset/string count/navigation.
- Manual JSON export/import of **user tuning records, categories and relevant settings** with manifest version and validation. Clear merge/skip strategy for colliding IDs; don't let malformed import erase existing data. Save import/export dialogs simple and accessible. A full ZIP backup including song binaries belongs to the Song Library stage.
- Use local storage only for nonessential small UI settings if any; don't store records solely in localStorage. Private browsing/quota failures get visible messages.
**Gate:** save a custom 8-string tuning, reload application and see exactly the same string configuration; restore backup in another browser profile; rejection of invalid backup preserves existing data.

### C5 — Per-string note audition and final Stage C QA
- Separate lightweight `tuningAudio.js` using Web Audio API; resume context only in click/user gesture; produce a short plucked-style preview and master volume. Keep correct pitch (MIDI note with A4=440 Hz), simultaneous activation/race handling and no stuck notes. If choosing SoundFont reuse, demonstrate it never mutates player settings or starts a second expensive player instance.
- 'Play all strings' low→high with short gaps; stop/cleanup on route exits. Test laptop/mobile audio permissions; no microphone.
- Regression: Stage B original and generated GP fixture, pitch -2/0/+2, page/horizontal, import, seek, loop, mute/solo, long-load errors. Ensure lazy player access doesn't break worker paths under GitHub Pages subpath. Show no errors on navigating between tuner and player.
**Gate:** first fully functional Tuning Library matches visual direction, auditions accurately, persists and restores data, existing player works; all tests and limitations documented in `docs/STAGE_C_RESULTS.md`.

## Proposed layout and naming
```
index.html
src/
  app/App.js
  app/router.js
  domain/notes.js
  domain/tunings.js
  storage/db.js
  storage/tuningRepository.js
  storage/tuningBackup.js
  services/tuningAudio.js
  services/alphaTabAdapter.js      [retain tested implementation]
  services/fretboardModel.js       [retain tested mapping]
  ui/pages/TuningPage.js
  ui/pages/LibraryPage.js
  ui/pages/PlayerPage.js
  ui/components/Headstock.js
  ui/components/TuningList.js
  ui/components/TuningEditor.js
  ui/fretboard.js                 [legacy diagnostic or later replacement]
  styles/tokens.css
  styles/layout.css
  styles/tuning.css
  styles/player.css               [until redesigned]
assets/vendor/alphatab/            [do not upgrade]
tests/tunings.test.mjs
... existing Stage B fixtures / browser tests ...
```
Names are a guide; preserve modularity rather than create unused empty files. No heavy router/state-management library.

## Strict boundary
**Stage C includes the app shell + completed Tuning Library only.** It does *not* include Song Library imports, collection management, embedded GP file persistence, complete player visual redesign, editing/conversion, account system, cloud sync, microphone-based detection or final advanced fretboard effects. The Stage B player remains usable on the Player route pending a later production visual integration.

## Delivery approach
- Astra Medium for architecture and integration; use small specialist tasks only for isolated CSS/SVG or tests if supported and economical.
- Ship one testable substage at a time. ZIP of complete modified/new files with repository-relative paths, no Git writes, no migration scripts, user pushes and merges.
- For new Stage C branch, branch from latest `stage-b-alphatab-poc`, **not** default `master` unless user has merged Stage B first.
- Add focused tests rather than expanding documentation. Report objective evidence, not screenshots of untested interactions.
