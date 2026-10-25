import { assertMidi } from './notes.js';
export const STRING_COUNTS = Object.freeze([6, 7, 8]);
export function assertStringCount(count) {
  if (!STRING_COUNTS.includes(count)) throw new RangeError('Choose 6, 7 or 8 strings.');
  return count;
}
// Physical order is fixed, even when pitches cross. String 1 is the treble-side string.
export function stringMap(count) {
  assertStringCount(count);
  const leftCount = Math.floor(count / 2);
  return Array.from({ length: count }, (_, index) => ({
    id: `string-${count - index}`, index, number: count - index,
    side: index < leftCount ? 'left' : 'right',
    row: index < leftCount ? index : count - 1 - index
  }));
}
export function validateTuning(tuning) {
  const errors = [];
  if (!tuning || typeof tuning !== 'object') return ['A tuning is required.'];
  if (typeof tuning.name !== 'string' || !tuning.name.trim() || tuning.name.length > 80) errors.push('Name must contain 1–80 characters.');
  if (typeof tuning.description !== 'string' || tuning.description.length > 1000) errors.push('Description must be text up to 1000 characters.');
  if (!STRING_COUNTS.includes(tuning.stringCount)) errors.push('Choose 6, 7 or 8 strings.');
  if (!Array.isArray(tuning.notesLowToHigh) || tuning.notesLowToHigh.length !== tuning.stringCount) errors.push('Each physical string needs one MIDI pitch.');
  else for (let i = 0; i < tuning.notesLowToHigh.length; i++) {
    try { assertMidi(tuning.notesLowToHigh[i]); } catch { errors.push(`Invalid MIDI pitch for string ${tuning.stringCount - i}.`); }
  }
  return errors;
}
function assertTuning(tuning) {
  const errors = validateTuning(tuning);
  if (errors.length) throw new TypeError(errors.join(' '));
}
const preset = (id, name, notes, description) => Object.freeze({ id, name, stringCount: notes.length, notesLowToHigh: Object.freeze(notes), description });
export const FACTORY_PRESETS = Object.freeze([
  preset('standard-e', 'Standard E', [40, 45, 50, 55, 59, 64], 'Conventional six-string tuning.'),
  preset('drop-d', 'Drop D', [38, 45, 50, 55, 59, 64], 'Standard tuning with the sixth string lowered one whole step.'),
  preset('drop-c', 'Drop C', [36, 43, 48, 53, 57, 62], 'Drop D lowered one whole step across all six strings.'),
  preset('dadgad', 'DADGAD', [38, 45, 50, 55, 57, 62], 'An open suspended tuning for drones and fingerstyle playing.'),
  preset('open-g', 'Open G', [38, 43, 50, 55, 59, 62], 'Open strings form a G major chord, with D in the bass.'),
  preset('standard-b', '7-string Standard B', [35, 40, 45, 50, 55, 59, 64], 'Standard E with a low B string.'),
  preset('standard-f-sharp', '8-string Standard F#', [30, 35, 40, 45, 50, 55, 59, 64], 'Standard seven-string tuning with a low F# string.')
]);
export function createDraft(source) {
  assertTuning(source);
  return { presetId: source.presetId ?? source.id, name: source.name, description: source.description,
    stringCount: source.stringCount, notesLowToHigh: [...source.notesLowToHigh] };
}
export function setStringPitch(tuning, stringId, midi) {
  assertTuning(tuning); assertMidi(midi);
  const string = stringMap(tuning.stringCount).find(item => item.id === stringId);
  if (!string) throw new RangeError('Unknown physical string.');
  const draft = createDraft(tuning);
  draft.notesLowToHigh[string.index] = midi;
  return draft;
}
export function isModified(draft, source) {
  return draft.name !== source.name || draft.description !== source.description || draft.stringCount !== source.stringCount || draft.notesLowToHigh.some((pitch, i) => pitch !== source.notesLowToHigh[i]);
}
