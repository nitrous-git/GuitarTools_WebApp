# Stage B results — 2026-10-24

**Decision: POC implemented; full Stage B acceptance gate remains OPEN.**
Do not start P1 based solely on this report. Independent Guitar Pro fixtures,
Windows/browser listening tests and actual Pages verification remain necessary.

## Environment and provenance

- Source: `stage-b-alphatab-poc`, commit `395582cc1921ae24d36957e69964779f65c143fb`.
  No reads from main, commits, pushes, deployments or PRs.
- alphaTab npm package 1.8.4, distributable build 34, with **one documented local
  fix** to `AlphaSynthWebWorkerApi.loadedMidiInfo`: return `_loadedMidiInfo`
  instead of recursively returning `loadedMidiInfo`. Without it, subscribing to
  `api.midiLoaded` raised `RangeError: Maximum call stack size exceeded`.
  Readable patched source and MPL license are bundled; see vendor README.
- Browser tested: headless Chromium **133.0.6943.0**, Linux, via Playwright.
  Node **24.22.1** for model tests. No Windows/Edge/Firefox/Safari tests.
- Local static HTTP server: `http://127.0.0.1:<ephemeral-port>/GuitarTools_WebApp/`.
  Test runner creates it; no bundler, proxy routing or backend application.
- Pages: `https://nitrous-git.github.io/GuitarTools_WebApp/` **NOT TESTED**.
- Fixtures: original bundled alphaTex exercises and one SDK-generated GP7 ZIP;
  see `tests/fixtures/public/README.md`. No commercial music was used.

## Acceptance evidence

PASS below is restricted to the stated fixtures/environment, not universal compatibility.
NOT TESTED indicates the complete acceptance requirement still has missing evidence.

| ID | Status | Actual evidence / remaining check |
|---|---|---|
| B01 Static installation | PASS (local) | ESM, two workers, AudioWorklet, Bravura WOFF2 and Sonivox SF2 served under the repository subpath. No failed asset responses or uncaught browser errors in the successful run. Real Pages pending. |
| B02 GP versions | NOT TESTED | Generated GP7 fixture imports, renders and plays; independent GP-version corpus missing. See matrix. |
| B03 Notation + TAB | PASS (fixtures) | Browser SVG render and visual inspection of original exercise; bar 1 TAB chord 0/0/1, fret 3, rest, low open E agree with source. Cursor advances. Generated GP7 renders. |
| B04 Layout | PASS (fixtures) | Renderer bounds show Page systems [2,2], [3,1], [4] for 2/3/4 bars per row; Horizontal has one system. 150% zoom renders. 390px page has no document overflow; score/fretboard scroll internally. |
| B05 Audio | PASS (automated core) | Explicit Enable audio + Play; live nonzero AudioWorklet PCM; tick/time advance, pause stable, stop, seek and cursor. Human listening/latency and Windows autoplay checks pending. |
| B06 Track controls | NOT TESTED (full gate) | Visibility selects tracks [0,1] independently; mute/solo control calls execute. Shared-channel detector/protection unit-tested. Audible multi-track mixing and real shared-channel fixture still pending. |
| B07 Tempo + loop | PASS (fixtures) | Selected occurrence loops and tick wraps observed. Repeat timeline [0,1,0,1,2,3]. Seeking source bar 3 reports 90 BPM. 50% speed preserves measured pitch. |
| B08 Playback-only transpose | PASS (controlled melodic fixture) | Live synth PCM measured at 0/-2/+2 using `changeTrackTranspositionPitch`; exact score JSON invariant. Original tuning/fret/string model untouched. Full multi-track/percussion/bends coverage pending. |
| B09 Fretboard extraction | PASS (basic fixtures) | `activeBeatsChanged` plus tick-cache seek lookup. Three simultaneous chord positions, empty rest, original source measure, low eighth string all asserted. No SVG scraping. Ties/complex voices/alternate endings pending. |
| B10 Failure handling | PASS (tested failures) | Corrupt and empty local files show errors and preserve previous score. Simulated SoundFont 404 shows path/retry guidance; retry succeeds. Missing-worklet/autoplay watchdog implemented, not failure-injected. |

