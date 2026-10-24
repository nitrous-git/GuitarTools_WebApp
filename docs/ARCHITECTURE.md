# Guitar Tools — Architecture v1

## Deployment and framework choice
- Browser-only HTML/CSS/modern JS ES modules, deployable directly from GitHub Pages.
- A build tool is not required for production. Development tooling/tests may be optional but must not impose a required server or Vite runtime on deployment.
- Test with repository subpaths, secure HTTPS contexts and asset URL base paths.
- Prefer local copies of exact, tested third-party library distributions over references to moving `latest` tags. Account for web workers, audio worklets, music fonts and SoundFont paths.

## Music technology
**Primary recommendation: alphaTab** — Guitar Pro family reader, notation/tab rendering, score model, SoundFont playback, horizontal/page layouts, track selection and practice APIs. https://github.com/CoderLine/alphaTab

**Secondary research reference: guitarpro-parser** — optional metadata/parser comparison. Do not introduce as a mandatory extra layer unless a specific tested deficiency requires it. https://github.com/emilienbev/guitarpro-parser

**Functional reference: TuxGuitar** — study workflows and user experience, but do not import its Java desktop architecture into a vanilla web app. https://github.com/helge17/tuxguitar

Maintain dependency/version/license records. alphaTab is MPL-2.0; font and sound bank assets have their own notice requirements. No proprietary tab pack or bundled copyrighted score files without rights.

## Data flow
```
Local GP file selection/drop
  -> format/size validation
  -> alphaTab parsing + metadata extraction
  -> IndexedDB (original binary Blob + indexed song record)
  -> Song Library
  -> Tab Player loading bytes from IndexedDB
  -> alphaTab score / renderer / audio engine
  -> playback events -> synchronized fretboard model

Tuning form / SVG peg adjustments
  -> canonical MIDI pitches
  -> audition via Web Audio / playable licensed sample
  -> IndexedDB tuning repository
```

## Proposed code organization
```
index.html
src/
  app/App.js
  app/router.js
  domain/notes.js
  domain/tunings.js
  storage/db.js
  storage/tuningRepository.js
  storage/songRepository.js
  storage/backupService.js
  services/tuningAudio.js
  services/gpImport.js
  services/alphaTabAdapter.js
  services/playbackSession.js
  services/fretboardModel.js
  ui/pages/TuningPage.js
  ui/pages/LibraryPage.js
  ui/pages/PlayerPage.js
  ui/components/Headstock.js
  ui/components/Fretboard.js
  ui/components/TrackPanel.js
  ui/components/PlayerControls.js
  styles/tokens.css
  styles/layout.css
  styles/components.css
  styles/tuning.css
  styles/library.css
  styles/player.css
assets/vendor/alphatab/ # pinned JS/assets/fonts/sound bank
```
Module paths are a target design, not a requirement to create empty files upfront. Favor coherent code over premature abstraction.

## Model proposal
```js
Tuning = {
  id, name, stringCount, notesLowToHigh: [midiNoteInteger],
  categoryIds: [], description, isPreset, createdAt, updatedAt
}
Song = {
  id, displayName, originalFilename, format, originalBlob,
  checksum, title, artist, album, importedAt, updatedAt,
  categoryIds: [], favorite, notes, metadata: { tempo, keySignature, tracks: [] }
}
Category = { id, name, kind: 'song' | 'tuning', createdAt }
SongSession = {
  songId, playbackSpeed, pitchOffsetSemitones, layoutMode, zoom,
  displayedTrackIds: [], mutedTrackIds: [], fretboardTrackId
}
Preferences = { theme, previewVolume, defaultZoom }
```
IndexedDB schema changes must be versioned with upgrade paths. `SongSession` values are *non-destructive UI/session preferences*, never replacements for the original file. Use stable IDs and make backup schema version explicit.

## Critical music invariants
1. **Tuning pitch**: internal array ordered from lowest sounding string to highest; convert deliberately to visible conventional guitar string numbering. Note+octave labels matter (E2 is different from E3).
2. **Score presentation**: alphaTab parsed score is authoritative, including original notes and tab fingering.
3. **Playback-only transpose**: investigate/use `changeTrackTranspositionPitch(tracks, semitones)` to offset synthesizer channel output rather than changing score's transposition or rewriting saved tabs. Validate percussion, MIDI channel sharing, bends, multi-track cases, and browser behavior.
4. **Fretboard position**: original score's string and fret information is authoritative, not pitches after an output transform.
5. **Playback synchronization**: rely on score/playback events such as `activeBeatsChanged`, `playedBeatChanged`, seeks and position events rather than estimated wall time. Validate repeats, changes in tempo and ties.
6. **Layout**: alphaTab Page and Horizontal display modes; `barsPerRow` for page layout (2/3/4 where supported), `scale` for zoom. Re-render carefully when settings change.
7. **Speed vs pitch**: playback speed adjustments must not detune the music, and pitch-only transpose must not alter duration, rendered notation or displayed fingerings.

## Browser storage and file handling
- Use IndexedDB for imported binary files, saved tunings, category metadata and preferences. Keep localStorage for tiny expendable UI preferences only if needed.
- File validation includes extension checks, format sniffing, reasonable size limits and controlled parse failures; malformed files should not crash the UI.
- Exact duplicate checksum via `crypto.subtle.digest()` when suitable, with prompts for skip/duplicate.
- Avoid injecting untrusted score metadata into `innerHTML`. Prefer safe DOM text APIs.
- Backups should contain a manifest with schema and all source files, plus tunings, categories and preferences; restoring should validate types and IDs and handle merge/replace thoughtfully.
- Quota errors and browser storage eviction must be explained; `navigator.storage.persist()` can be an optimization but not a guarantee.
- Downloaded exports should be tested for byte fidelity.

## Technical validation required before committing to the reader
- Import/render/play fixture matrix covering GP3, GP4, GP5, GPX, and GP7/8 `.gp` where available.
- Browser audio activation and the separate alphaTab worker/worklet/font/SoundFont asset paths on GitHub Pages.
- Channel-based pitch-shift isolation and percussion handling.
- Fretboard note event mappings for chords, alternate tuning, capo, repeats, changing meter/tempo and seeks.
- Large multitrack file rendering/performance and offline/local persistence limits.

## Test strategy
- Pure unit tests: MIDI note mapping, string order, headstock peg-to-string relationships, preset validation, filters and backup format.
- Integration: real GP fixtures in each expected format, replay/seek/loops, track visibility and MIDI-only transposition.
- Browser smoke tests: Chrome/Firefox/Edge where practical, desktop and mobile widths, page/subpath asset serving, sample player audio, backup round-trip.
- Include intentionally malformed and duplicate file inputs.

## Non-goals
No custom score engraving engine, no custom general GP binary writer in v1, no scraping generated alphaTab SVG as data, no social file distribution, no backend-dependent features. Editing/conversion comes only after an explicit round-trip fidelity feasibility study.
