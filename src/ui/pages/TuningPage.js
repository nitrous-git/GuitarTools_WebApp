import { PITCH_CLASSES, midiToNote, noteLabel, noteToMidi } from '../../domain/notes.js';
import { FACTORY_PRESETS, createDraft, isModified, setStringPitch, stringMap } from '../../domain/tunings.js';
import { createHeadstock, headstockAnchors } from '../headstock.js';
import { tuningRepository } from '../../storage/tuningRepository.js';
import { storageMessage } from '../../storage/db.js';
import { parseBackup, serializeBackup, previewMerge, downloadBackup, MAX_BACKUP_BYTES } from '../../storage/tuningBackup.js';
import { TuningAudio } from '../../services/tuningAudio.js';
import { tuningDialog } from '../tuningDialog.js';
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function option(value, label) { const item = node('option', '', label); item.value = value; return item; }
const keyOf = source => `${source.isNew ? 'draft' : source.createdAt ? 'saved' : 'factory'}:${source.id}`;
function editable(source) {
  const result = { ...source, ...createDraft(source), categoryIds: [...(source.categoryIds || [])], favorite: source.favorite ?? false };
  if (source.createdAt && !source.presetId) delete result.presetId;
  return result;
}
function changed(value, baseline) {
  return isModified(value, baseline) || value.favorite !== (baseline.favorite ?? false) || JSON.stringify([...value.categoryIds].sort()) !== JSON.stringify([...(baseline.categoryIds || [])].sort());
}

