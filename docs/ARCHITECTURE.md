# Guitar Tools — Technical Architecture v1

## Runtime
Static GitHub Pages, plain HTML/CSS/JS ES modules. CDN allowed during prototyping but **production must pin an exact alphaTab release** and preferably host tested distributable JS, workers/worklets, fonts and licensed SoundFont under the site's own `assets/vendor/alphatab/` path. No Node/Vite *runtime*; optional local development tests are not a deployed dependency. Test site base-path behavior under `/repo-name/`.

## Recommended libraries
- Primary: [alphaTab](https://github.com/CoderLine/alphaTab) — GP3/4/5, GPX, GP7/8 import, notation SVG/canvas, MIDI SoundFont synthesis, playback, score API and GP7+ export. License MPL-2.0; accompanying fonts and SoundFont have separate licenses.
- Secondary/reference: [guitarpro-parser](https://github.com/emilienbev/guitarpro-parser) — Apache-2.0 metadata extraction/reference, but its documented formats are GP3, GP5, GPX, GP7/8; **do not depend on it for GP4 without tests**. Avoid two conflicting models unless justified.
- External reference: [TuxGuitar](https://github.com/helge17/tuxguitar) — Java desktop app (LGPL); learn UX/workflows but do not transplant desktop source into web architecture.
- Browser primitives: Web Audio API for simple tuner preview, IndexedDB for stored file Blobs and collection metadata, Web Storage only for small transient UI settings if needed, File API for imports, Blob downloads for exports, crypto.subtle for hashes.

## Data flow
`File picker/drop -> validation -> alphaTab import/metadata extraction -> IndexedDB(original Blob + song record) -> library index -> player load(original bytes) -> alphaTab score + synth events -> score renderer and separate fretboard view`

`Tuning controls -> note MIDI numbers -> local audition synthesizer -> IndexedDB(tuning record)`

## Suggested module boundaries
```
index.html
src/
  app/App.js                 navigation, lifecycle
  app/router.js              pages and route state
  domain/notes.js            MIDI pitch <-> labels, guitar string logic
  domain/tunings.js          presets, validation, headstock mappings
  storage/db.js              IndexedDB version/migrations
  storage/tuningRepository.js
  storage/songRepository.js
  storage/backupService.js
  services/tuningAudio.js    audition (user-unlock audio)
  services/gpImport.js       file sniffing, alphaTab adapter, metadata
  services/alphaTabAdapter.js   only place to call most SDK methods
  services/playbackSession.js  state, tempo ratio, solo/mute, transposition
  services/fretboardModel.js selected track, notes in bar/beat, timeline
  ui/pages/TuningPage.js
  ui/pages/LibraryPage.js
  ui/pages/PlayerPage.js
  ui/components/Headstock.js
  ui/components/Fretboard.js
  ui/components/TrackPanel.js
  ui/components/PlayerControls.js
  styles/{tokens,layout,components,player,tuning,library}.css
assets/vendor/alphatab/   pinned library/worker/worklet/fonts/sf2
```
Do not build a new music engraving engine. Do not scrape alphaTab's rendered SVG DOM for notes: consume score model and playback events. Separate track rendering from sound mixing and fretboard selection.

## Data model / schema proposal
```
Tuning { id, name, stringCount, notesLowToHigh: number[],
  categoryIds: string[], description, isPreset, createdAt, updatedAt }
Song { id, displayName, originalFilename, fileType, blob, checksum,
  title, artist, album, importedAt, updatedAt, categoryIds: string[],
  favorite, notes, metadata: {tempo, keySignature, tracksSummary} }
Category { id, name, kind: 'song'|'tuning', createdAt }
SongSession { songId, playbackSpeed, pitchOffsetSemitones,
  layoutMode, zoom, displayedTrackIds, mutedTrackIds, fretboardTrackId }
Preferences { theme, previewVolume, defaultZoom, lastOpenedSongId }
```
Do not store mutable/transposed notation as the original Song file. `SongSession` is UI state. Original file byte Blob can be stored in IndexedDB. Prefer future-proof schema versions, migrations, and stable IDs.

## Critical contracts
1. String order always low pitch -> high pitch in stored data. UI labels can show conventional string numbers high E = string 1, but the mapping must be explicitly converted.
2. For notation, alphaTab is authoritative. For the fretboard, string/fret notes from the original score are authoritative. For pitched output, synth channel shift is a separate non-destructive overlay.
3. Live playback-only pitch shift: `api.changeTrackTranspositionPitch(tracks, semitones)` sets channel transpose in alphaTab. It does not rewrite the score. Validate on actual multi-track and shared MIDI-channel fixture; never call notation `transpositionPitches` for this UX feature.
4. Loop and fretboard updates use playback timeline events (e.g., `activeBeatsChanged`, `playedBeatChanged`) with safe seeks/repeats, not wall-clock guesses.
5. Page layout: `display.layoutMode = Page`; `display.barsPerRow = 2..4` or -1. Horizontal layout: `display.layoutMode = Horizontal`; use `display.scale` for zoom. Re-render only when needed.
6. Playback speed change must not pitch-shift playback. Transposition change must not change playback speed or displayed note names/fingerings.
7. Preserve track selection, zoom and playback state on settings change where technically possible; handle stopped/muted players cleanly.
8. Imported files stay on user device in browser storage. No upload to GitHub or other users. Browser storage can be cleared/evicted; users must be able to download their own backup.

## Security, portability and reliability
- Enforce file-size limits, structured parse errors, checksum duplicate detection. Use safe text nodes for metadata, not imported `innerHTML`.
- Handle quota failure and private mode. Offer persistence request `navigator.storage.persist()` as appropriate, but never present it as a guarantee.
- Backup ZIP with schema-validated manifest and original blobs; portable between browsers/devices through manual export/import.
- Use relative asset paths under GitHub Pages base path. Verify audio worker/worklet + SoundFont HTTPS/CORS and browser autoplay unlocking; lazy-load player/audio assets when necessary.
- Add lightweight automated tests for note mapping, tuning presets, backup, metadata and layout state; integration tests for real GP fixtures and player.
- Include MPL-2.0 and bundled-font/SoundFont notices and licenses; do not publish proprietary third-party tab collections. User-provided content stays private unless user exports it.

## Unknowns to validate before implementation (Phase 0)
- Supported file corpus and fidelity per GP version and effects/repeats/multi-track. GP4 and `.gp` Guitar Pro 8 files must be included.
- `changeTrackTranspositionPitch` actual behavior on shared MIDI channels, percussion, bends and score/fretboard invariance.
- Worker/audio asset loading under GitHub Pages subpath and browsers.
- `activeBeatsChanged` relationship to repeated measures, sustain/tied notes and selected fretboard track.
- Performance for songs with many tracks/bars; storage budget for many large files; any format conversion loss.
