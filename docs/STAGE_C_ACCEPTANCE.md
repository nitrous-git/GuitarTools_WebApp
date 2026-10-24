# Stage C — Acceptance Checklist
Status: Proposed. Check each gate only with direct evidence; explain remaining NOT TESTED items.

| ID | Acceptance condition | Test evidence |
|---|---|---|
| C01 | Stable three-page hash navigation and browser back/forward; default Tuning route | Desktop + 390px browser smoke; reload `#/player` |
| C02 | Stage B Player route retains GP import/render/playback, pitch shift, loops, score layouts | Existing model/browser regression + Windows manual |
| C03 | 6/7/8 SVG headstocks and corresponding peg/control count | Screenshot/DOM comparison for each count |
| C04 | Canonical MIDI pitch representation and exact conventional string mapping | Unit tests, including non-monotonic tuning |
| C05 | Correct read-only built-in presets; edit creates custom copy | Factory preset fixture + UI flow |
| C06 | Editable per-string note and octave; load applies all string values | UI interaction test for 6/7/8 |
| C07 | Save/rename/duplicate/favorite/delete, search, filter and sort | UI actions + IndexedDB readback |
| C08 | Persistence after page reload and browser restart | Real IndexedDB test for 8-string custom tuning |
| C09 | JSON tuning backup export/restore validation; invalid import doesn't erase records | Clean-profile restore + corruption test |
| C10 | Correct audible note preview and Play All without autoplay errors | A4/E2/F#1 sampling or ear/known synth test |
| C11 | Visually close to Stage A composition and theme; responsive at 1280 desktop and 390 mobile | Screenshots and interaction tests |
| C12 | Full static GitHub Pages subpath compatibility, vendor patch/license preservation | Local simulated subpath + actual deployed Pages when available |
| C13 | Data and UX quality: unsaved edits guard, keyboard labels/focus, storage failures | Automated checks + manual audit |
| C14 | No production Song Library implementation or advanced GP editor in scope | Changed-file/scope audit |

Final artifact: `docs/STAGE_C_RESULTS.md`, including PASS/FAIL/NOT TESTED for C01-C14, regressions, browser versions and next-stage recommendations.
