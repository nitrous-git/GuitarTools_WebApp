# Guitar Tools — Stage C0–C1: Production Application Foundation

**Act as:** lead developer for a browser-based guitar/music workstation, expert in vanilla JS applications, alphaTab lifecycle, music playback, accessibility and static GitHub Pages deployment.

**Repository:** https://github.com/nitrous-git/GuitarTools_WebApp  
**Source branch:** `stage-c-app-foundation`, created by the user **from latest `master`**.  
**Scope:** **C0 baseline safeguard + C1 production application shell only**. Do **not** implement C2–C5 Tuning Library yet.

## 1. Preparation and cost discipline

1. Inspect the actual `stage-c-app-foundation` head. Confirm Stage B files match the new `master` baseline, not the obsolete `stage-b-alphatab-poc` base. If user has not created the branch, work from current master source for analysis/output only; **do not create or modify any remote branch**.
2. Read `AGENTS.md`, `docs/STAGE_C_ACCEPTANCE.md` and relevant `docs/ARCHITECTURE.md`. Consult `docs/STAGE_C_PLAN.md`, `docs/STAGE_B_AUDIT.md`, `design/DESIGN_REVIEW.md` and `README.md` only for focused decisions.
3. Inspect only source needed for extraction/refactor: `index.html`, `src/main.js`, `src/styles/app.css`, `src/services/alphaTabAdapter.js`, `src/services/fretboardModel.js`, `src/ui/fretboard.js`, `tests/model.test.mjs`, `tests/browser.test.mjs`, and asset path configuration. Avoid reading the multi-megabyte `alphaTab.core.mjs` in full.
4. Run original model/browser regression first if environment permits, document which ones ran. Do not report historical Stage B tests as newly run.

**Guiding rule:** protect the existing technically correct reader; change the UI hosting and lifecycle around it, not its audio and music engine.

## 2. C0 — Preserve tested baseline

- Keep `assets/vendor/alphatab/` **byte-identical**, including alphaTab 1.8.4 ESM, patched `loadedMidiInfo` getter, Web Worker, AudioWorklet, Bravura, Sonivox and license notices. No SDK upgrade, CDN substitution or bundler.
- Preserve imported-score semantics, format support, `changeTrackTranspositionPitch` behavior, source fret/string mapping, tempo, loop occurrence logic, SoundFont user-gesture activation and error handling.
- Preserve existing Stage B fixtures and tests; account for `?test`, `window.stageB`, score DOM IDs and events rather than removing coverage.
- Use `master` as stable/default branch in documentation. Do not claim genuine Pages/GP-version coverage beyond tested evidence.

## 3. C1 — Three-page app shell

Build a responsive **single-page application shell** with exactly three routes:

- `#/tuning` — default/home: professionally styled, **honest** "Tuning Library coming in C2–C5" empty state; no fake presets, editable pegs, storage or audition controls.
- `#/library` — honest Song Library "planned for Stage D" empty state; no fake imports or data.
- `#/player` — **fully functioning** integrated Stage B alphaTab player, using the existing score view, import, metadata, page/horizontal layout, bars-per-row, zoom, local SoundFont playback, transport, mute/solo, speed, loop, seek, audio-only transpose, selected-track fretboard diagnostic, diagnostic messages and file errors.

Use a small dependency-free hash router: default to Tuning, support direct links/reload, browser Back/Forward, navigation to the same route repeatedly and unknown hashes without a blank UI. Route name and active nav are accessible to keyboard and screen-reader users. Use no server rewrite.

### Visual direction

Match the **approved Stage A theme** where it applies: charcoal/graphite, copper accent, understated controls, clean typography, compact top nav, no heavy hero marketing content. Implement real responsive behavior at 1280px desktop and 390px mobile, with no full-document horizontal overflow. Keep horizontal scroll within notation/fretboard as needed; focus and active states visible.

**Do not build the final Tuning headstock, Song table or redesign the Tab Player into the full high-fidelity workstation yet.** C1 establishes shared UI structure, not the full product interface.

### Module responsibilities (adapt to actual source)

- `src/main.js`: small bootstrap only.
- `src/app/router.js`: route parsing/history/hashchange and route state.
- `src/app/App.js`: shell nav, active route, page creation and lifecycle.
- `src/ui/pages/TuningPage.js`: truthful placeholder.
- `src/ui/pages/LibraryPage.js`: truthful placeholder.
- `src/ui/pages/PlayerPage.js`: Stage B player UI/controller separated from bootstrap, **reusing** the tested adapter, without duplicating its implementation.
- `src/styles/tokens.css`, `src/styles/layout.css` and scoped player CSS: isolate styles and prevent global prototype selectors breaking the shell.

Don't create empty future tuning/persistence modules or introduce a framework/state library.

