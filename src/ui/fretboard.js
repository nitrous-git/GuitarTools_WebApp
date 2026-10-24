import { diagnostic, tuningLowToHigh } from '../services/fretboardModel.js';
export const noteName = midi => `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
export function renderFretboard(container, output, track, beats) {
  container.replaceChildren();
  if (!track) { output.textContent = 'No track selected.'; return; }
  const data = diagnostic(track, beats);
  const staves = track.staves.filter(s => s.tuning.length && !s.isPercussion);
  if (!staves.length) { output.textContent = 'This track has no fretted strings (e.g. percussion or piano).'; return; }
  for (const staff of staves) {
    const active = data.active.filter(p => p.staff === staff.index);
    const measure = data.measure.filter(p => p.staff === staff.index);
    const lastFret = Math.max(12, ...measure.map(p => p.fret), ...active.map(p => p.fret));
    const table = document.createElement('table'); table.className = 'fret-grid';
    const caption = table.createCaption(); caption.textContent = `Staff ${staff.index + 1} · capo ${staff.capo} · tuning low → high: ${tuningLowToHigh(staff).map(noteName).join(' ')}`;
    const head = table.createTHead().insertRow();
    for (const text of ['String', ...Array.from({ length: lastFret + 1 }, (_, i) => i)]) { const th = document.createElement('th'); th.textContent = text; head.append(th); }
    const body = table.createTBody();
    staff.tuning.forEach((pitch, i) => {
      const row = body.insertRow(); const label = document.createElement('th'); label.textContent = `${i + 1} · ${noteName(pitch)}`; row.append(label);
      for (let fret = 0; fret <= lastFret; fret++) {
        const cell = row.insertCell(); const matches = p => p.string === i + 1 && p.fret === fret;
        const on = active.some(matches), inBar = measure.some(matches);
        cell.className = on ? 'active' : inBar ? 'measure' : '';
        cell.textContent = on || inBar ? String(fret) : '·';
        cell.title = `String ${i + 1}, fret ${fret}${on ? ', active beat' : inBar ? ', in measure' : ''}`;
      }
    });
    container.append(table);
  }
  output.textContent = JSON.stringify({ sourceMeasures: data.bars, beatIds: data.beats, active: data.active }, null, 2);
}
