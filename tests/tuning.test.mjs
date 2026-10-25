import test from 'node:test';
import assert from 'node:assert/strict';
import { midiToNote, noteToMidi, noteLabel } from '../src/domain/notes.js';
import { FACTORY_PRESETS, createDraft, validateTuning, setStringPitch, stringMap, isModified } from '../src/domain/tunings.js';
import { headstockAnchors } from '../src/ui/headstock.js';

test('all 128 MIDI pitches round-trip with scientific octaves', () => {
  for (let midi = 0; midi <= 127; midi++) {
    const note = midiToNote(midi);
    assert.equal(noteToMidi(note.pitchClass, note.octave), midi);
  }
  assert.deepEqual([0, 11, 12, 59, 60, 64, 69, 127].map(noteLabel), ['C-1', 'B-1', 'C0', 'B3', 'C4', 'E4', 'A4', 'G9']);
  for (const invalid of [-1, 128, 1.5, NaN, Infinity, '60', null]) assert.throws(() => midiToNote(invalid));
  for (const args of [[12, 4], [-1, 4], [0, -2], [8, 9], [0, 1.5], ['C', 4]]) assert.throws(() => noteToMidi(...args));
});
test('factory pitches are accurate in low physical string order', () => {
  const expected = ['E2 A2 D3 G3 B3 E4', 'D2 A2 D3 G3 B3 E4', 'C2 G2 C3 F3 A3 D4', 'D2 A2 D3 G3 A3 D4', 'D2 G2 D3 G3 B3 D4', 'B1 E2 A2 D3 G3 B3 E4', 'F#1 B1 E2 A2 D3 G3 B3 E4'];
  assert.deepEqual(FACTORY_PRESETS.map(p => p.notesLowToHigh.map(noteLabel).join(' ')), expected);
  for (const preset of FACTORY_PRESETS) assert.deepEqual(validateTuning(preset), []);
});
test('factory records and notes are frozen; edits and drafts are independent', () => {
  const preset = FACTORY_PRESETS[0];
  assert.throws(() => FACTORY_PRESETS.push(preset));
  assert.throws(() => { preset.name = 'Changed'; });
  assert.throws(() => { preset.notesLowToHigh[0] = 0; });
  const a = createDraft(preset), b = createDraft(preset);
  const changed = setStringPitch(a, 'string-6', 72);
  assert.equal(a.notesLowToHigh[0], 40); assert.equal(b.notesLowToHigh[0], 40);
  assert.equal(changed.notesLowToHigh[0], 72); assert(isModified(changed, preset));
  assert(!isModified(createDraft(preset), preset));
  b.notesLowToHigh[1] = 0;
  assert.equal(preset.notesLowToHigh[1], 45);
});
test('validation rejects malformed, sparse, out-of-range records; accepts reentrant pitches', () => {
  const preset = FACTORY_PRESETS[0];
  for (const value of [null, {}, { ...preset, name: ' ' }, { ...preset, name: 'a'.repeat(81) }, { ...preset, description: null }, { ...preset, description: 'a'.repeat(1001) }, { ...preset, stringCount: 5 }, { ...preset, notesLowToHigh: [40] }, { ...preset, notesLowToHigh: Array(6) }, { ...preset, notesLowToHigh: [40, 45, 50, 55, 59, 128] }]) {
    assert(validateTuning(value).length > 0); assert.throws(() => createDraft(value));
  }
  const reentrant = { ...preset, notesLowToHigh: [72, 45, 50, 50, 20, 64] };
  assert.deepEqual(validateTuning(reentrant), []);
  assert.deepEqual(createDraft(reentrant).notesLowToHigh, reentrant.notesLowToHigh);
  assert.deepEqual(setStringPitch(reentrant, 'string-1', 0).notesLowToHigh, [72, 45, 50, 50, 20, 0]);
  assert.throws(() => setStringPitch(preset, 'string-7', 40));
});
test('explicit 3+3 / 3+4 / 4+4 mapping has unique ordered nut and peg anchors', () => {
  const expected = {
    6: [[6, 'left', 2], [5, 'left', 1], [4, 'left', 0], [3, 'right', 0], [2, 'right', 1], [1, 'right', 2]],
    7: [[7, 'left', 2], [6, 'left', 1], [5, 'left', 0], [4, 'right', 0], [3, 'right', 1], [2, 'right', 2], [1, 'right', 3]],
    8: [[8, 'left', 3], [7, 'left', 2], [6, 'left', 1], [5, 'left', 0], [4, 'right', 0], [3, 'right', 1], [2, 'right', 2], [1, 'right', 3]]
  };
  for (const count of [6, 7, 8]) {
    assert.deepEqual(stringMap(count).map(s => [s.number, s.side, s.row]), expected[count]);
    const anchors = headstockAnchors(count);
    assert.equal(new Set(anchors.map(a => `${a.x},${a.y}`)).size, count);
    assert.equal(new Set(anchors.map(a => a.id)).size, count);
    assert(anchors.every((a, i) => a.index === i && (!i || a.nutX > anchors[i - 1].nutX)));
  }
  for (const invalid of [0, 5, 9, '6']) assert.throws(() => stringMap(invalid));
});
