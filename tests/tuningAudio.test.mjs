import test from 'node:test';
import assert from 'node:assert/strict';
import { TuningAudio, midiFrequency } from '../src/services/tuningAudio.js';
function harness() {
  let now = 0, nextId = 0, contexts = 0;
  const timers = new Map(), events = [], frequencies = [], oscillators = [];
  const setTimer = (fn, delay) => { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; };
  const clearTimer = id => timers.delete(id);
  const advance = ms => {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!next) break; timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelAndHoldAtTime() {} });
  const context = { state: 'suspended', sampleRate: 48000, destination: {}, get currentTime() { return now / 1000; },
    async resume() { this.state = 'running'; }, async close() { this.state = 'closed'; },
    createGain: () => ({ gain: param(), connect() {}, disconnect() { this.disconnected = true; } }),
    createOscillator() {
      let stopTimer;
      const oscillator = { frequency: { setValueAtTime(f) { frequencies.push(f); } }, connect() {}, disconnect() { this.disconnected = true; }, start() {}, stop(time) { clearTimer(stopTimer); stopTimer = setTimer(() => oscillator.onended?.(), Math.max(0, time * 1000 - now)); } };
      oscillators.push(oscillator); return oscillator;
    }
  };
  const audio = new TuningAudio({ contextFactory: () => { contexts++; return context; }, onState: value => { if (value) events.push(value); }, setTimer, clearTimer });
  return { audio, advance, events, frequencies, oscillators, context, contexts: () => contexts };
}
test('MIDI pitch formula is correct over full domain, including low extended-range strings', () => {
  assert.equal(midiFrequency(69), 440);
  assert(Math.abs(midiFrequency(40) - 82.406889) < .00001);
  assert(Math.abs(midiFrequency(35) - 61.735413) < .00001);
  assert(Math.abs(midiFrequency(30) - 46.249303) < .00001);
  for (let midi = 0; midi < 116; midi++) assert(Math.abs(midiFrequency(midi + 12) / midiFrequency(midi) - 2) < 1e-12);
  for (const value of [-1, 128, NaN, '69', 40.5]) assert.throws(() => midiFrequency(value));
});
test('Play All uses provided physical order, including non-monotonic pitches', async () => {
  const h = harness(); assert.equal(h.contexts(), 0);
  await h.audio.play([{ id: 'string-3', midi: 84 }, { id: 'string-2', midi: 30 }, { id: 'string-1', midi: 64 }]);
  h.advance(4000);
  assert.deepEqual(h.events, ['string-3', 'string-2', 'string-1']);
  assert.deepEqual([h.frequencies[0], h.frequencies[3], h.frequencies[6]], [84, 30, 64].map(midiFrequency));
  assert.equal(h.audio.voices.size, 0); assert.equal(h.audio.timers.size, 0);
});
test('stop and replacement cancel queued strings; repeated clicks reuse context and release nodes', async () => {
  const h = harness(), notes = [{ id: 'low', midi: 30 }, { id: 'high', midi: 64 }];
  await h.audio.play(notes); h.audio.stop(); h.advance(3000);
  assert.deepEqual(h.events, ['low']); assert.equal(h.audio.voices.size, 0);
  for (let i = 0; i < 30; i++) await h.audio.play(notes);
  await h.audio.play([{ id: 'individual', midi: 69 }]); h.advance(4000);
  assert(!h.events.includes('high')); assert.equal(h.contexts(), 1);
  assert.equal(h.audio.voices.size, 0); assert.equal(h.audio.timers.size, 0);
  assert(h.oscillators.every(o => o.disconnected));
  h.audio.setVolume(.25); assert.equal(h.audio.volume, .25); assert.throws(() => h.audio.setVolume(1.1));
  await h.audio.dispose(); assert.equal(h.context.state, 'closed');
});
test('stop during pending resume prevents late starts; unsupported audio errors reject visibly', async () => {
  const h = harness(); let resume;
  h.context.resume = () => new Promise(resolve => { resume = () => { h.context.state = 'running'; resolve(); }; });
  const pending = h.audio.play([{ id: 'low', midi: 30 }]); h.audio.stop(); resume(); await pending;
  assert.deepEqual(h.events, []);
  const broken = new TuningAudio({ contextFactory() { throw new Error('Unsupported audio'); } });
  await assert.rejects(broken.play([{ id: 'one', midi: 69 }]), /Unsupported/);
});
