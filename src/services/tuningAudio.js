import { assertMidi } from '../domain/notes.js';
import { volume as validateVolume } from '../storage/records.js';
export const midiFrequency = midi => 440 * 2 ** ((assertMidi(midi) - 69) / 12);
export class TuningAudio {
  constructor({ contextFactory = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('Audio preview is not supported by this browser.');
    return new Context();
  }, onState = () => {}, onError = () => {}, setTimer = (callback, delay) => globalThis.setTimeout(callback, delay), clearTimer = timer => globalThis.clearTimeout(timer) } = {}) {
    this.contextFactory = contextFactory; this.onState = onState; this.onError = onError;
    this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.volume = .35; this.token = 0; this.voices = new Set(); this.timers = new Set();
  }
  setVolume(value) {
    this.volume = validateVolume(value);
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .015);
  }
  later(callback, ms) {
    const timer = this.setTimer(() => { this.timers.delete(timer); callback(); }, ms);
    this.timers.add(timer);
  }
  stop() {
    this.token++;
    for (const timer of this.timers) this.clearTimer(timer);
    this.timers.clear();
    if (this.context) for (const voice of this.voices) {
      const time = this.context.currentTime;
      if (voice.envelope.gain.cancelAndHoldAtTime) voice.envelope.gain.cancelAndHoldAtTime(time);
      else { voice.envelope.gain.cancelScheduledValues(time); voice.envelope.gain.setValueAtTime(0.001, time); }
      voice.envelope.gain.linearRampToValueAtTime(0, time + .025);
      for (const oscillator of voice.oscillators) { try { oscillator.stop(time + .03); } catch { /* already ended */ } }
    }
    this.onState(null);
  }
  pluck(note) {
    const context = this.context, time = context.currentTime;
    const envelope = context.createGain(); envelope.connect(this.master);
    const frequency = midiFrequency(note.midi);
    const voice = { envelope, oscillators: [], gains: [], remaining: 0 }; this.voices.add(voice);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(.22, time + .006);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + 1.15);
    envelope.gain.linearRampToValueAtTime(0, time + 1.2);
    for (const [harmonic, level] of [[1, .72], [2, .2], [3, .08]]) {
      if (frequency * harmonic >= context.sampleRate / 2) continue;
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency * harmonic, time);
      gain.gain.value = level; oscillator.connect(gain); gain.connect(envelope);
      voice.remaining++; voice.oscillators.push(oscillator); voice.gains.push(gain);
      let ended = false;
      oscillator.onended = () => {
        if (ended) return; ended = true;
        oscillator.disconnect(); gain.disconnect();
        if (--voice.remaining === 0) { envelope.disconnect(); this.voices.delete(voice); }
      };
      oscillator.start(time); oscillator.stop(time + 1.21);
    }
    if (!voice.remaining) { envelope.disconnect(); this.voices.delete(voice); throw new Error('This pitch exceeds the audio device sample rate.'); }
    this.onState(note.id);
  }
  // Called only by a Play click. Starting/resuming happens before any asynchronous storage work.
  async play(notes) {
    if (!Array.isArray(notes) || !notes.length) throw new Error('No strings to preview.');
    const sequence = notes.map(note => ({ id: note.id, midi: assertMidi(note.midi) }));
    this.stop(); const token = this.token;
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context = this.contextFactory(); this.master = this.context.createGain();
        this.master.gain.value = this.volume; this.master.connect(this.context.destination);
      }
      await this.context.resume();
      if (token !== this.token) return;
      if (this.context.state !== 'running') throw new Error('Audio is suspended. Try Play again after allowing sound in your browser.');
      const next = index => {
        if (token !== this.token) return;
        if (this.context.state !== 'running') { this.stop(); return; }
        try { this.pluck(sequence[index]); } catch (error) { this.stop(); this.onError(error); return; }
        this.later(() => { if (token === this.token) this.onState(null); }, 1220);
        if (index + 1 < sequence.length) this.later(() => next(index + 1), 1350);
      };
      next(0);
    } catch (error) { if (token === this.token) this.stop(); throw error; }
  }
  async dispose() {
    this.stop();
    if (this.context && this.context.state !== 'closed') await this.context.close();
    for (const voice of this.voices) { voice.envelope.disconnect(); voice.oscillators.forEach(o => o.disconnect()); voice.gains.forEach(g => g.disconnect()); }
    this.voices.clear(); this.master?.disconnect(); this.context = undefined; this.master = undefined;
  }
}
