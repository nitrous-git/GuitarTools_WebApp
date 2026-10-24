# Guitar Tools — Product Brief v1

## Product vision
A serious, clean, self-contained practice workspace for guitarists. Combine a personalized guitar tuning library, a personal collection of Guitar Pro scores, and a score reader/player with practice controls and a synchronized guitar fretboard.

The experience should feel like a tool created by a guitarist: open the app, select a tuning or song, and start playing with as little friction as possible. The goal is not to clone an entire desktop notation editor, online lesson platform or DAW.

## Navigation
- **Tuning Library** — configure, audition, save, and retrieve guitar tunings in one workspace.
- **Song Library** — import, classify, search, and manage locally stored Guitar Pro files.
- **Tab Player** — read a selected score and practice with playback and fretboard guidance.

Shared UI: compact header/navigation, theme, core settings, persistent import/library storage. Prefer a professional, restrained dark theme with optional light theme. Optimize for desktop/laptop first while keeping all essential functionality usable on narrower screens.

## Page 1 — Tuning Library

### Interaction
- Show a clear, customizable headstock diagram for 6-, 7-, or 8-string guitars; initial layouts may be 3+3, 3+4 and 4+4. Responsive SVG design is preferred over stretching a background image.
- Every tuning peg maps to one and only one string and has an associated independently adjustable note selector and a small per-string sound/play control.
- Display note name **and octave**, with visible low-to-high tuning summary. Prevent ambiguous mapping between physical string numbers and MIDI note order.
- User can play a single plucked note or audition strings sequentially from low to high. This is an ear-tuning reference; **not** a microphone or frequency-detection tuner.
- Supply practical built-in presets: Standard E, Drop D, Drop C, Open G, DADGAD, 7-string Standard B and 8-string Standard F#; expand later.
- Create/save/load/edit/rename/duplicate/delete tunings, with clear unsaved changes. Keep supplied presets separate from personal presets.
- Data: name, integer MIDI pitches (ordered low-to-high), string count, optional info/notes, categories, created/modified timestamps.
- Personal library appears alongside headstock on the same page. Search, filter (string count, category), and sort (name/date). User-defined categories are preferred over a rigid genre list.
- Tuning changes must persist across page reloads in the same browser under normal storage conditions. Export/import backup is required for portability.
- Good conveniences: reset a peg, revert to current saved tuning, copy tuning as text, playback volume, no forced dialogs for basic operations.

### Baseline preset pitches (lowest to highest)
- Standard E: E2 A2 D3 G3 B3 E4
- Drop D: D2 A2 D3 G3 B3 E4
- Drop C: C2 G2 C3 F3 A3 D4
- DADGAD: D2 A2 D3 G3 A3 D4
- 7-string Standard: B1 E2 A2 D3 G3 B3 E4
- 8-string Standard: F#1 B1 E2 A2 D3 G3 B3 E4

## Page 2 — Song Library

### Import and records
- Drag/drop or select multiple `.gp`, `.gpx`, `.gp5`, `.gp4`, and `.gp3` files; reject or explain corrupt/unsupported content.
- Retain **original binary file** in browser storage and index metadata separately.
- Extract and display where available: title, artist, file format, initial tempo, track names, guitar tunings, time signatures, and other imported metadata. Empty/missing metadata should be handled gracefully.
- Let users edit the library's display title without modifying source file metadata or its bytes.
- Create categories/collections such as Metal, Rock, Jazz, Practice or Riffs; songs can belong to multiple collections with no duplicate file storage. Provide All Songs and Favorites.
- Search by title, artist, filename and categories; sort by title, last opened or imported date. Provide favorites and deletion with confirmation.
- Detect exact duplicate files using a checksum and let the user decide to skip or keep separate copies.
- Clicking a song opens Tab Player at that file; no second upload required.
- Local data stays private: no required accounts, remote upload, online catalog, or external sharing.

