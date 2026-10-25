# Guitar Tools

A local-first, browser-based workstation for guitarists: a Tuning Library, a personal Guitar Pro Song Library and a notation/player with synchronized fretboard.

**Technology:** Static HTML, CSS and vanilla JavaScript ES modules. Designed for GitHub Pages at `https://nitrous-git.github.io/GuitarTools_WebApp/`. No build step, account, server or production npm dependency.

## Run

Open the repository in WebStorm and serve its root over HTTP (WebStorm's static server, or optionally `python -m http.server 8000`). Open `index.html` over localhost; do not use `file://` because audio worklets require a secure context.

Navigation: `#/tuning`, `#/library`, `#/player`. The Player imports local `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp` files; the original file remains on the device. GP format and complex-score support vary by actual test evidence. The Stage B proof of concept has been integrated into the application shell; the Tuning and Song Library modules are developed incrementally.

Playback uses the bundled, pinned **alphaTab 1.8.4 with a documented local worker-getter fix**. Do not substitute upstream files without retesting. See [`assets/vendor/README.md`](assets/vendor/README.md) for versions, modifications and licenses.

## Source map

- `src/app/` — hash router and page lifecycle.
- `src/ui/pages/` — Tuning, Song Library and Player page controllers.
- `src/services/alphaTabAdapter.js` — score import, SoundFont player and audio-only transposition.
- `src/services/fretboardModel.js` — original score string/fret extraction.
- `src/styles/` — shared theme, shell and page styling.
- `assets/vendor/alphatab/` — pinned, licensed runtime and audio/font assets.
- `tests/` — Node model/router and optional Playwright player/shell checks.

See [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) for product requirements, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for invariants, [`docs/ROADMAP.md`](docs/ROADMAP.md) for major stages and [`design/DESIGN_REVIEW.md`](design/DESIGN_REVIEW.md) for approved visual direction.

## Verification

Run the lightweight checks after changes to logic or navigation:

```sh
node --test tests/model.test.mjs tests/router.test.mjs
```

Optional browser checks require a locally installed Playwright and Chromium (development only):

```sh
node tests/browser.test.mjs
node tests/shell.test.mjs
```

The historical Stage B test report did **not** verify all native GP versions or live GitHub Pages deployment. The user has manually confirmed GP5 and GPX imports; keep remaining formats/effects/cross-browser claims limited to actual tests. After releases, manually verify HTTPS/subpath assets, SoundFont audio, player state across navigation, and mobile layout.

## Workflow

`master` is the default/stable branch. The feature branch is specified per task. **The current implementation assignment lives in the Work conversation, not in repository prompt files.** Work returns a ZIP of complete changed/new source files and a short test report in its response. The repository owner handles commits, pushes and merges unless explicitly authorized otherwise.

Do not publish proprietary song files or reference notation screenshots. Browser storage, once added, is not a substitute for an exported user backup.
