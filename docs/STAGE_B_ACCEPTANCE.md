# Stage B / P0 — alphaTab Technical Acceptance Gate

## Objective
Validate the technical heart of Guitar Tools using a **small static browser POC**, not the approved UI implementation. Use alphaTab 1.8.4 stable unless specific compatibility evidence requires a documented adjustment.

## Acceptance checks

| ID | Requirement | Acceptance evidence |
|---|---|---|
| B01 | ESM/static installation under GitHub Pages subpath | Actual static server render; no broken library, font, worker/worklet or SoundFont requests. If site not available yet, mark Pages verification pending. |
| B02 | Guitar Pro imports (`.gp3/.gp4/.gp5/.gpx/.gp` GP7/8) | Matrix: each actual fixture = PASS/FAIL/NOT TESTED; metadata and tracks listed. |
| B03 | Notation & TAB rendering | Imported score visible with cursor; original fret labels verified using a reference sample. |
| B04 | Page and Horizontal layout | Both genuinely render correctly; Page bars-per-row 2/3/4 when supported; zoom works without truncation. |
| B05 | Audio | Licensed SoundFont loads after a user gesture; play/pause/stop/seek and current time; music and cursor stay synchronized. |
| B06 | Track controls | Visibility, mute, solo and appropriate track selection demonstrated; report shared MIDI channel coupling. |
| B07 | Tempo and loop | Playback speed distinct from pitch; selected range repeats; internal tempo changes not misrepresented. |
| B08 | Playback-only transpose | Apply -2/+2 semitone synth pitch via `changeTrackTranspositionPitch`; confirm score/TAB fret numbers, tuning and original fretboard coords remain unchanged. Include multi-track/percussion caveats. |
| B09 | Fretboard data access | Demonstrate selected-track current beat `string/fret`, active chord notes, and other notes in current measure in a diagnostic panel; use score model and alphaTab events, not rendered-SVG scraping. |
| B10 | Graceful failure | Corrupt/unsupported file and missing SoundFont show visible actionable error; no crash or fake success. |

## Musical correctness criteria
- For pitch-shift validation, compare actual audio pitch (e.g. note expected MIDI 64 becomes MIDI 62 at -2) using a suitable controlled fixture or synthesized output measurement; UI changing a label alone is not proof.
- Playback-only offset must not change displayed staff pitch, tablature numbers, string/fret mapping, or score serialization.
- No global transpose of percussion unless demonstrated musically correct; report SDK channel limitations.
- Changing playback rate must not change the musical pitch. Current score tempo vs playback speed percent are separate notions.
- Show active notes by original track/string/fret, with correct 0-based vs 1-based mapping; handle rests, chords and seeks, and report limits on ties/repeats.

## POC UI essentials only
One page containing: local file chooser; sample alphaTex fallback; score canvas; layout selector; zoom; track list with visibility/mute/solo; play controls; speed/loop; transpose (-12..12, reset); event/metadata display; simple diagnostic fretboard view; status and error log.

## Deliverables
1. Single ZIP with **complete** changed/new files preserving relative paths.
2. `docs/STAGE_B_RESULTS.md` with table PASS/FAIL/NOT TESTED, versions, browser versions, local vs Pages verification, fixtures used, known limitations and next-step recommendations.
3. Static setup instructions (no Vite/npm production requirement).
4. No git patches, commits, pushes or pull requests.

## Gate
**Do not claim Stage B fully passed** while major issues remain or required fixtures are unavailable. Report blockers with an actionable recommendation. Proceed to Stage P1 only after approval.
