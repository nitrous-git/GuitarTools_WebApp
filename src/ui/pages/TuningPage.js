import { PITCH_CLASSES, midiToNote, noteLabel, noteToMidi } from '../../domain/notes.js';
import { FACTORY_PRESETS, createDraft, isModified, setStringPitch, stringMap } from '../../domain/tunings.js';
import { createHeadstock, headstockAnchors } from '../headstock.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function option(value, label) { const item = node('option', '', label); item.value = value; return item; }

export function createTuningPage() {
  const element = node('article', 'tuning-page');
  element.setAttribute('aria-labelledby', 'tuning-title');
  // Static markup only; draft and preset content is assigned through DOM properties.
  element.innerHTML = `
    <header class="page-heading"><p class="eyebrow">Instrument workspace / 01</p>
      <h1 id="tuning-title" tabindex="-1">Tuning Library</h1>
      <p>Explore a tuning. Make it your own.</p></header>
    <div class="tuning-workstation">
      <aside class="tuning-surface tuning-library" aria-labelledby="presets-title">
        <div class="tuning-panel-heading"><h2 id="presets-title">Factory presets</h2><span>07</span></div>
        <label class="tuning-field">Search presets<input type="search" id="tuning-search" placeholder="Name or notes…" autocomplete="off"></label>
        <label class="tuning-field">String configuration<select id="tuning-count"><option value="6">6 strings · 3+3</option><option value="7">7 strings · 3+4</option><option value="8">8 strings · 4+4</option></select></label>
        <div id="tuning-presets" aria-label="Tuning presets"></div>
        <p id="tuning-empty" hidden>No matching presets. Try another name or note.</p>
        <p class="tuning-library-note">Factory originals stay unchanged. Each preset has its own editable draft.</p>
      </aside>
      <section class="tuning-surface tuning-stage" aria-labelledby="draft-title">
        <header class="tuning-stage-heading"><div><h2 id="draft-title"></h2><p id="tuning-summary"></p></div><span id="tuning-badge"></span></header>
        <div class="headstock-workspace"><div id="tuning-vector"></div><div id="tuning-peg-controls"></div></div>
        <footer class="tuning-stage-footer"><span>Select a peg or edit a note · physical string order</span><button id="tuning-reset" type="button">Reset changes</button></footer>
      </section>
      <aside class="tuning-surface tuning-details" aria-labelledby="tuning-details-title">
        <div class="tuning-panel-heading"><h2 id="tuning-details-title">Tuning details</h2><span>EDIT</span></div>
        <label class="tuning-field">Tuning name<input id="tuning-name" maxlength="80" required></label>
        <label class="tuning-field">Description / notes<textarea id="tuning-description" maxlength="1000" rows="3"></textarea></label>
        <div class="tuning-note-heading"><h3>Strings · low to high</h3><span>NOTE / OCTAVE</span></div>
        <div id="tuning-note-editor"></div>
        <p class="tuning-range-note">Scientific pitch · C4 = MIDI 60.<br>Full MIDI range: C−1 to G9. String order never follows pitch.</p>
        <p id="tuning-status" role="status" aria-live="polite"></p>
        <p class="tuning-session-note">Session only — drafts remain while navigating, but reset on reload. Saving and audio audition arrive in C4–C5.</p>
      </aside>
    </div>`;
  const $ = selector => element.querySelector(selector);
  const drafts = new Map();
  const lastPreset = new Map();
  let selected = FACTORY_PRESETS[0];
  let activeString = 'string-6';
  let query = '';
  const controls = new Map();
  const draft = () => drafts.get(selected.id);
  const getDraft = preset => {
    if (!drafts.has(preset.id)) drafts.set(preset.id, createDraft(preset));
    return drafts.get(preset.id);
  };
  function renderLibrary() {
    const list = $('#tuning-presets'); list.replaceChildren();
    const terms = query.trim().toLowerCase();
    const matches = FACTORY_PRESETS.filter(p => p.stringCount === selected.stringCount && `${p.name} ${p.notesLowToHigh.map(noteLabel).join(' ')}`.toLowerCase().includes(terms));
    for (const preset of matches) {
      const button = node('button', 'tuning-preset'); button.type = 'button'; button.dataset.preset = preset.id;
      button.setAttribute('aria-pressed', String(preset.id === selected.id));
      const name = node('strong', '', preset.name);
      const notes = node('span', 'preset-notes', preset.notesLowToHigh.map(noteLabel).join(' '));
      const changed = drafts.has(preset.id) && isModified(drafts.get(preset.id), preset);
      const marker = node('span', 'preset-draft', changed ? 'Edited draft' : `${preset.stringCount} strings`);
      button.append(name, notes, marker);
      button.addEventListener('click', () => { selectPreset(preset); $(`[data-preset="${preset.id}"]`)?.focus(); });
      list.append(button);
    }
    $('#tuning-empty').hidden = matches.length !== 0;
  }
  function highlight(id) {
    activeString = id;
    for (const [stringId, refs] of controls) {
      const active = id === stringId;
      refs.row.classList.toggle('is-active', active);
      refs.peg.classList.toggle('is-active', active);
      refs.wrapper.classList.toggle('is-active', active);
    }
  }
  function sync() {
    const value = draft();
    const modified = isModified(value, selected);
    $('#draft-title').textContent = value.name;
    $('#tuning-summary').textContent = `${value.stringCount} STRINGS · ${value.notesLowToHigh.map(noteLabel).join(' – ')}`;
    $('#tuning-badge').textContent = modified ? 'EDITED DRAFT' : 'FACTORY PRESET';
    $('#tuning-reset').disabled = !modified;
    $('#tuning-status').textContent = modified ? 'Edited draft · in memory only' : 'Factory preset · ready to edit';
    for (const string of stringMap(value.stringCount)) {
      const refs = controls.get(string.id);
      const midi = value.notesLowToHigh[string.index];
      const note = midiToNote(midi);
      refs.full.value = midi;
      refs.pitch.value = note.pitchClass;
      refs.octave.value = note.octave;
      for (const item of refs.pitch.options) item.disabled = (note.octave + 1) * 12 + Number(item.value) > 127;
      for (const item of refs.octave.options) item.disabled = (Number(item.value) + 1) * 12 + note.pitchClass > 127;
      refs.output.textContent = `MIDI ${midi}`;
      refs.peg.setAttribute('aria-label', `Edit string ${string.number}, ${noteLabel(midi)}`);
    }
    // Update markers without replacing focused preset buttons.
    for (const button of $('#tuning-presets').children) {
      const preset = FACTORY_PRESETS.find(p => p.id === button.dataset.preset);
      const edited = drafts.has(preset.id) && isModified(drafts.get(preset.id), preset);
      button.querySelector('.preset-draft').textContent = edited ? 'Edited draft' : `${preset.stringCount} strings`;
    }
  }
  function editPitch(id, midi) {
    drafts.set(selected.id, setStringPitch(draft(), id, midi));
    highlight(id); sync();
  }
  function renderEditor() {
    const value = draft(); controls.clear();
    $('#tuning-vector').replaceChildren(createHeadstock(value, id => { highlight(id); controls.get(id).pitch.focus(); }));
    $('#tuning-peg-controls').replaceChildren(); $('#tuning-note-editor').replaceChildren();
    for (const string of headstockAnchors(value.stringCount)) {
      const { id, number, side, y } = string;
      const wrapper = node('label', `peg-control peg-control-${side}`);
      wrapper.style.top = `${y / 620 * 100}%`;
      wrapper.append(node('span', '', `STRING ${number}`));
      const full = node('select'); full.setAttribute('aria-label', `String ${number} full note`);
      for (let midi = 0; midi <= 127; midi++) full.append(option(midi, noteLabel(midi)));
      full.addEventListener('change', () => editPitch(id, Number(full.value)));
      wrapper.append(full); $('#tuning-peg-controls').append(wrapper);
      const row = node('div', 'tuning-string-row'); row.dataset.string = id;
      const title = node('span', 'string-number', `${number}`); title.title = `Physical string ${number}`;
      const pitch = node('select'); pitch.id = `tuning-${id}-pitch`; pitch.setAttribute('aria-label', `String ${number} pitch class`);
      PITCH_CLASSES.forEach((label, index) => pitch.append(option(index, label)));
      const octave = node('select'); octave.setAttribute('aria-label', `String ${number} octave`);
      for (let i = -1; i <= 9; i++) octave.append(option(i, i));
      const change = () => editPitch(id, noteToMidi(Number(pitch.value), Number(octave.value)));
      pitch.addEventListener('change', change); octave.addEventListener('change', change);
      const output = node('span', 'string-midi');
      row.append(title, pitch, octave, output); $('#tuning-note-editor').append(row);
      const peg = $(`.headstock-peg[data-string="${id}"]`);
      controls.set(id, { row, pitch, octave, output, full, wrapper, peg });
      for (const control of [full, pitch, octave]) control.addEventListener('focus', () => highlight(id));
    }
    $('#tuning-name').value = value.name; $('#tuning-description').value = value.description;
    highlight(controls.has(activeString) ? activeString : `string-${value.stringCount}`); sync();
  }
  function selectPreset(preset) {
    selected = preset; getDraft(preset); lastPreset.set(preset.stringCount, preset);
    $('#tuning-count').value = preset.stringCount;
    renderLibrary(); renderEditor();
  }
  $('#tuning-search').addEventListener('input', event => { query = event.target.value; renderLibrary(); });
  $('#tuning-count').addEventListener('change', event => {
    const count = Number(event.target.value);
    query = ''; $('#tuning-search').value = '';
    selectPreset(lastPreset.get(count) || FACTORY_PRESETS.find(p => p.stringCount === count));
  });
  $('#tuning-name').addEventListener('change', event => {
    const name = event.target.value.trim();
    if (!name) {
      event.target.value = draft().name;
      $('#tuning-status').textContent = 'A name is required. The previous name was kept.';
      return;
    }
    drafts.set(selected.id, { ...draft(), name }); event.target.value = name; sync();
  });
  $('#tuning-description').addEventListener('input', event => {
    drafts.set(selected.id, { ...draft(), description: event.target.value }); sync();
  });
  $('#tuning-reset').addEventListener('click', () => {
    drafts.set(selected.id, createDraft(selected)); renderEditor();
    $('#tuning-name').focus();
  });
  selectPreset(selected);
  return { element, show() { element.hidden = false; }, hide() { element.hidden = true; } };
}
