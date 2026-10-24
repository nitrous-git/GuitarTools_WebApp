# Guitar Tools — Stage B / P0: alphaTab Feasibility Proof of Concept

**Role:** Work Astra, professional lead developer specializing in guitar notation software, browser audio and vanilla JS.  
**Repository:** `https://github.com/nitrous-git/GuitarTools_WebApp` (create/push the starter first).  
**Source:** the latest `stage-b-alphatab-poc` branch if it exists, otherwise `main`.  
**Scope:** only Stage B / P0 — **technical validation, not production UI**.

## Preparation
1. Read `AGENTS.md`, then `docs/ARCHITECTURE.md` and `docs/STAGE_B_ACCEPTANCE.md`. Consult `docs/PROJECT_BRIEF.md` only for targeted product details.
2. Review `README.md` for GitHub Pages/static setup. The approved Stage A design exists but is **not** to be implemented in this task.
3. Use focused source inspection; avoid reading or generating unrelated files.
4. Start with **alphaTab v1.8.4 stable**, not `@latest` or prerelease. Confirm the exact package version, distributable assets, API syntax and license from upstream docs. If you must deviate, explain why.

## Implementation
Build a small working, single-page browser POC in **plain HTML, CSS and JavaScript ES modules**. It must serve directly from GitHub Pages (repo subpath), without Vite/React/runtime npm/backend.

A. **alphaTab integration:** Load the pinned SDK in a deterministic way; verify notation music font, Web Worker, AudioWorklet and licensed SoundFont asset loading with correct relative/base paths. Prefer self-hosted pinned files where practical. Provide a simple alphaTex fallback so the page is testable without proprietary user files.

B. **Guitar Pro import:** A user-facing local file picker accepting `.gp`, `.gpx`, `.gp5`, `.gp4`, `.gp3`. Render imported notation and tablature; display title, tempo context, tracks, string counts and tunings when available. Use actual file content, not extension-only claims. Display useful per-file errors; never upload user files.

C. **Layouts:** Page/vertical and continuous horizontal modes; zoom slider; 2, 3 or 4 bars per row in Page mode, if supported by pinned alphaTab. Preserve current score/track selection and playback position if possible when switching layouts.

D. **Playback:** SoundFont play/pause/stop/seek, visible cursor, playback speed percentage, segment looping and track visibility vs audio mute/solo. Avoid conflating display visibility with audibility, and speed percentage with the score's actual BPM map.

E. **Critical transpose test:** Provide +/- semitone playback pitch control (-12 to +12, reset 0). Use `api.changeTrackTranspositionPitch(tracks, semitones)` on suitable melodic tracks rather than mutating notation transposition/score. Verify an audible pitch offset, while displayed TAB fret values, standard notation, original tuning and diagnostic fretboard positions remain unmodified. Test -2 and +2; identify shared-channel and percussion limitations instead of silently claiming independence.

F. **Fretboard event spike:** Subscribe to the appropriate alphaTab beat/playback events. Show a minimal, unpolished diagnostic view for a selected fretted guitar track with (1) all notes in the current source measure in gray and (2) currently active beat/note(s) highlighted. Derive string and fret data from the original score model, not from MIDI pitch after transposition, and never scrape rendered SVG. Demonstrate chords, rests and seek behavior where test files permit; mark unavailable special-case tests pending.

G. **Failures and static hosting:** Handle unavailable SoundFont, invalid file, empty file and autoplay restrictions gracefully. Use no absolute root assumptions such as `/assets/...`; code must support `/GuitarTools_WebApp/` on GitHub Pages. If the deployed Pages site is not yet available because you cannot push, verify via static HTTP hosting and provide an explicit Pages verification checklist instead of claiming remote success.

## Evidence / test matrix
Create `docs/STAGE_B_RESULTS.md` covering B01-B10 in `docs/STAGE_B_ACCEPTANCE.md`, with PASS / FAIL / NOT TESTED, exact alphaTab version, affected browser(s), paths, fixture provenance, and observations. Test GP3, GP4, GP5, GP6/GPX, GP7/GP and GP8/GP independently *only where corresponding lawful fixtures are available*; do not include commercial music in your ZIP. Absent fixture = NOT TESTED, not a fabricated PASS.

## Hard scope exclusions
No production three-page navigation, no custom headstock tuner, no song IndexedDB library, no full visual redesign, no GP editing/conversion, no user accounts, no React/Vite setup, no backend, and no unnecessary documentation. The POC must be compact, auditable and easily replaceable by the final app modules. Avoid one giant `main.js`; isolate the alphaTab integration and diagnostics into small, purpose-driven modules when useful.

## Delivery
- Return **one downloadable ZIP** with complete modified/new files in their correct relative repo paths; no Git patch or scripts to apply.
- Do not commit, push, merge or create PRs. I will unpack, test in WebStorm, then push.
- Include a brief change summary, precise setup/test steps, `docs/STAGE_B_RESULTS.md`, and unresolved issues.
- If any blocking API/format/hosting limitation remains, report evidence and a proposed alternative rather than declaring the phase complete.

**Success condition:** A working static technical demo and a trustworthy feasibility report for the reader/player core. The full Guitar Tools UI will come in subsequent phases based on the already-approved Stage A mockups.
