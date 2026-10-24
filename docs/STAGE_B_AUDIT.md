# Guitar Tools — Stage B Repository Audit
Date: 2026-10-24
Branch: `stage-b-alphatab-poc`
Head when inspected: `e49436ea1b26c8a8fb6d6d2b693519c654c59e68`
Repository: https://github.com/nitrous-git/GuitarTools_WebApp

## Verdict
**Advance to Stage C conditionally.** The proof of concept is technically valuable and should be retained. The full Stage B acceptance gate is still open, as the repository's own results report acknowledges. Audit is based on direct branch source/documentation inspection and the reported automated tests, **not** a fresh independent browser/Windows test execution.

## Grounded findings
- `assets/vendor/alphatab/`: pinned, self-hosted alphaTab 1.8.4 ESM/worker/worklet/Bravura/Sonivox and licenses. `assets/vendor/README.md` documents a one-line `loadedMidiInfo` getter fix. Freeze/preserve this patched build until isolated upgrade testing.
- `src/services/alphaTabAdapter.js`: score import, worker/soundfont initialization, timeline, transport, layout, speed, loop and playback-only pitch. Keep as a coherent adapter; introduce lifecycle/teardown handling when it becomes a page, but don't rewrite audio and synthesis.
- `src/services/fretboardModel.js`: original source position and string/capo/tuning information. Its low-to-high/1-based mapping is important; reuse its conventions for the tuning domain but avoid coupling user tuning records to alphaTab classes.
- `src/ui/fretboard.js`: diagnostic HTML table, intentionally not the approved production SVG neck. Retain as a diagnostic or replace later; don't mistake it for the production fretboard.
- `src/main.js` and `index.html`: prototype-centric wiring and DOM IDs; replace with small application shell and page controller. Avoid rewriting stable adapter logic.
- `tests/model.test.mjs` (4 model tests) and `tests/browser.test.mjs` (reported Chromium playback/PCM/SVG/loop/import tests) are valuable regression tests; adapt test selectors deliberately during Stage C, rather than silently deleting or leaving permanently broken tests.
- `docs/STAGE_B_RESULTS.md` reports generated GP7/alphaTex automated evidence and a limited browser environment; no native GP3/4/5/GPX/GP7/8 automated corpus. User additionally reports successful **manual GP5 and GPX** imports, so annotate separately as user observations, not automated fixture PASS.
- Static subpath behavior was tested locally; actual GitHub Pages HTTPS and Windows browsers were **not attested** in the report.
- Current repo default branch is **`master`**, not `main`. Feature branch is two commits ahead and zero behind `master` when inspected. New Stage C branch should start at Stage B head.

## Priority findings
1. **P0 preservation — SDK patch/runtime.** Preserve its one-line getter correction, bundled licenses, asset paths and SoundFont activation sequencing.
2. **P0 preservation — musical invariant.** Global melodic channel pitch change cannot touch notation/tab strings/frets, or tempo. Percussion/shared channels require additional real-world tests.
3. **P1 lifecycle refactor.** `src/main.js` is a prototype controller; use independent page lifecycle, adapter instance ownership, enter/exit/resume and track render readiness.
4. **P1 regression hygiene.** Keep Stage B tests running; update selectors where needed. Expand format matrix and manual observations; preserve the old POC diagnostics through an optional test/debug path.
5. **P1 site/branch consistency.** Correct docs and Pages workflow from `main` to actual default `master`; document whether live Pages deploys from master or another configured branch (repository metadata alone cannot confirm Pages settings).
6. **P2 later fretboard edge cases.** Tie sustain, grace notes, bends, multi-voice, alternate endings, shared percussion channels, huge files and native GP-version coverage remain separate validation tasks; they are not blockers to a standalone Tuning Library.

## Do not do as part of Stage C
- Do not upgrade alphaTab or remove the local patch.
- Do not abandon the working reader to implement three visually finished pages in one pass.
- Do not claim untouched alphaTab, comprehensive GP-version support, or sample-accurate fretboard sustains.
- Do not commit protected commercial tab files or publish third-party reference screenshots as production assets.
