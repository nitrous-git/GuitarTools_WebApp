# Guitar Tools — Implementation Roadmap v1

This is a **phase-gated** plan. Each step should produce usable, testable output without partially implementing all pages at once.

## P0 — Technical proof of concept (mandatory gate)
- Create minimal static HTML/CSS/JS page loading a pinned alphaTab build.
- Import one fixture for each format: `.gp3`, `.gp4`, `.gp5`, `.gpx` and `.gp` (GP7/GP8 if available).
- Verify score rendering, vertical/page and horizontal layouts, zoom, SoundFont playback, seeking, looping, visibility/mute and current-note events.
- Prove *audio-only* +2/-2 semitone pitch change without modifying staff/tab/fretboard positions. Inspect shared MIDI channels and percussion behavior.
- Host a minimal test on GitHub Pages with repository subpath; inspect JS, worker/worklet, font, CORS and audio asset loading.
- Deliver compatibility table with verified outcomes and limitations.
**Accept:** a minimal reader runs on the target hosting environment and validates the most important musical invariants.

## P1 — Application shell and UI system
- Modular static project, clean navigation, consistent tokens/typography, reusable basic controls/dialogs, dark and optional light theme.
- Reserve responsive panels for Tuning, Library and Player. No giant marketing splash screen.
**Accept:** all pages navigate correctly and essential views fit laptop screens with a sensible mobile fallback.

## P2 — Complete Tuning Library
- Build responsive SVG headstock variants (6/7/8 strings), string/peg mapping, independent note menus and playback per string.
- Built-in presets, MIDI note model and note names with octaves, save/load/update/duplicate/delete, edit indicator, search/sort/categories and persistence.
**Accept:** save a new 8-string tuning, audition all eight notes, reload and retrieve the exact mapping and sounding pitches.

## P3 — Song Library and backups
- GP file multi-import/drop, parse metadata, retain original bytes, sort/search/collections/favorites, duplicate checks and song open action.
- Build tested export/import recovery for songs and tunings. Expose error states and storage caveats.
**Accept:** songs persist after reload, open without reupload, and round-trip from a backup into an empty browser profile.

## P4 — Guitar Pro notation reader
- Load song by library ID, present score metadata, track visibility, tab + notation / tab-only, Page and Horizontal views, zoom and bars-per-line.
- Maintain clean settings panel and responsive score container.
**Accept:** real multi-track samples render and respond correctly to every display control.

## P5 — Playback and practice controls
- Play/pause/stop/seek/progress, master volume, track mute/solo, loop range, +/- speed and reset, appropriate BPM and speed labels.
- Implement non-destructive audio-only semitone shift, confirm correct isolation of pitched tracks from percussion, and test with actual scores.
- Optionally add metronome/count-in after transport stabilizes.
**Accept:** speed changes preserve musical pitch; audio transpose preserves written tabs; looping and seeking do not leave stuck audio/transport state.

## P6 — Synchronized fretboard
- Independent selected-track fretboard model and drawing component supporting 6/7/8 strings, track tuning/capo, current-bar muted notes and bright current-note(s).
- Handle rests, simultaneous chord notes, separate voices, ties, repeats, loops, seeking and selection changes.
**Accept:** every active fret/string pair reflects original tab data even while audio-only transposition is enabled.

## P7 — Release-quality testing and polish
- Format regression corpus, invalid inputs, performance on long/multitrack scores, mobile breakpoints, accessibility, keyboard shortcuts and theme consistency.
- Audit storage migration and quota errors, backup recovery and library licenses/notices.
**Accept:** stable tested deployment, no critical workflow regressions, concise README and known-limitations list.

## P8 — Post-v1 (optional, separately scoped)
- Practice bookmarks, per-measure annotations and history.
- Safe GP7+ exports and limited conversion, with explicit fidelity/unsupported-feature warnings and round-trip verification.
- Limited notation editing only after reliable import/export and preservation of originals.
- Optional PWA/offline packaging and user-controlled data synchronization.

## Representative test set
- Six-string riff, seven-string piece, eight-string piece.
- Multitrack guitar + bass + drums with mute/solo and channel handling.
- Several Guitar Pro file generations and alternate tunings/capo.
- Time signature and tempo changes, repeats/alternate endings, tied notes, bends and slides.
- Chords/simultaneous notes, rests, large files, duplicate files and corrupted files.

## Astra work policy
- Astra acts as project lead: maintain architecture, validate musical correctness, review integration and hold acceptance gates.
- Delegate isolated CSS/SVG or simple tests to less costly models if available; do not delegate pitch semantics, MIDI channel behavior, storage migration or score/playback synchronization without senior review.
- Short implementation prompts should name one phase, reference these documents, set acceptance tests, and demand complete source files in requested delivery form.
- User controls Git and GitHub publishing unless they explicitly authorize mutations.