| GP format | Fixture | Import | Render | Playback |
|---|---|---|---|---|
| GP3 | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |
| GP4 | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |
| GP5 | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |
| GP6 / GPX | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |
| GP7 native application file | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |
| GP7 SDK-generated fixture, VERSION 7.0 | `stage-b-generated.gp`, four tracks | PASS | PASS | PASS (clock/audio path; full listening pending) |
| GP8 native application file | Unavailable | NOT TESTED | NOT TESTED | NOT TESTED |

## Measured audio pitch

The browser test connected an AnalyserNode to the **live** alphaTab AudioWorklet
output during playback, sampled 8192 PCM frames, and used normalized
cross-correlation with parabolic lag refinement. This is neither MIDI note-label
inspection nor a separate oscillator/offline export. Correlation was >0.996,
RMS ~0.055–0.063. Acceptance tolerance: 20 cents from equal temperament.

| Pitch offset | Speed | Expected Hz | Measured Hz |
|---|---:|---:|---:|
| 0 / E4 | 100% | 329.628 | 328.590 |
| -2 / D4 | 100% | 293.665 | 293.131 |
| +2 / F#4 | 100% | 369.994 | 368.793 |
| 0 / E4 | 50% | 329.628 | 328.575 |

The sample has a small tuning deviation (~3–6 cents). All four checks passed.
`model.JsonConverter.scoreToJson(score)` was byte-identical before/after every
pitch/speed case. This covers serialized notation, source tuning, note pitches,
fret numbers and string assignments. It does not prove all instrument effects.

## Technical decisions and limitations

- Runtime is self-contained. Only SoundFont fetch is deferred until Enable audio;
  the worker and font may load at startup. AudioWorklet loads on Play.
- Pitch is a **channel operation**. Only safe melodic tracks receive the offset.
  Percussion staves and channel 9 are excluded, including melodic tracks sharing
  those channels. Shared channels are displayed; mute/solo can couple tracks.
  No promise of independent per-track transpose. No notation transposition call.
- alphaTab tuning arrays are high-to-low; `Note.string` is 1-based low-to-high.
  Canonical arrays reverse the tuning. Conventional displayed string =
  `stringCount - Note.string + 1`; low-array index = `Note.string - 1`.
  Strings are not sorted by pitch, preserving non-monotonic custom tunings.
- Diagnostics highlight active **beat positions**, not sample-accurate sounding
  sustains. A rest clears highlights; pause retains the current position;
  stopped seeks show the seek target. Tie flags are exposed, but sustain across
  ties, grace notes, bends, harmonics and complex multi-voice overlap is unverified.
- Loop bounds use the expanded MIDI tick-cache occurrence list, not arithmetic
  on source bar numbers. Layout/zoom use render/updateSettings, not score reload.
- Imported bytes stay in memory, untouched; parsing uses a copy. No upload,
  persistence, export UI, tuning editor or production navigation was added.
- Import parses on the main thread with a 20 MiB size cap. Large-score memory,
  render latency and malformed-input stress behavior are not benchmarked.
- Local browser run had no uncaught errors; expected parser failures are caught
  and shown. The test-only `_worklet` PCM tap is not a production dependency.

## Reproduce and finish the gate

1. Run the static site using README instructions. Model suite:
   `node --test tests/model.test.mjs` — **4/4 PASS**.
2. Optional Playwright suite: `node tests/browser.test.mjs` — all assertions
   **PASS** in the environment above. It starts its own server, tests layouts,
   playback, loop, import failures, generated GP, pitch PCM and SoundFont retry.
3. On Windows/WebStorm, audibly confirm mute/solo, drums unchanged at ±2,
   speed, repeat/loop continuity, pauses and seeks. Test shared channels explicitly.
4. Supply lawful real GP3/4/5/GPX/GP7/GP8 fixtures, including ties, capo, alternate
   endings and effects; record each file's metadata/tracks and import/render/audio.
5. After your push, run README's Pages HTTPS checklist. This ZIP does not deploy.
6. Reassess the SDK getter fix against upstream before upgrading. Keep the
   pinned working bundle until a replacement passes these tests.

Primary references checked: the exact npm 1.8.4 package, its readable source and
TypeScript declarations; https://alphatab.net/docs/reference/types/alphatabapi/changetracktranspositionpitch
and https://docs.alphatab.net/docs/reference/api/activebeatschanged .
