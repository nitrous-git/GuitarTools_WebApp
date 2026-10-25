import { FACTORY_PRESETS } from '../domain/tunings.js';
import { noteLabel } from '../domain/notes.js';
export const MAX_SONG_BYTES = 20 * 1024 * 1024;
export const FORMATS = ['gp', 'gpx', 'gp5', 'gp4', 'gp3'];
export async function checksum(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure file checksums require HTTPS or localhost.');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
export function tuningLabel(notes) {
  if (!notes?.length) return '—';
  return FACTORY_PRESETS.find(p => JSON.stringify(p.notesLowToHigh) === JSON.stringify(notes))?.name || notes.map(noteLabel).join(' ');
}
// Parse with the bundled GP importers only: ScoreLoader also accepts unrelated formats.
// No AlphaTabApi, audio context, worker or SoundFont is created here.
export async function parseSong(file) {
  try {
    if (!file.size) throw new Error('Empty file.');
    if (file.size > MAX_SONG_BYTES) throw new Error('Exceeds the 20 MiB file limit.');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!FORMATS.includes(extension)) throw new Error('Choose .gp, .gpx, .gp5, .gp4 or .gp3.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const at = await import('../../assets/vendor/alphatab/alphaTab.mjs');
    const settings = new at.Settings();
    settings.importer.maxDecodingBufferSize = 64 * 1024 * 1024;
    let score, format;
    for (const parser of at.Environment.buildImporters().filter(p => p.name.startsWith('Guitar Pro'))) {
      try {
        parser.init(at.io.ByteBuffer.fromBuffer(bytes.slice()), settings);
        score = parser.readScore();
        format = parser.name === 'Guitar Pro 7-8' ? 'gp' : parser.name === 'Guitar Pro 6' ? 'gpx' : `gp${new TextDecoder().decode(bytes.slice(0, 32)).match(/v([345])\./)?.[1] || ''}`;
        break;
      } catch (error) {
        if (!(error instanceof at.importer.UnsupportedFormatError)) throw error;
      }
    }
    if (!score?.tracks?.length) throw new Error('No supported Guitar Pro score with tracks was found.');
    const tracks = score.tracks.map((t, index) => ({
      name: String(t.name || `Track ${index + 1}`).slice(0, 500),
      program: Number.isInteger(t.playbackInfo?.program) ? t.playbackInfo.program : null,
      staves: t.staves.map(s => ({ percussion: Boolean(s.isPercussion), capo: s.capo || 0,
        notesLowToHigh: s.isPercussion ? [] : [...s.tuning].reverse() }))
    }));
    return { bytes, hash: await checksum(bytes), metadata: {
      title: String(score.title || file.name.replace(/\.[^.]+$/, '')).slice(0, 500),
      artist: String(score.artist || '').slice(0, 500), filename: file.name,
      format, extension, size: bytes.length,
      tempo: Number.isFinite(score.tempo) && score.tempo > 0 ? score.tempo : null, tracks
    } };
  } catch (error) { throw new Error(`${file.name}: ${error.message || 'Unable to parse file.'}`); }
}
export function stringTracks(song) {
  return song.tracks.flatMap((track, ti) => track.staves.filter(s => !s.percussion && s.notesLowToHigh.length).map((s, si) => ({ ...s, name: `${track.name}${track.staves.length > 1 ? ` / staff ${si + 1}` : ''}`, trackIndex: ti, program: track.program })));
}
export function songTuning(song) {
  return [...new Set(stringTracks(song).map(s => tuningLabel(s.notesLowToHigh)))].join(' / ') || '—';
}
