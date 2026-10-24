import * as at from '../../assets/vendor/alphatab/alphaTab.mjs';
import { channelPolicy } from './fretboardModel.js';
const vendor = new URL('../../assets/vendor/alphatab/', import.meta.url);
export class AlphaTabAdapter extends EventTarget {
  constructor(element) {
    super();
    this.api = new at.AlphaTabApi(element, {
      core: { fontDirectory: new URL('font/', vendor).href, useWorkers: true, enableLazyLoading: false },
      display: { layoutMode: at.LayoutMode.Page, barsPerRow: 2, scale: 1 },
      player: { playerMode: at.PlayerMode.EnabledSynthesizer, soundFont: null,
        enableCursor: true, enableUserInteraction: true, scrollElement: '#score-scroll' }
    });
    this.offset = 0;
    this.audioReady = false;
    this.busy = false;
    this.originalBytes = null;
    const emit = (name, detail) => this.dispatchEvent(new CustomEvent(name, { detail }));
    this.emit = emit;
    this.api.error.on(e => emit('failure', `alphaTab: ${e.message || e}. Check the file and local asset requests.`));
    this.api.player.ready.on(() => { this.playerReady = true; emit('status', 'Synthesizer ready. Enable audio to load the local SoundFont.'); });
    this.api.soundFontLoaded.on(() => { this.audioReady = true; this.audioLoading = false; emit('audio', true); emit('status', 'SoundFont loaded. Press Play.'); });
    this.api.player.ready.on(() => this.api.player.soundFontLoadFailed.on(e => { this.audioLoading = false; emit('failure', `SoundFont failed: ${e.message || e}. Check assets/vendor/alphatab/soundfont/sonivox.sf2, then retry Enable audio.`); }));
    this.api.scoreLoaded.on(score => {
      this.offset = 0;
      this.policy = channelPolicy(score.tracks);
      this.selectedTrack = score.tracks.find(t => t.staves.some(s => s.tuning.length && !s.isPercussion)) || score.tracks[0];
      emit('score', score);
    });
    this.api.midiLoaded.on(() => { this.applyPitch(this.offset); emit('timeline', this.api.tickCache.masterBars); this.refreshBeats(); });
    this.api.renderFinished.on(() => { this.busy = false; emit('rendered', null); });
    this.api.activeBeatsChanged.on(e => emit('beats', e.activeBeats));
    this.api.playerPositionChanged.on(e => { emit('position', e); if (e.isSeek) this.refreshBeats(); });
    this.api.playerStateChanged.on(e => emit('state', e.state));
    this.api.playerFinished.on(() => emit('beats', []));
  }
  async sample(name = 'stage-b') {
    const response = await fetch(new URL(`../../tests/fixtures/public/${name}.tex`, import.meta.url));
    if (!response.ok) throw new Error(`Sample unavailable (HTTP ${response.status}). Serve the repository root over HTTP.`);
    const score = at.importer.ScoreLoader.loadAlphaTex(await response.text(), this.api.settings);
    this.replace(score, null, `Bundled original alphaTex: ${name}`);
  }
  async importFile(file) {
    if (!file.size) throw new Error(`${file.name}: empty file. Choose a valid Guitar Pro file.`);
    if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: exceeds this POC's 20 MiB limit.`);
    if (!/\.(gp[345]?|gpx)$/i.test(file.name)) throw new Error('Choose .gp3, .gp4, .gp5, .gpx or .gp.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Content parser, not the filename, determines whether this is supported.
    let score;
    try { score = at.importer.ScoreLoader.loadScoreFromBytes(bytes.slice(), this.api.settings); }
    catch (e) { throw new Error(`${file.name}: could not parse Guitar Pro content (${e.message}). Choose an intact supported file; the previous score is unchanged.`); }
    this.replace(score, bytes, `${file.name} (${bytes.length.toLocaleString()} bytes; parsed by content)`);
  }
  replace(score, bytes, source) {
    if (!score.tracks.length) throw new Error('The file contains no tracks.');
    this.stop();
    this.api.playbackRange = null;
    this.api.isLooping = false;
    this.api.playbackSpeed = 1;
    // Reset every old channel, including channels absent in the next score.
    if (this.api.score && this.playerReady) this.api.changeTrackTranspositionPitch(this.api.score.tracks, 0);
    this.originalBytes = bytes;
    this.source = source;
    this.busy = true;
    this.api.load(score, [0]);
  }
  async enableAudio() {
    if (!this.playerReady) throw new Error('Synthesizer is still starting. Try Enable audio again shortly.');
    this.api.player.output.activate(); // Must remain in the user-gesture call stack.
    if (this.audioReady || this.audioLoading) return;
    this.audioLoading = true;
    try {
      const response = await fetch(new URL('soundfont/sonivox.sf2', vendor));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!this.api.loadSoundFont(new Uint8Array(await response.arrayBuffer()), false)) throw new Error('SDK refused SoundFont data');
    } catch (e) {
      this.audioLoading = false;
      throw new Error(`SoundFont unavailable (${e.message}). Check assets/vendor/alphatab/soundfont/sonivox.sf2 and retry Enable audio.`);
    }
  }
  playPause() {
    if (!this.audioReady || !this.api.isReadyForPlayback) throw new Error('Enable audio first and wait for the score/SoundFont to finish loading.');
    this.api.player.output.activate();
    clearTimeout(this.audioWatchdog);
    if (this.api.playerState === at.synth.PlayerState.Playing) this.api.pause();
    else {
      if (!this.api.play()) throw new Error('Playback did not start. Click Play again; check browser audio permissions.');
      const start = this.api.tickPosition;
      this.audioWatchdog = setTimeout(() => {
        if (this.api.playerState === at.synth.PlayerState.Playing && this.api.tickPosition === start) {
          this.stop();
          this.emit('failure', 'Audio did not advance. Allow browser audio and check alphaTab.worklet.mjs in the local vendor folder, then retry Play.');
        }
      }, 2500);
    }
  }
  stop() { clearTimeout(this.audioWatchdog); this.api.stop(); this.emit('beats', []); }
  seek(tick) { this.api.tickPosition = tick; this.refreshBeats(); }
  refreshBeats() {
    const result = this.selectedTrack && this.api.tickCache?.findBeat(new Set([this.selectedTrack.index]), this.api.tickPosition);
    this.emit('beats', result ? result.beatLookup.highlightedBeats.map(item => item.beat) : []);
  }
  selectTrack(track) { this.selectedTrack = track; this.refreshBeats(); }
  layout(mode, bars, scale) {
    this.api.settings.display.layoutMode = mode === 'page' ? at.LayoutMode.Page : at.LayoutMode.Horizontal;
    this.api.settings.display.barsPerRow = bars;
    this.api.settings.display.scale = scale;
    this.api.updateSettings();
    this.api.render();
  }
  visible(tracks) { if (!tracks.length) throw new Error('Keep at least one track visible.'); this.api.renderTracks(tracks); }
  mix(track, kind, value) { this.api[kind === 'mute' ? 'changeTrackMute' : 'changeTrackSolo']([track], value); }
  speed(percent) { this.api.playbackSpeed = percent / 100; }
  applyPitch(value) {
    if (!Number.isInteger(value) || value < -12 || value > 12) throw new Error('Pitch must be an integer from -12 to +12.');
    if (!this.playerReady || !this.policy) return;
    // Channel-level operation only. Never touch score transposition, tuning or notes.
    this.api.changeTrackTranspositionPitch(this.policy.safe, value);
    this.offset = value;
  }
  loop(start, end, enabled) {
    const bars = this.api.tickCache?.masterBars || [];
    if (!enabled) { this.api.isLooping = false; this.api.playbackRange = null; return; }
    if (!bars[start] || !bars[end] || end < start) throw new Error('Choose an end occurrence at or after the start.');
    this.api.playbackRange = { startTick: bars[start].start, endTick: bars[end].end };
    this.api.isLooping = true;
    this.seek(bars[start].start);
  }
}