export function createTuningPage() {
  const element = node('article', 'tuning-page'); element.setAttribute('aria-labelledby', 'tuning-title');
  // Static markup only. Saved/imported text is assigned using textContent or form values.
  element.innerHTML = `
    <header class="page-heading"><div><p class="eyebrow">Instrument workspace / 01</p><h1 id="tuning-title" tabindex="-1">Tuning Library</h1><p>Your tunings, ready whenever you pick up your guitar.</p></div>
      <div class="tuning-header-actions"><div class="tuning-segment" role="group" aria-label="Active string configuration"><button data-count="6">6 strings</button><button data-count="7">7 strings</button><button data-count="8">8 strings</button></div><button id="tuning-new">+ New tuning</button></div>
    </header>
    <div class="tuning-workstation">
      <aside class="tuning-surface tuning-library" aria-labelledby="presets-title">
        <div class="tuning-panel-heading"><h2 id="presets-title">Your Tunings</h2><span id="tuning-library-count"></span></div>
        <label class="tuning-search-label"><span class="visually-hidden">Search tunings</span><input type="search" id="tuning-search" placeholder="⌕  Search tunings…" autocomplete="off"></label>
        <div class="tuning-list-heading"><span>RECENT &amp; PRESETS</span><details class="tuning-filters"><summary>Filter / sort</summary><div>
          <label class="tuning-field">Library view<select id="tuning-view"><option value="all">All tunings</option><option value="factory">Factory Presets</option><option value="saved">My Tunings</option><option value="favorites">Favorites</option></select></label>
          <label class="tuning-field">Category filter<select id="tuning-category-filter"><option value="">All categories</option></select></label>
          <label class="tuning-field">Sort by<select id="tuning-sort"><option value="preset">Preset order</option><option value="name">Name</option><option value="updated">Recently updated</option><option value="created">Recently created</option></select></label>
        </div></details></div>
        <div id="tuning-presets" aria-label="Tuning presets and saved tunings"></div>
        <p id="tuning-empty" hidden>No matches. Try another collection or search.</p>
        <section class="tuning-collections" aria-label="Collections"><div class="tuning-list-heading"><span>COLLECTIONS</span><button id="tuning-manage-collections" aria-label="Manage categories">+</button></div><div id="tuning-collections"></div></section>
        <p id="tuning-storage-status" role="status">Opening local storage…</p>
      </aside>
      <section class="tuning-surface tuning-stage" aria-labelledby="draft-title">
        <header class="tuning-stage-heading"><div><h2 id="draft-title"></h2><p id="tuning-summary"></p></div><span id="tuning-badge"></span></header>
        <div class="headstock-workspace"><div id="tuning-vector"></div><div id="tuning-peg-controls"></div></div>
        <p class="tuning-stage-legend">▸ Click a note to change pitch <span>▶ Audition individual strings</span></p>
        <footer class="tuning-stage-footer"><div class="tuning-audio-controls"><button id="tuning-play-all">▶ Play all strings</button><button id="tuning-stop">Stop</button><label>Preview volume<input id="tuning-volume" type="range" min="0" max="1" step="0.01" value="0.35"></label></div><button id="tuning-reset">↺ Reset changes</button><p id="tuning-audio-status" role="status">Select ▶ to hear the current draft.</p></footer>
      </section>
      <aside class="tuning-surface tuning-details" aria-labelledby="tuning-details-title">
        <div class="tuning-panel-heading"><h2 id="tuning-details-title">Tuning details</h2><span>EDIT MODE</span></div>
        <div class="tuning-editor-body">
          <label class="tuning-field">Tuning name<input id="tuning-name" maxlength="80" required></label>
          <label class="tuning-field">String configuration<select id="tuning-count"><option value="6">6-string guitar</option><option value="7">7-string guitar</option><option value="8">8-string guitar</option></select></label>
          <div class="tuning-note-heading"><h3>Notes · low to high</h3></div><div id="tuning-note-chips"></div><div id="tuning-note-editor"></div>
          <details class="tuning-category-assignment"><summary>Collection <span id="tuning-collection-summary"></span></summary><div id="tuning-category-choices"></div></details>
          <label class="tuning-field">Description / notes<textarea id="tuning-description" maxlength="1000" rows="4"></textarea></label>
          <div id="tuning-metadata"></div>
          <p class="tuning-reference"><strong>♬ Reference pitch playback</strong><br>Audition open strings by ear. A4 = 440 Hz.<br>No microphone or account required.</p>
        </div>
        <p id="tuning-status" role="status" aria-live="polite"></p>
        <div class="tuning-save-actions"><details class="tuning-more"><summary>⋯ More</summary><div class="tuning-more-content">
          <button id="tuning-save-as">Save as New</button><button id="tuning-duplicate">Duplicate</button>
          <label class="tuning-favorite"><input id="tuning-favorite" type="checkbox"> Favorite <span>(save to apply)</span></label><button id="tuning-delete">Delete saved tuning</button>
          <details class="tuning-category-management"><summary>Manage categories</summary><button id="tuning-category-new">Create category</button><label>Category<select id="tuning-category-manage"></select></label><div><button id="tuning-category-rename">Rename</button><button id="tuning-category-delete">Delete category</button></div></details>
          <div class="tuning-backup"><button id="tuning-export">Export Backup</button><button id="tuning-import">Import Backup</button><input id="tuning-import-file" type="file" accept=".json,application/json" hidden></div><button id="tuning-refresh">Refresh storage</button>
          <p>Unsaved drafts stay in this tab. Save before closing; export backups regularly.</p>
        </div></details><button id="tuning-save">✓ Save tuning</button></div>
      </aside>
    </div>`;
  const $ = selector => element.querySelector(selector);
  const drafts = new Map(), baselines = new Map(), controls = new Map(), lastPreset = new Map();
  let selected = FACTORY_PRESETS[0], activeString = 'string-6', query = '', saved = [], categories = [];
  let family = '', newSequence = 0;
  let storageReady = false, busy = false, message = '', beforeUnloadAttached = false;
  const draft = () => drafts.get(keyOf(selected));
  const audio = new TuningAudio({ onState: id => {
    for (const [key, refs] of controls) { refs.wrapper.classList.toggle('is-playing', key === id); refs.peg.classList.toggle('is-playing', key === id); }
  }, onError: error => { $('#tuning-audio-status').textContent = error.message; } });
  const warnUnload = event => { event.preventDefault(); event.returnValue = ''; };
  function trackDirty() {
    const dirty = [...drafts].some(([key, value]) => key.startsWith('draft:') || changed(value, baselines.get(key)));
    if (dirty !== beforeUnloadAttached) {
      window[dirty ? 'addEventListener' : 'removeEventListener']('beforeunload', warnUnload);
      beforeUnloadAttached = dirty;
    }
  }
  function getDraft(source) {
    const key = keyOf(source);
    if (!drafts.has(key)) { drafts.set(key, editable(source)); baselines.set(key, source); }
    return drafts.get(key);
  }
  function renderLibrary() {
    const list = $('#tuning-presets'); list.replaceChildren();
    const view = $('#tuning-view').value, category = $('#tuning-category-filter').value;
    const terms = query.trim().toLowerCase();
    const pending = [...baselines.values()].filter(p => p.isNew);
    const matches = [...FACTORY_PRESETS, ...saved, ...pending].filter(p => (!family || familyMatches(p, family)) &&
      (view === 'all' || (view === 'factory' && !p.createdAt) || (view === 'saved' && p.createdAt) || (view === 'favorites' && p.favorite)) &&
      (!category || p.categoryIds?.includes(category)) && `${drafts.get(keyOf(p))?.name || p.name} ${(drafts.get(keyOf(p)) || p).notesLowToHigh.map(noteLabel).join(' ')}`.toLowerCase().includes(terms));
    const sort = $('#tuning-sort').value;
    if (sort !== 'preset') matches.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b[sort === 'created' ? 'createdAt' : 'updatedAt'] || '').localeCompare(a[sort === 'created' ? 'createdAt' : 'updatedAt'] || '') || a.name.localeCompare(b.name));
    for (const source of matches) {
      const key = keyOf(source), button = node('button', 'tuning-preset'); button.type = 'button';
      button.dataset.key = key;
      if (!source.createdAt && !source.isNew) button.dataset.preset = source.id;
      else if (source.createdAt) button.dataset.saved = source.id;
      button.setAttribute('aria-pressed', String(key === keyOf(selected)));
      button.append(node('strong', '', (drafts.get(key)?.name || source.name) + (source.favorite ? ' ★' : '')), node('span', 'preset-notes', source.notesLowToHigh.map(noteLabel).join(' ')), node('span', 'preset-draft', ''));
      button.append(node('span', 'preset-count', String(source.stringCount)));
      button.addEventListener('click', () => { if (busy) return; selectPreset(source); [...list.children].find(child => child.dataset.key === key)?.focus(); });
      list.append(button);
    }
    $('#tuning-library-count').textContent = `${saved.length} SAVED`;
    $('#tuning-empty').hidden = matches.length !== 0;
    renderCollections(); sync();
  }
  function familyMatches(source, name) {
    // Families use the factory's stable identity/provenance, never inferred pitch sorting.
    const id = source.presetId || source.id;
    if (name === 'extended') return source.stringCount > 6;
    const ids = { standard: ['standard-e', 'standard-b', 'standard-f-sharp'], drop: ['drop-d', 'drop-c'], open: ['open-g', 'dadgad'] };
    return !source.createdAt && !source.isNew && ids[name]?.includes(id);
  }
  function renderCollections() {
    const host = $('#tuning-collections'); host.replaceChildren();
    const records = [...FACTORY_PRESETS, ...saved, ...[...baselines.values()].filter(p => p.isNew)];
    const rows = [['all', 'All Tunings', records.length], ['favorites', 'Favorites', saved.filter(p => p.favorite).length],
      ...['standard', 'drop', 'open', 'extended'].map(id => [id, { standard: 'Standard', drop: 'Drop tunings', open: 'Open tunings', extended: 'Extended range' }[id], records.filter(p => familyMatches(p, id)).length]),
      ...categories.map(c => [c.id, c.name, saved.filter(p => p.categoryIds.includes(c.id)).length])];
    const current = family || $('#tuning-category-filter').value || $('#tuning-view').value;
    for (const [id, label, count] of rows) {
      const button = node('button', 'tuning-collection'); button.dataset.collection = id;
      button.setAttribute('aria-pressed', String(current === id));
      button.append(node('span', '', label), node('span', '', String(count)));
      button.addEventListener('click', () => {
        if (busy) return;
        family = ['standard', 'drop', 'open', 'extended'].includes(id) ? id : '';
        $('#tuning-view').value = id === 'favorites' ? 'favorites' : 'all';
        $('#tuning-category-filter').value = categories.some(c => c.id === id) ? id : '';
        renderLibrary();
        [...host.children].find(item => item.dataset.collection === id)?.focus();
      }); host.append(button);
    }
  }
  function highlight(id) {
    activeString = id;
    for (const [key, refs] of controls) {
      for (const item of [refs.row, refs.peg, refs.wrapper]) item.classList.toggle('is-active', id === key);
    }
  }
  function sync() {
    if (!draft()) return;
    const value = draft(), modified = changed(value, baselines.get(keyOf(selected))), custom = Boolean(selected.createdAt);
    $('#draft-title').textContent = (value.name || 'Untitled draft') + (value.favorite ? ' ★' : '');
    $('#tuning-summary').textContent = `${value.stringCount} STRINGS · ${value.notesLowToHigh.map(noteLabel).join(' – ')}`;
    $('#tuning-badge').textContent = (modified || selected.isNew) ? 'UNSAVED DRAFT' : custom ? 'CUSTOM TUNING' : 'FACTORY PRESET';
    $('#tuning-status').textContent = busy ? 'Working…' : message || (selected.isNew || modified ? 'Unsaved changes · save to keep' : custom ? 'Saved locally' : 'Factory preset · Save tuning to create a custom copy');
    const metadata = $('#tuning-metadata'); metadata.replaceChildren();
    for (const [label, date] of [['Created', selected.createdAt], ['Last edited', selected.updatedAt]]) {
      const field = node('div', '', label); field.append(node('strong', '', date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : selected.isNew || modified ? 'Not saved yet' : 'Factory preset')); metadata.append(field);
    }
    $('#tuning-collection-summary').textContent = categories.filter(c => value.categoryIds.includes(c.id)).map(c => c.name).join(', ') || 'Unassigned';
    for (const button of element.querySelectorAll('[data-count]')) button.setAttribute('aria-pressed', String(Number(button.dataset.count) === value.stringCount));
    for (const input of element.querySelectorAll('button, input, select, textarea')) input.disabled = busy;
    $('#tuning-stop').disabled = false;
    $('#tuning-reset').disabled = busy || (!modified && !selected.isNew);
    $('#tuning-delete').hidden = !custom;
    $('#tuning-save').textContent = custom && !modified ? '✓ Saved' : '✓ Save tuning';
    $('#tuning-save').disabled = busy || !storageReady || (custom && !modified);
    for (const selector of ['#tuning-save-as', '#tuning-delete', '#tuning-duplicate', '#tuning-export', '#tuning-import', '#tuning-category-new', '#tuning-category-rename', '#tuning-category-delete']) $(selector).disabled = busy || !storageReady;
    for (const selector of ['#tuning-category-rename', '#tuning-category-delete']) $(selector).disabled ||= !categories.length;
    $('#tuning-favorite').checked = value.favorite;
    for (const string of stringMap(value.stringCount)) {
      const refs = controls.get(string.id); if (!refs) continue;
      const midi = value.notesLowToHigh[string.index], note = midiToNote(midi);
      refs.full.value = midi; refs.pitch.value = note.pitchClass; refs.octave.value = note.octave;
      for (const item of refs.pitch.options) item.disabled = (note.octave + 1) * 12 + Number(item.value) > 127;
      for (const item of refs.octave.options) item.disabled = (Number(item.value) + 1) * 12 + note.pitchClass > 127;
      refs.output.textContent = `MIDI ${midi}`;
      refs.chip.textContent = noteLabel(midi); refs.chip.setAttribute('aria-label', `Edit string ${string.number}, ${noteLabel(midi)}`);
      refs.peg.setAttribute('aria-label', `Edit string ${string.number}, ${noteLabel(midi)}`);
      refs.play.setAttribute('aria-label', `Play string ${string.number}, ${noteLabel(midi)}`);
    }
    for (const button of $('#tuning-presets').children) {
      const key = button.dataset.key, edited = drafts.has(key) && changed(drafts.get(key), baselines.get(key));
      const rowDraft = drafts.get(key);
      if (rowDraft) {
        button.querySelector('strong').textContent = rowDraft.name + (rowDraft.favorite ? ' ★' : '');
        button.querySelector('.preset-notes').textContent = rowDraft.notesLowToHigh.map(noteLabel).join(' ');
      }
      button.querySelector('.preset-draft').textContent = edited || key.startsWith('draft:') ? '● Unsaved' : '';
    }
    trackDirty();
  }
  function editPitch(id, midi) {
    if (busy) return;
    const value = draft(); audio.stop(); message = '';
    const next = setStringPitch({ ...value, name: value.name.trim() || 'Untitled' }, id, midi);
    drafts.set(keyOf(selected), { ...value, notesLowToHigh: next.notesLowToHigh });
    highlight(id); sync();
  }
  async function playStrings(id) {
    const value = draft();
    const notes = stringMap(value.stringCount).filter(s => !id || s.id === id).map(s => ({ id: s.id, midi: value.notesLowToHigh[s.index] }));
    try { const playing = audio.play(notes); $('#tuning-audio-status').textContent = 'Previewing current draft · A4 = 440 Hz'; await playing; }
    catch (error) { $('#tuning-audio-status').textContent = `Audio unavailable: ${error.message}`; }
  }
  function renderCategories() {
    for (const selector of ['#tuning-category-filter', '#tuning-category-manage']) {
      const select = $(selector), previous = select.value;
      select.replaceChildren();
      if (selector.endsWith('filter')) select.append(option('', 'All categories'));
      for (const category of categories) select.append(option(category.id, category.name));
      if ([...select.options].some(o => o.value === previous)) select.value = previous;
    }
    const choices = $('#tuning-category-choices'); choices.replaceChildren();
    for (const category of categories) {
      const label = node('label'), checkbox = node('input'); checkbox.type = 'checkbox';
      checkbox.value = category.id; checkbox.checked = draft().categoryIds.includes(category.id);
      checkbox.addEventListener('change', () => {
        const value = draft();
        value.categoryIds = checkbox.checked ? [...value.categoryIds, category.id] : value.categoryIds.filter(id => id !== category.id);
        message = ''; sync();
      }); label.append(checkbox, document.createTextNode(category.name)); choices.append(label);
    }
    if (!categories.length) choices.append(node('p', '', 'No categories yet. Use More → Manage categories.'));
  }
  function renderEditor() {
    const value = draft(); controls.clear();
    $('#tuning-vector').replaceChildren(createHeadstock(value, id => { highlight(id); controls.get(id).full.focus(); }));
    $('#tuning-peg-controls').replaceChildren(); $('#tuning-note-editor').replaceChildren(); $('#tuning-note-chips').replaceChildren();
    for (const string of headstockAnchors(value.stringCount)) {
      const { id, number, side, y, row: anchorRow } = string;
      const wrapper = node('div', `peg-control peg-control-${side}`);
      wrapper.style.setProperty('--peg-row', anchorRow + 1);
      wrapper.style.top = `${y / 620 * 100}%`;
      wrapper.append(node('span', '', `STRING ${number}`));
      const full = node('select'); full.id = `tuning-${id}-full`; full.setAttribute('aria-label', `String ${number} full note`);
      for (let midi = 0; midi <= 127; midi++) full.append(option(midi, noteLabel(midi)));
      full.addEventListener('change', () => editPitch(id, Number(full.value)));
      const play = node('button', 'tuning-string-play', '▶'); play.type = 'button';
      play.addEventListener('click', () => playStrings(id));
      wrapper.append(full, play); $('#tuning-peg-controls').append(wrapper);
      const row = node('div', 'tuning-string-row'); row.dataset.string = id;
      const title = node('span', 'string-number', `${number}`); title.title = `Physical string ${number}`;
      const pitch = node('select'); pitch.id = `tuning-${id}-pitch`; pitch.setAttribute('aria-label', `String ${number} pitch class`);
      PITCH_CLASSES.forEach((label, index) => pitch.append(option(index, label)));
      const octave = node('select'); octave.setAttribute('aria-label', `String ${number} octave`);
      for (let i = -1; i <= 9; i++) octave.append(option(i, i));
      const change = () => editPitch(id, noteToMidi(Number(pitch.value), Number(octave.value)));
      pitch.addEventListener('change', change); octave.addEventListener('change', change);
      const output = node('span', 'string-midi');
      row.hidden = true;
      const chip = node('button', 'tuning-note-chip'); chip.type = 'button'; chip.setAttribute('aria-expanded', 'false');
      chip.addEventListener('click', () => {
        const open = row.hidden;
        for (const refs of controls.values()) { refs.row.hidden = true; refs.chip.setAttribute('aria-expanded', 'false'); }
        row.hidden = !open; chip.setAttribute('aria-expanded', String(open)); highlight(id); if (open) pitch.focus();
      });
      row.id = `editor-${id}`; chip.setAttribute('aria-controls', row.id); $('#tuning-note-chips').append(chip);
      row.append(title, pitch, octave, output); $('#tuning-note-editor').append(row);
      const peg = $(`.headstock-peg[data-string="${id}"]`);
      controls.set(id, { row, pitch, octave, output, full, wrapper, peg, play, chip });
      for (const control of [full, pitch, octave]) control.addEventListener('focus', () => highlight(id));
    }
    $('#tuning-name').value = value.name; $('#tuning-description').value = value.description;
    renderCategories();
    highlight(controls.has(activeString) ? activeString : `string-${value.stringCount}`); sync();
  }
  function selectPreset(source) {
    audio.stop(); selected = source; getDraft(source); lastPreset.set(source.stringCount, source);
    $('#tuning-count').value = source.stringCount; message = '';
    renderEditor(); renderLibrary();
    const list = $('#tuning-presets'), active = list.querySelector('[aria-pressed=true]');
    if (active) {
      const bounds = list.getBoundingClientRect(), row = active.getBoundingClientRect();
      if (row.bottom > bounds.bottom) list.scrollTop += row.bottom - bounds.bottom;
      else if (row.top < bounds.top) list.scrollTop -= bounds.top - row.top;
    }
  }
  async function refresh() {
    const snapshot = await tuningRepository.snapshot();
    saved = snapshot.tunings; categories = snapshot.categories; storageReady = true;
    // Refresh committed baselines only when no local changes would be lost.
    for (const source of saved) {
      const key = keyOf(source);
      if (drafts.has(key) && !changed(drafts.get(key), baselines.get(key))) {
        baselines.set(key, source); drafts.set(key, editable(source));
        if (key === keyOf(selected)) { selected = source; $('#tuning-name').value = source.name; $('#tuning-description').value = source.description; }
      }
    }
    $('#tuning-storage-status').textContent = `${saved.length} personal tunings saved in this browser. Export a backup regularly.`;
    if (snapshot.preferences.previewVolume !== undefined) { audio.setVolume(snapshot.preferences.previewVolume); $('#tuning-volume').value = audio.volume; }
    renderCategories(); renderLibrary(); sync();
    return snapshot;
  }
  async function action(work) {
    if (busy) return;
    const previousFocus = document.activeElement;
    busy = true; message = ''; sync();
    try { await work(); }
    catch (error) { message = `Failed: ${storageMessage(error)}`; }
    finally {
      busy = false; sync();
      if (previousFocus?.isConnected && !element.hidden) {
        if (!previousFocus.disabled && !previousFocus.hidden) previousFocus.focus();
        else $('#tuning-name').focus();
      }
    }
  }
  async function save(asNew = false, duplicate = false) {
    const value = structuredClone(draft()), oldKey = keyOf(selected);
    if (!value.name.trim()) throw new Error('Enter a tuning name before saving.');
    if (duplicate) value.name = `${value.name.slice(0, 73)} (copy)`;
    const record = await (asNew || !selected.createdAt ? tuningRepository.createTuning(value) : tuningRepository.updateTuning(value));
    // Saving a copy never erases a modified original's separate draft.
    if (selected.createdAt && !asNew && !duplicate) { drafts.set(oldKey, editable(record)); baselines.set(oldKey, record); }
    // A saved factory draft now has its own identity; return the factory draft to its original.
    if (selected.isNew) { drafts.delete(oldKey); baselines.delete(oldKey); }
    else if (!selected.createdAt) { drafts.set(oldKey, editable(selected)); baselines.set(oldKey, selected); }
    saved = [...saved.filter(r => r.id !== record.id), record];
    baselines.set(keyOf(record), record); drafts.set(keyOf(record), editable(record));
    family = ''; $('#tuning-view').value = 'all'; $('#tuning-category-filter').value = ''; query = ''; $('#tuning-search').value = '';
    selectPreset(record); message = 'Saved locally. Export a backup to protect your library.';
    $('#tuning-storage-status').textContent = `${saved.length} personal tunings saved in this browser.`;
  }
  async function reset() {
    const choices = storageReady ? [['save', 'Save first'], ['discard', 'Discard changes'], ['cancel', 'Cancel']] : [['discard', 'Discard changes'], ['cancel', 'Cancel']];
    const result = await tuningDialog({ title: 'Reset this draft?', message: 'Restore its factory original or last saved version. Other drafts are kept.', choices });
    if (result.action === 'cancel') return;
    audio.stop();
    if (result.action === 'save') await save(!selected.createdAt);
    else if (selected.isNew) {
      const count = selected.stringCount; drafts.delete(keyOf(selected)); baselines.delete(keyOf(selected));
      selectPreset(FACTORY_PRESETS.find(p => p.stringCount === count)); message = 'Unsaved tuning discarded.';
    }
    else { drafts.set(keyOf(selected), editable(baselines.get(keyOf(selected)))); renderEditor(); message = 'Changes discarded for this draft.'; }
  }
  $('#tuning-search').addEventListener('input', event => { query = event.target.value; renderLibrary(); });
  for (const selector of ['#tuning-view', '#tuning-sort', '#tuning-category-filter']) $(selector).addEventListener('change', () => { family = ''; renderLibrary(); });
  $('#tuning-count').addEventListener('change', event => {
    if (busy) return;
    const count = Number(event.target.value); query = ''; $('#tuning-search').value = '';
    selectPreset(lastPreset.get(count) || FACTORY_PRESETS.find(p => p.stringCount === count));
  });
  $('#tuning-new').addEventListener('click', () => {
    if (busy) return;
    const source = FACTORY_PRESETS.find(p => p.stringCount === selected.stringCount);
    const fresh = { ...source, id: `new-${++newSequence}`, presetId: source.id, isNew: true, name: 'Untitled tuning', description: '' };
    family = ''; $('#tuning-view').value = 'all'; $('#tuning-category-filter').value = ''; query = ''; $('#tuning-search').value = '';
    selectPreset(fresh); $('#tuning-name').focus(); $('#tuning-name').select();
  });
  for (const button of element.querySelectorAll('[data-count]')) button.addEventListener('click', () => {
    $('#tuning-count').value = button.dataset.count; $('#tuning-count').dispatchEvent(new Event('change'));
  });
  $('#tuning-manage-collections').addEventListener('click', () => {
    $('.tuning-more').open = true; $('.tuning-category-management').open = true; $('#tuning-category-new').focus();
  });
  element.addEventListener('pointerdown', event => {
    for (const selector of ['.tuning-more', '.tuning-filters']) {
      const disclosure = $(selector); if (!disclosure.contains(event.target)) disclosure.open = false;
    }
  });
  element.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const details = event.target.closest('details[open]');
    if (details) { details.open = false; details.querySelector('summary').focus(); event.stopPropagation(); }
    else { for (const refs of controls.values()) if (!refs.row.hidden) { refs.row.hidden = true; refs.chip.setAttribute('aria-expanded', 'false'); refs.chip.focus(); } }
  });
  $('#tuning-name').addEventListener('input', event => { draft().name = event.target.value; message = ''; sync(); });
  $('#tuning-description').addEventListener('input', event => { draft().description = event.target.value; message = ''; sync(); });
  $('#tuning-favorite').addEventListener('change', event => { draft().favorite = event.target.checked; message = ''; sync(); });
  $('#tuning-reset').addEventListener('click', () => action(reset));
  $('#tuning-save').addEventListener('click', () => action(() => save()));
  $('#tuning-save-as').addEventListener('click', () => action(() => save(true)));
  $('#tuning-duplicate').addEventListener('click', () => action(() => save(true, true)));
  $('#tuning-delete').addEventListener('click', () => action(async () => {
    const result = await tuningDialog({ title: 'Delete saved tuning?', message: `Delete “${selected.name}” and its current draft? This cannot be undone.`, choices: [['delete', 'Delete tuning'], ['cancel', 'Cancel']] });
    if (result.action !== 'delete') return;
    const old = selected; await tuningRepository.deleteTuning(old.id, old.updatedAt);
    audio.stop(); drafts.delete(keyOf(old)); baselines.delete(keyOf(old)); saved = saved.filter(t => t.id !== old.id);
    selectPreset(FACTORY_PRESETS.find(p => p.stringCount === old.stringCount)); message = 'Tuning deleted.';
  }));
  $('#tuning-category-new').addEventListener('click', () => action(async () => {
    const result = await tuningDialog({ title: 'Create category', message: 'Use categories to group your personal tunings.', value: '', choices: [['create', 'Create'], ['cancel', 'Cancel']] });
    if (result.action === 'create') { await tuningRepository.createCategory(result.value); await refresh(); message = 'Category created.'; }
  }));
  $('#tuning-category-rename').addEventListener('click', () => action(async () => {
    const category = categories.find(c => c.id === $('#tuning-category-manage').value); if (!category) return;
    const result = await tuningDialog({ title: 'Rename category', message: 'Existing memberships will be kept.', value: category.name, choices: [['rename', 'Rename'], ['cancel', 'Cancel']] });
    if (result.action === 'rename') { await tuningRepository.updateCategory(category.id, result.value, category.updatedAt); await refresh(); message = 'Category renamed.'; }
  }));
  $('#tuning-category-delete').addEventListener('click', () => action(async () => {
    const category = categories.find(c => c.id === $('#tuning-category-manage').value); if (!category) return;
    const result = await tuningDialog({ title: 'Delete category?', message: `Remove “${category.name}” from all saved tunings and drafts? The tunings themselves are kept.`, choices: [['delete', 'Delete category'], ['cancel', 'Cancel']] });
    if (result.action !== 'delete') return;
    const affected = await tuningRepository.deleteCategory(category.id, category.updatedAt);
    for (const value of drafts.values()) value.categoryIds = value.categoryIds.filter(id => id !== category.id);
    // Rebase only our own membership change. A stale draft must still fail its version check.
    for (const { before, after } of affected) {
      const key = keyOf(after), value = drafts.get(key), baseline = baselines.get(key);
      if (value && baseline.updatedAt === before.updatedAt) {
        value.updatedAt = after.updatedAt; baselines.set(key, after);
        if (key === keyOf(selected)) selected = after;
      }
    }
    await refresh(); message = 'Category deleted. Tunings retained.';
  }));
  $('#tuning-refresh').addEventListener('click', () => action(async () => { await refresh(); message = 'Storage refreshed. Unsaved drafts retained.'; }));
  $('#tuning-play-all').addEventListener('click', () => playStrings());
  $('#tuning-stop').addEventListener('click', () => { audio.stop(); $('#tuning-audio-status').textContent = 'Preview stopped.'; });
  $('#tuning-volume').addEventListener('input', event => audio.setVolume(Number(event.target.value)));
  $('#tuning-volume').addEventListener('change', () => action(async () => {
    if (!storageReady) { message = 'Volume changed for this session. Storage is unavailable.'; return; }
    await tuningRepository.setPreference('previewVolume', audio.volume); message = 'Preview volume saved.';
  }));
  $('#tuning-export').addEventListener('click', () => action(async () => {
    downloadBackup(serializeBackup(await tuningRepository.snapshot())); message = 'Backup download requested. Unsaved edits are not included.';
  }));
  $('#tuning-import').addEventListener('click', () => $('#tuning-import-file').click());
  $('#tuning-import-file').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    action(async () => {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 5 MiB limit.');
      const incoming = parseBackup(await file.text()), current = await tuningRepository.snapshot();
      const count = previewMerge(incoming, current);
      const result = await tuningDialog({ title: 'Restore tuning backup?', message: `Add ${count.tunings} tunings and ${count.categories} categories. Skip ${count.skippedTunings} tuning IDs and ${count.skippedCategories} category IDs already present. Existing records, preferences and unsaved drafts are kept. Names may repeat; record IDs distinguish them.`, choices: [['import', 'Import backup'], ['cancel', 'Cancel']] });
      if (result.action !== 'import') return;
      audio.stop(); const imported = await tuningRepository.mergeSnapshot(incoming); await refresh();
      message = `Imported ${imported.tunings} tunings and ${imported.categories} categories; skipped ${imported.skippedTunings} tunings and ${imported.skippedCategories} categories.`;
    });
  });
  selectPreset(selected);
  refresh().catch(error => { storageReady = false; $('#tuning-storage-status').textContent = storageMessage(error); sync(); });
  return { element, show() { element.hidden = false; }, hide() { audio.stop(); element.hidden = true; } };
}
