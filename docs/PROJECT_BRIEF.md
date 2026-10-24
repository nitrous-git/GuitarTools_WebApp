# Guitar Tools — Product Brief v1

## Purpose
One static browser-based musician's workspace joining (1) a personal tuning library, (2) a personal Guitar Pro song library and (3) a fast, accurate GP tab reader/player. The application should feel like a serious, unobtrusive tool made for guitarists, not a learning gamification platform or a full DAW.

## Core workflow
Choose tuning -> view/audition/save/load; import song -> classify/find -> open player -> select visible/audible tracks -> follow tabs/fretboard -> loop, slow down, or shift *only the sounding MIDI notes* while leaving the sheet and tab fingerings original.

## Pages

### 1. Tuning Library
- Single page with a responsive 6/7/8-string headstock and independent note selector plus audition button for **each** string.
- Use a clean SVG headstock system with peg anchor coordinates for 6 (3+3), 7 (3+4), 8 (4+4). This is a visual editor, not a signal-processing/microphone tuner. Offer conventional inline headstock as future style, not a launch requirement.
- Canonical tuning data: `stringCount` + MIDI pitches `notesLowToHigh[]`; explicit note labels (with octave), canonical low->high ordering, stable visual peg mapping.
- Provide useful factory presets including 6-string Standard, Drop D, Drop C, DADGAD, Open G; 7-string Standard B; 8-string Standard F#; other presets curated later. User presets are editable and never overwritten by preset updates.
- Per-string note selection with practical guitar note range plus optional advanced range. 12-tone equal temperament, concert reference A4=440 Hz; no microtonal support in v1.
- MIDI-note audition: keyboard or per-string play icon, 1–2 s plucked sound (SoundFont/sample or simple synthesis), one-at-a-time or Play All low-to-high. Separate preview volume. Must be reliable after a browser user gesture.
- Save tuning with name, optional description, category/tags, created and updated timestamps; load, rename, duplicate, update, delete with confirmation. Mark unsaved edits clearly.
- List with search/filter/sort (name, date, string count, category). Tuning viewer and library coexist on one page without extra navigation.
- Helpful actions: return to preset, reset individual string, copy low-to-high tuning as text, export/import tuning presets in app backup.

### 2. Song Library
- Import `.gp`, `.gpx`, `.gp5`, `.gp4`, `.gp3` via file picker and drag/drop. Parse format from content; validate extension, size, structure and parser errors; handle multiple selections.
- Store original file bytes locally plus independent metadata: title, artist, source filename, version/extension, tempo reference, track overview, tuning(s), uploadedAt, categories/tags, favorite, optional user notes.
- Search, filter, sort and manage user-defined collections/tags. A song may belong to multiple collections without duplicate file storage. All Songs and Favorites are built-in views.
- Duplicate detection via file checksum; ask whether to skip/keep separate; never overwrite without an explicit choice.
- Open in Tab Player without re-upload. Recent songs / resume last song position as an optional preference.
- Rename app's display name independently of the imported score metadata. Allow delete, remove from collection, favorite toggle.
- Privacy: initial version imports and reads files locally in the browser; no upload to project GitHub, public library, or third-party server.
- Essential: explicit export/import backup of originals, collections, tunings and selected preferences; backup restore handles ID collisions and validates manifest/schema.

### 3. Tab Player
- Formats: `.gp`, `.gpx`, `.gp5`, `.gp4`, `.gp3` (validated by actual sample fixtures). Initially read-only; preserve original score/tabs.
- Clear track list: visible in score, muted for audio, solo, optional individual volume, active fretboard track. Visibility and audibility are independent.
- Standard notation + tab or tab-only; hide/show staff types through supported alphaTab settings. Maintain readable typography and note symbols.
- Page/vertical arrangement (auto or choose 2/3/4 bars per system), plus genuinely continuous horizontal layout. Zoom slider, fit-width/reset convenience controls.
- Playback: play/pause/stop, timeline/seek by measure and note, progress/time, score cursor, loop from/to bar (later note-level selection), speed and tempo +/- with reset, volume, optional count-in and metronome.
- Score's initial tempo is default; tempo changes inside the source score must stay meaningful. Expose speed percent as authoritative for changing-tempo songs; any displayed BPM must reflect current score tempo times speed ratio rather than masquerading as one absolute immutable BPM.
- **Playback-only pitch shift in integer semitones**: reset = 0, clearly distinguish original key signature (when present) from actual inferred tonal key. Display `Original / Playback +N semitones`. Change synth output pitch, not note spellings, tab fret numbers, string definitions, or fingering overlay. User preference can optionally be remembered *per song*, but is never exported into the original file.
- Optional per-track shift if alphaTab can safely isolate MIDI channels; default global shift of all appropriate melodic channels. Handle percussion separately; shared MIDI channels require inspection.
- Horizontal fretboard panel: selected stringed track, correct string count/tuning/capo, current measure's note positions drawn in muted gray and the currently sounding/played beat in distinct bright highlight (design reference: yellow); support notes played simultaneously. Use source-original positions and bar/beat model; do not derive positions from transposed MIDI pitches.
- Fretboard can dock below or collapse. Handle seeks, pauses, rests, measure changes, chords, ties, multiple voices and repeats. Avoid stale highlights. Unsupported non-string tracks have an explanatory empty state.
- File information: song/artist, format, tracks, guitar tuning, key signature if present, meter, tempo context and capo.

## Baseline UX constraints
- Desktop-first, responsive for laptop and mobile; player must remain usable with narrow screen and fretboard panel toggled.
- Dark theme default with optional light theme; minimize ornamental marketing copy, large hero imagery and gratuitous animation.
- Keep primary playback controls always reachable; side settings never cover the score without a deliberate overlay.
- Keyboard: Space play/pause; arrows seek; +/- playback speed; L toggle loop; Escape close dialogs. Avoid stealing keystrokes in form fields. Tooltips and accessible labels.
- Never indicate a save succeeded if it failed; display parse errors with filename; preserve current session when switching layout or settings where possible.

## First-release exclusions
- Full graphic notation editor, generating arbitrary legacy `.gp3/.gp4/.gp5` exports, AI transcription, MP3 synchronization, online tabs search, public distribution, social features, accounts and cloud sync, microphone tuner, subscription/payments, audio effects chains.
- Consider writing modified scores and exporting GP7+ `.gp` **after** the reader/player is stable; fidelity/loss warnings and format round-trip tests required.

## Definition of success
- After revisiting the GitHub Pages URL, saved tunings and imported songs are available in the same browser profile under normal storage conditions.
- The player accepts representative fixtures for each promised format, renders their notation without fatal errors, plays with a synchronized cursor and supports both layout directions.
- Fretboard positions reflect actual string/fret data even while audio is transposed by +2/-2 semitones.
- 7/8-string tunings map correctly to headstock pegs, note labels and audio.
- User can recover data from a backup in a clean browser context.