## 4. Critical Player lifecycle requirements

- **Create only one** `AlphaTabAdapter`/synth/worklet lifetime per application session, ideally lazily when Player is first opened.
- Preserve the live player DOM subtree and adapter state when switching pages: imported score, selected track, position, page/horizontal layout, zoom, playback speed, pitch offset, mute/solo and any current loop where practical.
- On leaving Player, **pause playback** so hidden audio does not continue. On return, allow explicit user resume; no automatic playback. Ensure layout is refreshed/resized after the player container becomes visible when necessary.
- Do not register duplicate event, keyboard, or hash listeners on each visit; do not recreate alphaTab score/audio on re-entry or re-fetch SoundFont unnecessarily. Do not call unproven dispose/teardown APIs.
- Preserve user's original imported GP bytes and notation when pitch is shifted. Percussion and shared channel protection remain.
- If a test-only `?test` query is present, open the integrated Player directly and expose `window.stageB` as before; preserve current Stage B selectors (`#sample`, `#pitch-sample`, `#score`, `#audio`, `#play`, `#seek`, `#pitch`, `#fretboard`, etc.) or **intentionally update tests with demonstrably equivalent coverage**. Avoid building two independent versions of the reader solely to pass tests.

## 5. Tests and acceptance

Follow **C01–C10** in `docs/STAGE_C_ACCEPTANCE.md`. Add focused route/lifecycle browser tests, keeping existing Stage B model and browser regressions meaningful.

Test at least:

1. Default `#/tuning`, direct load/reload of `#/player`, direct `#/library`, browser Back/Forward and unknown hash fallback.
2. Open Player, load test score, enable audio, play; visit Tuning, return, confirm same score/position/settings, no autoplay and successful manual resume.
3. Repeat switching `tuning → player → library → player` 10–15 times, no duplicate worker/adapter/listeners, no console errors and no stalled audio.
4. `?test` automated Stage B scenario; page/horizontal layout; zoom; imports and corrupt-file errors; loops, seek and mute/solo.
5. Verify -2, 0 and +2 semitone **audio-only** changes do not alter TAB/staff/fretboard source coordinates; 50% speed does not change pitch.
6. Run `node --test tests/model.test.mjs`; optional `node tests/browser.test.mjs` when Playwright is available. Do not falsify results if an environment or proprietary fixture is unavailable.
7. Simulated GitHub Pages `/GuitarTools_WebApp/` local path, correctly loaded worker, worklet, font and SoundFont; actual HTTPS Pages only if accessible and verified.
8. At 1280px and 390px verify navigation, focus, layout and no document-wide horizontal scrolling.

## 6. Explicit exclusions

No C2–C5 actual tuning editor, headstock SVGs, tuning presets CRUD, IndexedDB, browser user-data backup, per-string audio audition, Song Library implementation, production Tab Player redesign, new notation engine, score editor/converter, cloud sync, app accounts, new major dependencies, SDK replacement or unnecessary documentation proliferation.

## 7. Delivery (strict)

- Return **one downloadable ZIP** containing **complete modified and new source files**, preserving **repository-relative paths**; no partial snippets, Git diff/patch, migration scripts or other installer.
- **Do not commit, push, merge, create a PR or modify remote GitHub.** I will extract the ZIP, test locally in WebStorm, then push.
- Include `docs/STAGE_C0_C1_RESULTS.md`: each C01–C10 item PASS/FAIL/NOT TESTED, environment/browsers, tests actually run, changed files, screenshots if useful, preserved Stage B functions and remaining risks.
- Keep documentation changes concise and confined to directly affected content. Do not rewrite all product docs or duplicate the existing Stage C plan.
- If a critical regression can't be resolved, report a specific blocker and deliver the maximum safely working source rather than claiming completion.

**Success means:** the approved three-page foundation is usable and responsive, with the Stage B player intact and its score/audio preserved across navigation. The complete Tuning Library is **not** expected until C2–C5.

## Stage A Visual References

The four attached mockups represent the **approved visual direction** for Guitar Tools.

Use them as the design reference for Stage C0–C1, particularly:

- Dark charcoal surfaces and restrained copper accents.
- Consistent typography, spacing, borders, and controls.
- Compact professional workstation aesthetic.
- Three-page top navigation and responsive application shell.

**Scope restriction:** Do not attempt to reproduce every mockup in this stage.

The Tuning Library and Song Library should remain styled placeholders. Their complete interfaces will be implemented in later stages.

For the Tab Player, preserve the existing Stage B functionality and introduce only the structural integration and styling necessary for the new application shell. Do not rebuild the notation reader, fretboard, or playback engine.

The goal is to establish a production-quality visual foundation that subsequent stages can extend without significant UI rework.
