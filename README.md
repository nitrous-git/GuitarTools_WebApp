# Guitar Tools — Stage B technical POC

Static HTML/CSS/JavaScript ES modules, with self-hosted alphaTab **1.8.4 + one
local worker-getter fix**. No build, npm runtime, backend or CDN is required.
This is the technical test bench, not the approved Stage A production UI.

## Run

1. Extract the delivery ZIP over the root of your `stage-b-alphatab-poc` checkout.
2. Serve that root using WebStorm's static server or another HTTP server
   (optional: `python -m http.server 8000`). Open its `index.html` over HTTP.
3. The bundled original exercise loads automatically. Click **Enable audio**,
   wait for SoundFont loaded, then **Play**. Space also toggles playback when
   focus is outside a form control.
4. Try page/horizontal, zoom, visible/mute/solo, speed, pitch and fretboard track.
   Use the seek slider or click the score. Loops select playback **occurrences**,
   so repeated source bars have separate entries. Dragging over the score also
   selects a range. For repeatable loops, use the occurrence selectors and checkbox.
5. Choose a local Guitar Pro file. Parsing happens on-device; no files are
   uploaded or persisted. Reloading discards the session. The 20 MiB limit is
   a POC safeguard, not a promise about long-song performance.

Use **Load E4 pitch reference** for pitch checks. At -2 it sounds D4; at +2 F#4;
TAB must remain open string 1. The diagnostic shows original beat fingerings,
not transposed pitches or exact audio sustain. See the measured results and
remaining gate checks in [docs/STAGE_B_RESULTS.md](docs/STAGE_B_RESULTS.md).

## GitHub Pages

All URLs are module-relative and tested locally at `/GuitarTools_WebApp/`.
After you push/deploy the desired branch/root, check the real HTTPS site:

- Score font, both layouts, cursor, local file chooser, and no console errors.
- Enable audio and Play: worker, worklet, Bravura and Sonivox requests return 200.
- Run your lawful GP3/4/5/GPX/GP7/GP8 fixtures, including drums and shared channels.
- Try -2/+2 pitch, 50% speed, loops, seeks, mute/solo and mobile scrolling.
- Verify your target Windows browser's audio/autoplay permissions.

Actual GitHub Pages deployment is **not tested**. No remote changes were made.
`file://` is not supported; audio worklets require HTTPS or localhost.

## Optional developer tests

`node --test tests/model.test.mjs` — four model/parser tests, no dependencies.

`node tests/browser.test.mjs` — requires Playwright installed for development
and its Chromium browser (`npx playwright install chromium`). Optional environment
variables: `PLAYWRIGHT_MODULE` (module path), `CHROMIUM_PATH` (browser executable),
`SCREENSHOT_DIR` (existing temporary screenshot directory). The test starts its
own static server under a repository subpath. Test dependencies are not deployed.

Use `?test` only for development; it exposes the adapter as `window.stageB` for
assertions. The audio test taps the real AudioWorklet PCM and checks frequency;
its access to `_worklet` is test-only and pinned-version-specific.

## Structure / licenses

`src/services/alphaTabAdapter.js` owns SDK lifecycle, import, playback and pitch;
`fretboardModel.js` converts original string positions and protects percussion;
`src/ui/fretboard.js` renders diagnostics; `src/main.js` connects controls.

Vendor source, patch explanation and licenses are in `assets/vendor/README.md`.
Fixture provenance is in `tests/fixtures/public/README.md`. New app code license
remains undecided; bundled third-party licenses remain independent.
