# Stage B — Baseline Audit (for Stage C)

**Audit reviewed:** 2026-10-24. Current stable source: `master` at `c376a8dd03f06fd0cc33f546eb56450ac76c0810` when inspected; recheck when branching. The Stage B feature branch had head `e49436ea1b26c8a8fb6d6d2b693519c654c59e68` during the previous audit.

## Current repository comparison

The `master` branch is **two commits ahead of `stage-b-alphatab-poc`** and zero behind. The inspected changes are documentation cleanup: removal of obsolete Stage B prompt/checklist/results and addition of Stage C planning documents. **Stage B application code, vendored alphaTab, and tests remain unchanged.** The default branch is `master`, not `main`. C0–C1 should use an owner-created `stage-c-app-foundation` based on up-to-date `master`.

## Technical evidence retained

- Self-hosted alphaTab **1.8.4 with a local one-line getter fix** (`AlphaSynthWebWorkerApi.loadedMidiInfo` returns `_loadedMidiInfo`). Bundled ESM core/entry, worker/worklet, Bravura, Sonivox and licenses are present. No automatic upgrade in Stage C.
- `src/services/alphaTabAdapter.js`: import, playback, layout, mute/solo, loop, pitch-only transposition; retain its behavior and improve integration only where needed.
- `src/services/fretboardModel.js`: guitar/alphaTab string indexing and original string/fret values, with percussion-channel protection. Do not replace with note-name guessing.
- Stage B browser test reports successful controlled PCM checks at 0/-2/+2 and at 50% speed; serialized score unchanged. Score test fixture is alphaTex plus SDK-generated GP7; **do not imply native GP3/4/5/GPX/GP7/8 corpus was tested automatically.**
- User manually confirmed successful GPX and GP5 imports on their system after the automated report. This is independent informal evidence but not an automated file-format conformance suite.
- Existing browser tests cover layout, seek, tempo changes, loops, import errors, generated GP7, pitch PCM and a 390px viewport; four unit tests check strings, chords, rests and channels. Actual Windows listening, cross-browser, and live GitHub Pages HTTPS were not established by the historic report.

## Stage C priorities

1. Preserve vendor build/patch and original-score transposition invariants.
2. Make Stage B player accessible through `#/player` without duplicate adapters, lost score state, orphaned audio, or broken asset paths.
3. Preserve existing automated tests: specifically the `?test` browser hook, `window.stageB`, input/score/fretboard DOM IDs, and controls, unless equivalent tests are intentionally updated.
4. Use accessible, minimalist production shell in Stage C1; the production SVG headstock, tuning library, song library, advanced fretboard and score editor are not part of C0–C1.
5. Report any regression honestly; don't use missing native fixture tests to block an otherwise safe shell milestone, but don't mark them PASS.

Full historical measurement and format matrix is in [STAGE_B_RESULTS.md](STAGE_B_RESULTS.md). This is a source/documentation audit, **not a fresh independent browser execution**.