### Persistence and backup
- Use IndexedDB for Blob contents and structured metadata.
- Export a user-controlled backup containing tunings, categories, original GP files and chosen preferences. Validate its schema when restoring. Display progress and errors.
- Clearly communicate that clearing browser/site data or storage eviction can remove locally stored files; encourage periodic backups.

## Page 3 — Guitar Pro Tab Player

### Display
- Read `.gp`, `.gpx`, `.gp5`, `.gp4`, `.gp3` through validated reader support; initial scope is read-only.
- Show standard musical notation + tablature or tabs-only; track visibility is configurable separately from playback mute state.
- Support (A) vertical/page-like layout with natural systems and configurable target of roughly 2–4 measures per line and (B) uninterrupted horizontal layout; add zoom and reset-to-default controls.
- Keep score readable as tracks are shown/hidden or view is zoomed; do not truncate edge measures.
- Display source metadata and guitar tuning per track, plus tempo/meter information.
- Track settings should include visible/hidden, mute, solo, active fretboard track and ideally a simple per-track level setting if reliable.

### Transport and practice
- SoundFont-powered MIDI play/pause/stop, timeline cursor and seeking, elapsed time, loop a measure selection, tempo/speed controls with +/- and reset, master volume.
- Changes to playback speed must preserve sounding pitch. Songs can contain tempo changes: make speed multiplier authoritative and show current effective BPM when meaningful.
- Provide optional count-in/metronome only after the core transport is stable.
- **Audio-only transpose**: integer semitone offset (e.g. -12 to +12) applied at playback output; reset 0 = original. Notation, tablature fret numbers, string tunings and fretboard fingering remain unchanged. Never overwrite the imported file based on the playback offset.
- Distinguish original key signature metadata from inferred tonal key. Don't present guessed key as certain.
- Saved per-song reader settings are optional, separate from song bytes.

### Synchronized fretboard
- Show the fretboard for a selected fretted/stringed instrument track, using the correct number of strings, tuning and capo.
- Render note positions for the *current measure* in muted gray; render note(s) active in the current beat in an easily distinguished yellow/accent highlight.
- Support several active notes (chords), multiple voices, rests, ties, slides, seeks, loops, repeats, changing measures and pause state. Do not leave stale highlighted notes.
- Source tab string/fret location is authoritative; never recalculate visible fingering from pitched audio output. The fretboard therefore remains correct even during audio-only transposition.
- A collapsible bottom or docked fretboard suits laptop and desktop; mobile fallback can show a compact optional panel. Gracefully explain when the selected track is not fretboard-compatible.

## Design principles
- Not a splashy marketing site. Avoid irrelevant catchphrases, huge cards, fake analytics and decorative effects in the core musician workspace.
- Most common controls should be obvious. Advanced track, display and audio options can live in a collapsible side panel.
- Persistent transport controls must remain discoverable; shortcuts should not interfere with text entry.
- Default keyboard actions: Space play/pause, basic seek controls, Escape close dialog, optional loop shortcut, discoverable tooltips and labels.
- Preserve useful navigation and playback state between view changes where reasonable.

## Deliberate first-release exclusions
- Full music-score notation editor, arbitrary legacy GP file exporters, cloud accounts/sync, AI transcription, audio-to-MIDI recognition, microphone-based guitar tuner, online song sharing, subscription system, full DAW/audio effects, online licensed song marketplace.
- Future: practice bookmarks and annotations, GP7+ export/conversion where fidelity is testable, carefully scoped editing, installable offline PWA.

## First-release acceptance criteria
1. Save custom 8-string tuning, audition all strings, reload browser, and restore exact pitch + mapping.
2. Import representative files in every promised GP format, retain them across ordinary reloads and reopen directly from library.
3. Export then import a backup into an empty browser profile and recover all originals, tunings and categories.
4. Display a multitrack score in vertical and horizontal layouts; zoom and track visibility work correctly.
5. Audio-only transpose by +2 semitones leaves notation, tab fret numbers and fretboard positions unchanged.
6. Player cursor and fretboard stay accurate across seeking, looping and repeats.
