# Stage C0–C1 implementation results

Date: 2026-10-24 (America/Toronto). **Implementation delivered; browser acceptance pending.** This is not completion of all Stage C.

## Baseline and scope

- Working branch: `stage-c-app-foundation`, head `c1fca87429b13efa710e70e52de63ac6790af4dc`.
- Fetched master: `a37fe66aa820444ef8748eb6abf6254b22cc0317`. It is an ancestor of the working head. Branch-only baseline differences were assignment text and index formatting; Stage B implementation matched master.
- No commits, pushes, merges, PRs or remote modifications.
- Three hash routes; default Tuning. Player is created lazily once and its live DOM is retained. Leaving pauses playback; returning renders the existing score without reloading it or automatically playing.
- Theme follows the supplied charcoal/copper reference pack. No mockup imagery is embedded. Tuning C2–C5 and Song Library Stage D remain explicit placeholders.

## Acceptance evidence

| ID | Status | Evidence / remaining verification |
|---|---|---|
| C01 | PASS | Correct branch and master ancestry checked. Vendor, adapter, model, diagnostic fretboard, fixtures and original regression tests byte-compared with HEAD: all 23 files unchanged. |
| C02 | NOT TESTED | Router unit checks pass for defaults, test mode, valid/invalid hashes, repeated routes, simulated history transitions and skip link. Real browser direct/reload/Back/Forward tests added but could not launch. |
| C03 | NOT TESTED | Responsive shell, active navigation and focus styles implemented. Desktop/mobile screenshot and overflow acceptance require a browser; no visual pass claimed. |
| C04 | PASS | Source review confirms explicit future-stage labels, no fake saved data, no import/editor/storage/audition controls on placeholders. Only action is a real link to Player. |
| C05 | NOT TESTED | All four original model tests pass; adapter/fixtures/original browser tests unchanged and all original DOM IDs retained. Browser/audio regression and manual GPX/GP5 smoke still required. |
| C06 | NOT TESTED | One guarded initialization, retained page/adapter, scoped keyboard handler and pause-on-hide implemented. New browser suite checks twelve route cycles, instance/bytes/score/DOM identity, settings, listener/worker counts and no repeated SoundFont/worklet fetch. Suite could not launch. Human listening still required. |
| C07 | PASS | Original Stage B tests unchanged; `?test` without hash selects integrated Player, retaining `window.stageB`. Six combined model/router checks pass. Browser execution separately NOT TESTED. |
| C08 | NOT TESTED | Relative module paths and static HTTP repository-subpath files checked. Runtime worker/worklet/font/SoundFont loading and actual HTTPS GitHub Pages remain unverified. |
| C09 | PASS | Small vanilla modules, no runtime dependency/build system introduced, no future library implementation. ZIP holds complete changed/new files in repo-relative paths. |
| C10 | PASS | This report records actual checks, limits, changed files and follow-up. |

## Checks actually run

Environment: Linux container, Node v24.22.1. **No browser was available.** Playwright was present but reported a missing Chromium executable. Browser download attempts returned an HTML “Site Unavailable” response rather than a browser archive; package-manager fallback offered no Chromium candidate.

- Before changes: `node --test tests/model.test.mjs` — **4/4 PASS**. Original browser suite attempted, blocked at launch.
- After changes: `node --test tests/model.test.mjs tests/router.test.mjs` — **6/6 PASS**. The expected corrupt-input test prints an alphaTab parser error; its assertion passes.
- `node --check` — **PASS**, all 14 source/test JS modules.
- Original Stage B DOM IDs retained — **PASS**. Relative ES module targets resolve — **PASS**.
- Vendor/engine/fixtures/original regression byte comparisons — **PASS**. `git diff --check` — **PASS**.
- Static HTTP subpath file checks — **PASS**; this does not execute the SDK.
- `node tests/shell.test.mjs` — **NOT TESTED**, browser launch blocked. Added tests have not been proven in a browser yet.
- No manual listening, screenshots, real Pages verification, or new GP format certification performed.

## Run locally before accepting C0–C1

Serve the repository root over HTTP in WebStorm or another static server. On a development machine with Playwright and its Chromium installed:

```sh
node --test tests/model.test.mjs tests/router.test.mjs
node tests/browser.test.mjs
node tests/shell.test.mjs
```

Both browser suites accept `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` overrides; `SCREENSHOT_DIR` optionally saves screenshots into an existing directory. No npm or Playwright is required by the deployed app.

The unchanged Stage B browser suite covers layout geometry, zoom, playback, repeat loops, seek, track controls, corrupt imports, the generated GP7 fixture, live PCM pitch at −2/0/+2 semitones and 50% speed, unchanged score serialization, SoundFont retry and subpath resources. These assertions were preserved, not newly passed here.

Also open real GPX/GP5 files, listen for correct mute/solo and no stuck notes after navigation, check all pages at 1280px and 390px, and verify the actual Pages URL after your push. Native GP3/GP4/GP7/GP8 fixtures, complex scores and cross-browser audio remain Stage B validation gaps. Historical user GPX/GP5 success is not new evidence from this delivery.

## Changed/new files

- `index.html`, `src/main.js`, `src/styles/app.css`
- `src/app/App.js`, `src/app/router.js`
- `src/ui/pages/PlayerPage.js`, `TuningPage.js`, `LibraryPage.js`, `placeholder.js`
- `src/styles/tokens.css`, `layout.css`, `player.css`
- `tests/router.test.mjs`, `tests/shell.test.mjs`
- `README.md`, `docs/ARCHITECTURE.md`, `docs/STAGE_C0_C1_RESULTS.md`

## Remaining lifecycle limitations

Player state is retained only within the current tab session; reload closes that session and loses imported bytes. Return-to-page uses the SDK's existing public `render()` API, which must still be checked visually with horizontal layout and mobile resize. Startup/import/audio errors use the existing error surface. No extra synth, teardown, score conversion or persistence layer was introduced. The visual and browser/audio acceptance gates remain open until the checks above run successfully.
