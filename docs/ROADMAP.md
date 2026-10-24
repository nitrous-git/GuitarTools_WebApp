# Guitar Tools — Roadmap

Updated 2026-10-24. Current stable repository branch is **`master`**. Stage A approved and Stage B implemented as a POC; remaining Stage B fixture/cross-browser checks are tracked, not declared complete.

| Stage | Scope | Status |
|---|---|---|
| A | Visual design for Tuning, Song Library, Tab Player | **Approved** (desktop visual direction) |
| B | alphaTab Guitar Pro import, notation, MIDI/SoundFont, pitch-only transpose, fretboard diagnostic | **POC complete**, acceptance conditional (see results) |
| C0 | Freeze Stage B regression/SDK baseline and rectify lifecycle/branch assumptions | **Next** |
| C1 | Build production app shell, hash navigation and player integration | **Next** |
| C2 | Pure tuning MIDI/preset/string mapping domain | Planned |
| C3 | Responsive original SVG 6/7/8 headstocks and tuning UI | Planned |
| C4 | IndexedDB tuning library, categories, save/load and JSON backup | Planned |
| C5 | Plucked-note audition, Play All, integration and tuning QA | Planned |
| D | Personal Guitar Pro song library: import, metadata, collections, IndexedDB original binaries, portable backup | Future |
| E | Production notation player UI, track panel, transport, synchronized SVG fretboard, robust complex-score handling | Future |
| F | Release polish, accessibility, performance, extensive format/Browser regression and optional offline/PWA | Future |
| Post-v1 | Selective editing and GP7+ export feasibility, annotations, advanced practice tools | Not committed |

## Stage C delivery splits

- **Delivery 1: C0–C1** — tested production shell with functioning Stage B player; Tuning and Song pages honest placeholders.
- **Delivery 2: C2–C3** — tuning model, presets and high-fidelity headstock/editor (persistence pending).
- **Delivery 3: C4–C5** — save/restore/audition and full Stage C acceptance.

Astra Medium is suitable for architecture/lifecycle work. Keep source code/data semantics and regression tests under lead-agent review; simple isolated styling can be delegated only when appropriate.

## Stage B risk register (carry forward)

Native GP3/GP4/GP7/GP8 fixtures, complex ties/effects/voices/alternate endings, actual HTTPS Pages, Windows/Edge listening, mute/solo shared MIDI channels, very large scores and performance. User has manually loaded GP5 and GPX successfully. See [Stage B results](STAGE_B_RESULTS.md).

All stages run under a static GitHub Pages project subpath, never require uploading private songs to a server, and preserve original imported notation when playback pitch is shifted. Avoid broad changes or unverified format claims.
