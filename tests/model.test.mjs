import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as at from '../assets/vendor/alphatab/alphaTab.mjs';
import { position, diagnostic, tuningLowToHigh, channelPolicy } from '../src/services/fretboardModel.js';
const fixture = name => at.importer.ScoreLoader.loadAlphaTex(fs.readFileSync(new URL(`./fixtures/public/${name}.tex`, import.meta.url), 'utf8'));
test('6/7/8 string mapping, chord and rest use original source coordinates', () => {
  const s = fixture('stage-b');
  for (const [i, count] of [6,7,8].entries()) {
    const staff = s.tracks[i].staves[0], beat = staff.bars[0].voices[0].beats[0];
    assert.equal(staff.tuning.length, count);
    assert.deepEqual(tuningLowToHigh(staff), [...staff.tuning].reverse());
    assert.equal(position(beat.notes[0]).string, i === 0 ? 1 : count);
  }
  const t = s.tracks[0], beats = t.staves[0].bars[0].voices[0].beats;
  assert.equal(diagnostic(t,[beats[0]]).active.length,3);
  assert.equal(diagnostic(t,[beats[2]]).active.length,0);
  assert.equal(diagnostic(t,[beats[2]]).measure.length,5);
  assert.equal(position(s.tracks[3].staves[0].bars[0].voices[0].beats[0].notes[0]),null);
});
test('shared percussion channels exclude the entire melodic track from pitch', () => {
  const s=fixture('stage-b');
  assert.equal(channelPolicy(s.tracks).safe.length,3);
  s.tracks[0].playbackInfo.secondaryChannel=9;
  const p=channelPolicy(s.tracks);
  assert.equal(p.safe.length,2); assert.equal(p.shared.length,1);
  s.tracks[1].playbackInfo.primaryChannel=s.tracks[2].playbackInfo.primaryChannel;
  assert.equal(channelPolicy(s.tracks).shared.length,2);
});
test('E4 reference is MIDI 64, fret 0, conventional string 1',()=>{
  const n=fixture('pitch-e4').tracks[0].staves[0].bars[0].voices[0].beats[0].notes[0];
  assert.equal(n.realValue,64); assert.equal(position(n).string,1); assert.equal(n.fret,0);
});
test('content parser rejects corrupt bytes',()=>assert.throws(()=>at.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode('not guitar pro'))));
