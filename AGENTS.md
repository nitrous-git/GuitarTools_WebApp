# Guitar Tools — Agent Instructions

Role: professional lead developer for a static browser-based guitarist practice application. Favor musical correctness, reliability, and UI clarity over breadth of features.

## Read order
1. `docs/STAGE_B_ACCEPTANCE.md` — current technical gate (Stage B / P0).
2. `docs/ARCHITECTURE.md` — system boundaries and invariants.
3. `docs/PROJECT_BRIEF.md` — product contract, read targeted sections.
4. `docs/ROADMAP.md` — later phases.

Read only relevant files before an implementation phase; avoid unrelated source and large reads.

## Nonnegotiables
- Static GitHub Pages app with HTML, CSS, vanilla JavaScript ES modules; no mandatory backend/account/runtime bundler.
- Pin library versions. Do not link alphaTab at `@latest` in production. Make its worker, font and SoundFont assets work under GitHub Pages subpaths.
- Imported Guitar Pro bytes are the source of truth. Do not silently mutate original notation or files.
- **Playback-only transposition must leave both displayed tab fret numbers and original fretboard fingerings unchanged.**
- 6-, 7-, and 8-string tunings are first-class. Canonical string pitch is MIDI note number, ordered lowest sounding string to highest; UI ordering is explicit.
- Local browser data is not a guaranteed backup: build export/import backup, surface storage failure, and protect against data loss.
- Playback and fretboard must follow the same score timeline, including repeats, tempo changes, rests and seeks.
- Avoid feature creep into full GP editing, audio recording, cloud sync, or public tab distribution in the first release.
- Meet reasonable keyboard accessibility, contrast, mobile responsiveness and desktop comfort.

## Implementation protocol
- Deliver phase-sized changes only, with named files, a short implementation summary and validation evidence.
- Keep module boundaries explicit; no giant single-file script and no brittle coupling to alphaTab-generated DOM markup.
- Demonstrate a working use case before proceeding to the next phase.
- Never claim file support, data persistence, channel-independent transposition, or lossless export without validation against fixtures.
- Do not commit, push, or create PRs unless explicitly requested for that phase; when producing local files, preserve paths and send complete replacements.

## Current phase and delivery
Stage A design is approved. Stage B is a nonproduction alphaTab feasibility POC. Return a downloadable ZIP of full modified/new files, with tests/results; user owns Git operations. Do not deploy or push without explicit permission.
