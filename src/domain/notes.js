// Scientific pitch notation: MIDI 0 = C-1, MIDI 60 = C4.
export const PITCH_CLASSES = Object.freeze(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
export function assertMidi(midi) {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) throw new RangeError('MIDI pitch must be an integer from 0 to 127.');
  return midi;
}
export function midiToNote(midi) {
  assertMidi(midi);
  return { pitchClass: midi % 12, name: PITCH_CLASSES[midi % 12], octave: Math.floor(midi / 12) - 1 };
}
export function noteToMidi(pitchClass, octave) {
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass > 11 || !Number.isInteger(octave)) throw new RangeError('Invalid pitch class or octave.');
  return assertMidi((octave + 1) * 12 + pitchClass);
}
export function noteLabel(midi) {
  const { name, octave } = midiToNote(midi);
  return `${name}${octave}`;
}
