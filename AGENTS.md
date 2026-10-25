# Guitar Tools — Agent Rules

Build a professional, compact guitarist's workstation. The **active task, scope and branch are provided directly in Work**; this file is permanent project guidance, not a stage-specific prompt.

## Read only what is needed

1. This file; then the user's current Work task.
2. Relevant sections of `docs/ARCHITECTURE.md` and source files.
3. Consult `docs/PROJECT_BRIEF.md`, `docs/ROADMAP.md`, `design/DESIGN_REVIEW.md` only if needed for product or visual decisions.
4. Read `assets/vendor/README.md` before any alphaTab SDK/library work. Never read the multi-megabyte vendored core wholesale for routine changes.

## Contracts to preserve

- GitHub Pages-compatible static HTML/CSS/vanilla JS ES modules. No Vite, React, backend or required production npm dependencies.
- Preserve the tested, patched alphaTab 1.8.4 files, worker/worklet, Bravura and SoundFont paths, license notices and browser audio user-gesture behavior unless explicitly assigned an SDK upgrade.
- Keep one functioning Player/adapter instance through navigation; avoid losing loaded score/settings or playing audio invisibly.
- Playback-only transposition changes sounding MIDI pitch, **not** original score, TAB fret labels, tuning, fretboard coordinates or playback speed. Preserve percussion/shared-channel safeguards.
- Store user tuning notes as MIDI numbers indexed by physical string **low-string to high-string**; never pitch-sort those values. alphaTab's tuning/string-index conventions require explicit conversion.
- Imported Guitar Pro bytes are user-owned source material; do not upload, mutate, or falsely claim format compatibility. Use DOM `textContent` for imported metadata.
- Preserve meaningful automated regression tests and report PASS/FAIL/NOT TESTED truthfully. Do not remove tests to achieve a green result.
- Respect approved charcoal/copper workstation direction, usable mobile fallbacks, visible keyboard focus and accessibility.
- No unrequested feature creep (microphone tuner, recording, GP editor, account/cloud features).

## Delivery policy

Work in the user-specified branch, but **do not commit, push, merge, create pull requests or modify remote GitHub** unless a task expressly permits it. Deliver one ZIP of complete repository-relative modified/new files, no patches or migration scripts. Summarize changed files, tests actually executed and outstanding issues **in the Work response**, not as new permanent stage documentation.

Do not create `ASTRA_*_PROMPT.md`, phase-specific acceptance docs or results reports in the repository unless expressly requested. Keep existing foundational docs stable; update them only for a genuine enduring architecture/product change.
