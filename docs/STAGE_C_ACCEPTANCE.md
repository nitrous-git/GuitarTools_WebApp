# Stage C — Acceptance Criteria

Stage C spans C0–C5. **Only the C0–C1 checkpoint below is the current Astra assignment.** Record PASS, FAIL or NOT TESTED with evidence; automated test coverage should not be dropped to claim success.

## Current delivery: C0–C1

| ID | Testable C0–C1 requirement | Verification |
|---|---|---|
| C01 | Source based on latest `master`, using owner-created `stage-c-app-foundation`; untouched vendor alphaTab 1.8.4 + local getter fix/licenses | Head/changed-file audit; vendor hashes or diff; no Git writes |
| C02 | Default `#/tuning`; `#/library` and `#/player` reachable; reload/direct hashes, Back/Forward, invalid route recovery | Browser interaction tests on desktop and 390px viewport |
| C03 | Approved dark graphite/copper top navigation, active state, keyboard focus, no whole-page horizontal overflow | Screenshots and focus/viewport checks |
| C04 | Honest Tuning and Library placeholders, without fabricated saved data or inert functional-looking controls | UI review and changed-file inspection |
| C05 | Player import/render, audio, sample controls, layouts, zoom, mute/solo, speed, loop, seek, pitch-only transpose, diagnostic fretboard still function | Stage B existing model/browser tests + manual GPX/GP5 smoke |
| C06 | One stable alphaTab/AudioWorklet lifecycle during repeated route transitions; loaded score/position and user settings retained; audio paused when leaving Player; no duplicate listeners or stuck notes | Loop 10–15 route changes, count instances/listeners where possible, manual audio check |
| C07 | Historic `?test` and `window.stageB` browser test entry maintained or deliberately replaced with equivalent test coverage; no regression deletion | `node --test tests/model.test.mjs`; Playwright suite or NOT TESTED with reason |
| C08 | Local HTTP and `/GuitarTools_WebApp/` subpath resources resolve; actual Pages verification separately identified | Static server subpath test, network/console, Pages HTTPS if available |
| C09 | Source organized into small understandable modules, no new runtime framework or feature creep; shipped files are complete replacements | Module/scope/ZIP audit |
| C10 | `docs/STAGE_C0_C1_RESULTS.md` records tested browsers, pass/fail/not-tested rows, changed files, lifecycle risks, and remaining Stage B fixture gaps | Results document content inspection |

**Gate:** C0–C1 approved only when essential navigation and Stage B player functionality work. Any unavailable test remains NOT TESTED and requires a specific follow-up; don't declare the entire Stage C complete.

## Subsequent deliveries: C2–C5 (not current scope)

| ID | Requirement | Gate |
|---|---|---|
| C11 | 6/7/8 canonical MIDI/string domain + accurate validated factory presets | Unit tests with unconventional tunings |
| C12 | Three original, responsive SVG headstocks with physically and logically correct peg mapping and all selectors | Interaction/screenshot tests, mobile widths |
| C13 | Full tuning CRUD/favorites/categories/search/sort and safe versioned IndexedDB + JSON restore | Reload/backup/corruption/collision tests |
| C14 | Correct audible plucked-note audition per string and Play All; no audio autoplay leakage | Manual browser and pitch tests |
| C15 | Stage A high-fidelity Tuning page design and accessibility, with Stage B player not regressed | Desktop/mobile and existing Stage B regression suite |

After C5, produce `docs/STAGE_C_RESULTS.md`. Advanced score/fretboard effects and native legacy format coverage remain tracked beyond this initial shell milestone.
