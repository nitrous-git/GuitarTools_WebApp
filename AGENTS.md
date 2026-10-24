# Guitar Tools — Agent Instructions

Role: lead developer of a static browser-based musician's workstation. Preserve musical correctness and a working reader before improving presentation.

## Current task and reading order

**Current substage:** Stage C0–C1 (application foundation) on owner-created `stage-c-app-foundation`, based on **latest `master`**. Do not assume `main` exists. Stage A visuals were approved; Stage B engine exists and is working. **Do not implement C2–C5 during C0–C1.**

1. `README.md` — actual repository state and local setup.
2. `docs/ASTRA_STAGE_C0_C1_PROMPT.md` — immediate implementation contract.
3. `docs/STAGE_C_ACCEPTANCE.md` — C0/C1 exit conditions.
4. `docs/ARCHITECTURE.md` — preserved code/data invariants.
5. Relevant portions of `design/DESIGN_REVIEW.md`, `docs/STAGE_B_AUDIT.md`, `docs/STAGE_C_PLAN.md` only when needed.

Use focused source inspections rather than bulk-reading vendor modules or all documentation. Consult `assets/vendor/README.md` before touching alphaTab SDK code (avoid changing it).

## Nonnegotiables

- Static GitHub Pages-compatible HTML/CSS/vanilla JS ES modules. No runtime bundler, backend, logins, React/Vite or mandatory npm.
- **Keep the self-hosted, patched alphaTab 1.8.4 assets intact**, including worker/worklet, Bravura, Sonivox and licenses. Do not upgrade or re-download the SDK in C0–C1.
- Preserve Stage B import/render/playback, layouts, zoom, mute/solo, speed, loop, seeking, pitch shifting and diagnostic fretboard. **Playback-only transposition must not modify notation, TAB or original string/fret mappings.** Protect percussion/shared channels.
- Preserve the SDK string-index conventions: alphaTab staff tuning high-to-low; `Note.string` 1-based low-to-high. Future user tuning data will be MIDI-number arrays in string order low-to-high; never pitch-sort those arrays.
- Hash routes: `#/tuning`, `#/library`, `#/player`; no server rewrite required. Default production route is Tuning. Maintain backward-compatible `?test` Stage B automation behavior or equivalently update tests and record the mapping.
- Do not fake working Tuning Library or Song Library behavior in C1. Present truthful, polished placeholders; full implementations follow later.
- Keep navigation accessible (keyboard/focus/active route), mobile-friendly, and based on Stage A's restrained charcoal/copper palette.
- Do not silently discard user-imported score state or create duplicate synth/worker instances during repeated route transitions.
- Never claim all GP formats pass, GitHub Pages is verified, or source files persist until tested.

## Delivery and checks

Implement one substage at a time. Return **one ZIP of full changed/new files in repo-relative paths**, not patches or migration scripts. Include `docs/STAGE_C0_C1_RESULTS.md` with direct PASS/FAIL/NOT TESTED evidence and any regression limitations. Preserve meaningful existing tests; update them when the shell changes.

**No commits, pushes, merges, PRs, or remote repository modifications.** The repository owner handles branch creation, extracting, testing and pushing.
