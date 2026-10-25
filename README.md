# Guitar Tools

A lightweight, local-first web workspace for guitarists: a custom tuning library, a personal Guitar Pro song library, and a notation/player with a synchronized fretboard.

**Current state (2026-10-24):** Stage A visual direction **approved**; Stage B alphaTab proof of concept **implemented and working as a test bench**; Stage C0–C1 application shell **implemented, pending browser acceptance**. Tuning Library and Song Library are styled placeholders; their features are not implemented. See [C0–C1 results](docs/STAGE_C0_C1_RESULTS.md).

## Run the application

The Stage C branch integrates the Stage B reader in the Tab Player. It imports a local `.gp3`, `.gp4`, `.gp5`, `.gpx` or `.gp` file, displays notation and TAB, provides page/horizontal layout and zoom, audio play/pause/stop/seek, speed, looping, track controls and playback-only pitch transposition, plus a diagnostic fretboard. Actual coverage varies by format and musical feature; see [Stage B results](docs/STAGE_B_RESULTS.md).

1. Open this repository in WebStorm or another editor.
2. Serve the repository root with a **static HTTP server**, for example WebStorm's built-in server or `python -m http.server 8000` (Python is optional, not an application dependency).
3. Open `index.html` over `http://localhost:...`, **not** `file://`. The default page is Tuning Library. Open **Tab Player** to load the bundled, self-authored exercise.
4. Select **Enable audio**, then **Play**. Use the file picker for your own Guitar Pro files; inputs remain in browser memory and are not uploaded or saved in Stage B.
5. Test both layouts, mute/solo, loop, seek, tempo/speed and ±2-semitone **audio-only** transposition. The original TAB fingering must not change.

The currently bundled SDK is **alphaTab 1.8.4 with a documented one-line compatibility fix**. Never replace it with an unmodified distribution without repeating the regression tests. Vendor assets and notices: [assets/vendor/README.md](assets/vendor/README.md).

## Stage C: current scope

**Stable branch:** `master` (includes the Stage B code and Stage C planning documentation).  
**Working branch:** `stage-c-app-foundation`, based on current `master`. This ZIP contains C0–C1 changes for local testing; no remote changes were made.

- **C0 (implemented):** safeguard the current reader and tests, record outstanding Stage B validation.
- **C1 (implemented; browser checks pending):** production three-route application shell (`#/tuning`, `#/library`, `#/player`) using the approved dark charcoal/copper design language. Preserve the Stage B player on the Player page and keep the other pages truthful placeholders.
- **C2–C5 (later deliveries):** tuning-domain logic, 6/7/8-string SVG headstocks, tuning persistence and backup, per-string audio audition, and QA.
- **After Stage C:** song-file library and production player presentation.

Read [Stage C0–C1 assignment](docs/ASTRA_STAGE_C0_C1_PROMPT.md) and [acceptance criteria](docs/STAGE_C_ACCEPTANCE.md). The roadmap is [docs/ROADMAP.md](docs/ROADMAP.md). Approved design reference is described in [design/DESIGN_REVIEW.md](design/DESIGN_REVIEW.md); mockup images are distributed separately and are **not** production assets.

Navigation uses `#/tuning`, `#/library` and `#/player`. Leaving Player pauses audio; returning retains its in-memory score/settings and requires explicit resume. Reloading the tab clears imported files. `?test` without a hash still opens Player and exposes the existing test hook.

## Deployment

Static HTML, CSS and vanilla JS ES modules; no React/Vite, mandatory runtime npm, backend or account. Github Pages can serve this project from `master` and repository root under `https://nitrous-git.github.io/GuitarTools_WebApp/` **if that Pages source is configured**. GitHub repository metadata alone does not establish whether Pages is deployed or passing tests. Validate the real HTTPS URL yourself after pushing.

Assets must resolve under the `/GuitarTools_WebApp/` project subpath (not hard-coded `/assets/...`). The editor and tests can use development tools, but the deployed app must remain build-free.

## Development checks

- `node --test tests/model.test.mjs tests/router.test.mjs` — current Stage B pure-model checks (Node is for optional **development testing**, not runtime).
- `node tests/browser.test.mjs` — optional Playwright Chromium suite; requires Playwright installed on the development machine and a compatible browser. It creates a local static HTTP test server under the repository subpath.
- `node tests/shell.test.mjs` — optional Playwright navigation/lifecycle suite, including twelve route cycles and 1280/390px viewport checks. Uses the same browser setup as the Stage B suite.
- During C1, keep Stage B's existing `?test` automation entry and DOM/adapter contracts working, or update browser tests to provide equivalent-or-better assertions without losing coverage. Run both the Stage B regression and C0–C1 navigation tests.

Historical Stage B observations include user-reported successful manual imports of **GPX and GP5**. Those observations complement, but do not replace, independent automated format tests. Additional GP3/GP4/GP7/GP8 native fixtures, cross-browser, shared MIDI channel and complex score validation remain open.

## Source and rights

The current app code's license has not been selected; bundled alphaTab (MPL-2.0), Bravura (SIL OFL) and Sonivox (Apache-2.0) retain their own notices. Do not commit copyrighted songs or third-party notation screenshots without redistribution rights. User-loaded Guitar Pro files are not published to GitHub.
