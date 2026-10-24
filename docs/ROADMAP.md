# Guitar Tools — Implementation Roadmap v1

Sequential, compile/run-safe phases. Each phase has a demonstrable acceptance gate; don't let the lead agent redesign unrelated pages while implementing a feature.

Stage A (visual design): approved. **Stage B is P0** in this roadmap; start here.

## P0 — Research and Technical Proof of Concept (hard gate)
Minimal static alphaTab demo on GitHub Pages under a repository subpath. Import one each `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp` (GP7 and GP8 if available); render page and horizontal; play with SoundFont; loop; seek; zoom; switch tracks; mute/solo; demonstrate `+2` transposition on synth while staff and tab unchanged; verify events carry string/fret context. Log limitations.
**Accept:** recorded file-format test table, version pinned, worker and asset paths validated, no false compatibility claims.

## P1 — App shell and visual system
Static modular scaffolding, header/nav, shared tokens and responsive page architecture; clear active page; functional dialogs and theme selection. Establish desktop player split layout and simple mobile fallback. No unnecessary hero marketing screen.
**Accept:** GitHub Pages serves all routes/assets with no broken links or layout overflow.

## P2 — Tuning Library (complete independent tool)
Implement responsive SVG 6/7/8 headstocks, peg-to-string mapping, note choices, per-string audition, presets, save/load/update/duplicate/delete, category filters, search/sort, unsaved indicator, IndexedDB persistence. Proper note octave labels, no microphone tuner.
**Accept:** create an 8-string custom tuning, hear each note, reload app and select saved preset to restore correct pegs and MIDI pitches.

## P3 — Song Library
Import GP files via browser, safely store original blobs and metadata, create collections/tags, search/sort/favorite, duplicates, remove. Open player by local song ID. Add backup export/import of all user-owned tunings and songs.
**Accept:** import multiple formats, close browser, reopen and find them; restore from backup to clean browser profile without data loss.

## P4 — Notation Reader
Integrate alphaTab adapter, imported song loading, metadata panel, track visibility settings and tab/notation toggles. Page with auto or 2/3/4 bars per row; horizontal continuous scroll, zoom. Ensure no extra transforms of original file.
**Accept:** same file looks correct in both directions; multi-track visibility selection works and zoom does not truncate tabs.

## P5 — Playback and Practice Controls
SoundFont MIDI play/pause/seek, BPM/speed +/- reset, volume, solo/mute, loop selection, progress, keyboard controls, optional metronome/count-in; pitch-only audio transpose implemented/tested. Tempo-change songs display honest speed/current BPM handling.
**Accept:** slowing down doesn't change musical pitch; pitch transpose doesn't change tab/notation or fingering; loops accurately and doesn't leave stuck notes.

## P6 — Synchronized Fretboard
Build original-score fretboard model based on selected stringed track and original tuning/capo; gray all source notes from current measure, yellow current beat/note(s). Include ties, rests, seeks, repeats, chords and alternate 7/8-string layouts; collapsible responsive panel.
**Accept:** fretboard positions agree with original tabs at normal and transposed playback, after loops and seeks, with correct cleared/resting states.

## P7 — QA, accessibility, backup and release
Full regression with representative corpus, keyboard semantics, contrast, mobile/desktop browser tests, data migration, quota errors, invalid/corrupt input, long-song performance, portable backup restore, attribution. Optionally add installable/offline PWA after stability.
**Accept:** tested GitHub Pages release, no critical feature regressions; README and issue checklist updated.

## P8 — Post-v1 scope (not launch gate)
Read-only note annotations, saved song bookmarks/sections, improved practice sessions, scored original audio synchronization, export as GP7+ and MIDI with fidelity warnings, **then** selective notation editing. Arbitrary old-version GP export is uncommitted and needs a separate technical feasibility study.

## Agent work method
- Astra: architecture and integration gates, cross-module data contracts, code review and acceptance verification.
- Smaller sub-agents where available: isolated visual SVG work, straightforward CSS, static fixtures/tests, README/docs. Avoid giving musical data/pitch semantics, alphaTab lifecycle, or persistence migration to a weak unsupervised agent.
- Short prompts referencing this pack, exact phase and target files; one phase per delivery and explicit smoke test. User controls repository actions unless requested otherwise.

## Suggested acceptance test fixture corpus
- 6-string simple riff, 7-string song, 8-string song, multi-track with drum track, song with tempo changes, repeats/endings, chord with simultaneous notes, sliding/hammer-ons/ties, altered string tuning + capo, several GP versions, malformed file, duplicate file, file with many tracks/bars.
- For export phase, use round-trip compare on score semantics and explicitly describe unsupported features rather than promising lossless conversion.
