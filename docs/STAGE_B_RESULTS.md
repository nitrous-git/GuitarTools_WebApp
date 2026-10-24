# Stage B historical results — 2026-10-24

**Historical POC report. Not a fresh test of Stage C.** This restates the test evidence and remaining limitations recorded in the Stage B branch. The original full report can also be inspected at [the historical Stage B report](https://github.com/nitrous-git/GuitarTools_WebApp/blob/stage-b-alphatab-poc/docs/STAGE_B_RESULTS.md). The repository owner's subsequent manual **GPX and GP5** success is noted separately from the automated test matrix.

**Decision then:** POC implemented; full Stage B acceptance gate remained **OPEN** for independent Guitar Pro fixtures, Windows/browser listening, and actual Pages HTTPS verification.

## Original environment and runtime

- Source branch: `stage-b-alphatab-poc`, reported implementation commit `395582cc1921ae24d36957e69964779f65c143fb`.
- alphaTab npm package **1.8.4**, distributable build **34**, with a one-line **local fix** to `AlphaSynthWebWorkerApi.loadedMidiInfo`: return `_loadedMidiInfo` rather than recursively returning `loadedMidiInfo`. See `assets/vendor/README.md`.
- Browser: **headless Chromium 133.0.6943.0 on Linux**, Playwright. Model tests used Node **24.22.1**. No Windows/Edge/Firefox/Safari results were asserted by the original report.
- Static local server under `/GuitarTools_WebApp/`; genuine `https://nitrous-git.github.io/GuitarTools_WebApp/` **NOT TESTED** by that report.
- Fixtures: self-authored alphaTex technical scores, plus one **SDK-generated** GP7 ZIP fixture; no third-party commercial song files.

## Stage B acceptance evidence as reported

PASS means PASS for the **specified local fixtures and environment only**.

| ID | Original status | Recorded evidence / gap |
|---|---|---|
| B01 Static install | PASS (local) | ESM, worker/worklet, font and SF2 loaded under project subpath; real Pages pending |
| B02 Guitar Pro versions | NOT TESTED (full matrix) | SDK-generated GP7 succeeds; native GP3/4/5/GPX/GP7/GP8 fixtures unavailable |
| B03 Notation + TAB | PASS (fixtures) | SVG and original fret labels inspected; cursor followed score |
| B04 Layout | PASS (fixtures) | Page 2/3/4 bars per system; Horizontal one system; 150% zoom; 390px page bounded |
| B05 Audio | PASS (automated core) | Live AudioWorklet PCM, play/pause/stop/seek; human listening pending |
| B06 Tracks | NOT TESTED (full gate) | Visibility/mute/solo calls and channel detector exercised, multi-track mix/shared-channel listening pending |
| B07 Tempo + loop | PASS (fixtures) | Expanded repeat timeline [0,1,0,1,2,3]; loop ticks wrap; bar 3 90 BPM; half speed preserves pitch |
| B08 Audio-only transpose | PASS (controlled fixture) | Measured SoundFont output at 0/-2/+2; `scoreToJson()` unchanged; multi-track/percussion/effects pending |
| B09 Fretboard model | PASS (basic fixtures) | Beat event, seek tick lookup, 3-note chord, rest, 8-string position; tie sustain/effects pending |
| B10 Failure handling | PASS (injected failures) | Empty/corrupt import preserves score; SF2 404 retry works; worklet/autoplay failure injection incomplete |

## Original GP matrix

| Format | Original Stage B automated status |
|---|---|
| GP3 | NOT TESTED |
| GP4 | NOT TESTED |
| GP5 | NOT TESTED |
| GP6/GPX | NOT TESTED |
| Native GP7 `.gp` | NOT TESTED |
| SDK-generated GP7 v7.0 | PASS import/render/play (audio path) |
| Native GP8 `.gp` | NOT TESTED |

**Additional user observation after the original report:** real local **GP5 and GPX** files imported successfully and the tested parameters appeared to work. Record as user manual validation, **not** automated conformance or a guarantee for all files.

## Audio frequency results reported by browser test

The test tapped the real alphaTab AudioWorklet output via an AnalyserNode (8192 sampled PCM frames, normalized cross-correlation/parabolic lag refinement). Correlation >0.996, RMS ~0.055–0.063; 20-cent tolerance.

| Pitch offset | Speed | Expected Hz | Measured Hz |
|---|---:|---:|---:|
| E4 original (0) | 100% | 329.628 | 328.590 |
| -2 semitones / D4 | 100% | 293.665 | 293.131 |
| +2 semitones / F#4 | 100% | 369.994 | 368.793 |
| E4 original (0) | 50% | 329.628 | 328.575 |

The original report found byte-identical `model.JsonConverter.scoreToJson(score)` before and after these tests, covering original tuning/notation/fret/string mapping for the fixture. This does not establish all effect/channel combinations.

## Technical limitations carried forward

- Pitch transposition is a MIDI-channel operation. Percussion/channel 9 and melodic tracks sharing protected channels are excluded; shared channels can couple mute/solo/pitch. Independent per-track transposition is **not** promised.
- alphaTab tuning is high-to-low; `Note.string` is 1-based low-to-high; canonical future tuning records must use consistent identity ordering rather than sorting notes by pitch.
- Fretboard diagnosis highlights source beat positions, **not sample-accurate sounding sustain**. Ties, grace, slides, bends, harmonics, alternative endings, complex voices remain separate verification tasks.
- Looping uses expanded MIDI tick-cache occurrences rather than raw master bar arithmetic.
- Source import is in memory (no DB), with a 20 MiB POC cap. Large-score performance was not established.
- SoundFont initializes after user gesture. Automatic browser policy, Windows and genuine hosted Pages still need testing.

## Re-running regression

1. `node --test tests/model.test.mjs` — originally **4/4 PASS**.
2. `node tests/browser.test.mjs` — originally PASS in headless Linux Chromium/Playwright with optional installation.
3. After any C1 routing changes, `?test` must still expose equivalent functionality and remain backed by one live adapter.
4. Manually check GPX/GP5, page/horizontal, mute/solo, loop, seek, ±2 pitch, 50% speed, and sound after returning from another app page.
5. Supply lawful native GP3/GP4/GP7/GP8/effects fixtures later; report PASS/FAIL/NOT TESTED honestly.

This file is preserved as **historical evidence**, not confirmation that C0–C1 or live Pages passed.
