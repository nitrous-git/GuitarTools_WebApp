import { renderFretboard, noteName } from '../fretboard.js';
import { tuningLowToHigh } from '../../services/fretboardModel.js';
export function createPlayerPage() {
  const element = document.createElement('article');
  element.className = 'player-page';
  element.setAttribute('aria-labelledby', 'player-title');
  element.hidden = true;
  element.append(document.getElementById('player-template').content.cloneNode(true));
  const $ = id => element.querySelector(`#${id}`);
  const log = message => { $('log').textContent = `${new Date().toLocaleTimeString()} ${message}\n${$('log').textContent}`.slice(0, 8000); };
  const failure = e => { $('error').hidden = false; $('error').textContent = e.message || String(e); log($('error').textContent); };
  const run = fn => async () => { try { $('error').hidden = true; await fn(); } catch (e) { failure(e); } };
  const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  let adapter;
  let initialization;
  let externalLoad = 0;
  let visible = false;
  let renderFrame;
  async function initialize(skipDemo = false) {
    try {
      const { AlphaTabAdapter } = await import('../../services/alphaTabAdapter.js');
      adapter = new AlphaTabAdapter($('score'));
      for (let n = -12; n <= 12; n++) $('pitch').add(new Option(n === 0 ? 'Original (0)' : `${n > 0 ? '+' : ''}${n} semitones`, String(n), n === 0, n === 0));
      adapter.addEventListener('status', e => { $('status').textContent = e.detail; log(e.detail); });
      adapter.addEventListener('failure', e => failure(e.detail));
      adapter.addEventListener('audio', () => { $('play').disabled = false; });
      adapter.addEventListener('state', e => { $('play').textContent = e.detail === 1 ? 'Pause' : 'Play'; });
      adapter.addEventListener('rendered', () => { $('status').textContent = 'Score rendered. Enable audio, then Play.'; log('renderFinished'); });
      adapter.addEventListener('position', e => {
        const p = e.detail;
        $('seek').max = p.endTick; $('seek').value = p.currentTick;
        $('time').textContent = `${time(p.currentTime)} / ${time(p.endTime)}`;
        $('tempo').textContent = `Score ${p.originalTempo.toFixed(1)} BPM · playback ${p.modifiedTempo.toFixed(1)} BPM`;
      });
      adapter.addEventListener('beats', e => renderFretboard($('fretboard'), $('diagnostic'), adapter.selectedTrack, e.detail));
      adapter.addEventListener('timeline', e => {
        for (const id of ['loop-start', 'loop-end']) {
          $(id).replaceChildren();
          e.detail.forEach((bar, index) => $(id).add(new Option(`${index + 1}: source bar ${bar.masterBar.index + 1}`, index)));
        }
        $('loop-end').selectedIndex = Math.min(1, e.detail.length - 1);
        $('seek').max = e.detail.at(-1)?.end || 1; $('seek').disabled = false;
        log(`MIDI ready: ${e.detail.length} playback bar occurrences`);
      });
      adapter.addEventListener('score', e => {
        const score = e.detail;
        $('pitch').value = '0'; $('speed').value = '100'; $('loop').checked = false;
        $('seek').value = '0'; $('time').textContent = '0:00 / —'; $('stop').disabled = false;
        $('metadata').textContent = `${score.title || 'Untitled'} — ${score.artist || 'Unknown artist'} · Initial tempo ${score.tempo} BPM (tempo changes retained) · ${adapter.source}`;
        $('tracks').replaceChildren(); $('fret-track').replaceChildren();
        const visible = new Set([score.tracks[0]]);
        score.tracks.forEach(track => {
          const row = document.createElement('tr'); const name = document.createElement('th');
          name.scope = 'row'; name.textContent = `${track.index + 1}. ${track.name || 'Unnamed'} — ${track.staves.map(s => s.isPercussion ? 'percussion' : `${s.tuning.length} strings: ${tuningLowToHigh(s).map(noteName).join(' ')}; capo ${s.capo}`).join(' / ')}`;
          row.append(name);
          for (const kind of ['visible', 'mute', 'solo']) {
            const cell = document.createElement('td'), input = document.createElement('input');
            input.type = 'checkbox'; input.setAttribute('aria-label', `${kind} ${track.name || track.index + 1}`);
            input.checked = kind === 'visible' ? visible.has(track) : kind === 'mute' ? track.playbackInfo.isMute : track.playbackInfo.isSolo;
            input.addEventListener('change', () => {
              try {
                if (kind === 'visible') {
                  if (!input.checked && visible.size === 1) { input.checked = true; throw new Error('Keep at least one score track visible.'); }
                  input.checked ? visible.add(track) : visible.delete(track); adapter.visible([...visible]);
                } else adapter.mix(track, kind, input.checked);
              } catch (e) { failure(e); }
            }); cell.append(input); row.append(cell);
          }
          $('tracks').append(row); $('fret-track').add(new Option(track.name || `Track ${track.index + 1}`, track.index));
        });
        $('fret-track').value = String(adapter.selectedTrack.index);
        $('channels').textContent = `MIDI channels are zero-based. Pitch excludes: ${adapter.policy.excluded.map(t => t.name || t.index + 1).join(', ') || 'none'}. ${adapter.policy.shared.length ? `Shared channels (mute/solo/pitch can couple): ${adapter.policy.shared.join('; ')}` : 'No shared track channels detected.'}`;
        log(`scoreLoaded: ${score.title}; ${score.tracks.length} tracks`);
      });
      $('file').addEventListener('change', run(async () => { const file = $('file').files[0]; if (file) await adapter.importFile(file); $('file').value = ''; }));
      $('sample').addEventListener('click', run(() => adapter.sample()));
      $('pitch-sample').addEventListener('click', run(() => adapter.sample('pitch-e4')));
      $('audio').addEventListener('click', run(() => adapter.enableAudio()));
      $('play').addEventListener('click', run(() => adapter.playPause()));
      $('stop').addEventListener('click', () => adapter.stop());
      $('seek').addEventListener('input', () => adapter.seek(Number($('seek').value)));
      $('speed').addEventListener('change', () => adapter.speed(Number($('speed').value)));
      $('pitch').addEventListener('change', run(() => adapter.applyPitch(Number($('pitch').value))));
      $('reset-pitch').addEventListener('click', run(() => { adapter.applyPitch(0); $('pitch').value = '0'; }));
      $('fret-track').addEventListener('change', () => adapter.selectTrack(adapter.api.score.tracks[Number($('fret-track').value)]));
      const loop = run(() => adapter.loop(Number($('loop-start').value), Number($('loop-end').value), $('loop').checked));
      for (const id of ['loop', 'loop-start', 'loop-end']) $(id).addEventListener('change', loop);
      for (const id of ['layout', 'bars', 'zoom']) $(id).addEventListener('change', run(() => {
        $('bars').disabled = $('layout').value !== 'page'; $('zoom-value').textContent = `${$('zoom').value}%`;
        adapter.layout($('layout').value, Number($('bars').value), Number($('zoom').value) / 100);
      }));
      element.addEventListener('keydown', e => {
        if (!visible || e.code !== 'Space' || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.target.isContentEditable || /INPUT|SELECT|TEXTAREA|BUTTON|A|SUMMARY/.test(e.target.tagName)) return;
        e.preventDefault(); run(() => adapter.playPause())();
      });
      // Explicit opt-in test hook; absent during normal use.
      if (new URLSearchParams(location.search).has('test')) window.stageB = adapter;
      if (!skipDemo) await adapter.sample();
    } catch (e) { console.error(e); failure(`Startup failed: ${e.message}. Use HTTP hosting and check the bundled SDK files.`); throw e; }

  }
  return {
    element,
    async loadFile(file) {
      const request = ++externalLoad;
      initialization ||= initialize(true);
      await initialization;
      if (request !== externalLoad) return;
      await adapter.importFile(file);
    },
    show() {
      visible = true;
      element.hidden = false;
      if (!initialization) {
        initialization = initialize();
        initialization.catch(() => {});
      } else if (adapter?.api.score) {
        // Existing public render API; no score reload, MIDI rebuild or new synth.
        cancelAnimationFrame(renderFrame);
        renderFrame = requestAnimationFrame(() => { if (visible) adapter.api.render(); });
      }
    },
    hide() {
      visible = false;
      cancelAnimationFrame(renderFrame);
      if (adapter) {
        clearTimeout(adapter.audioWatchdog);
        if (adapter.api.playerState === 1) adapter.api.pause();
      }
      element.hidden = true;
    }
  };
}
