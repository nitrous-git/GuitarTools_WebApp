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
const keyOf = source => `${source.createdAt ? 'saved' : 'factory'}:${source.id}`;
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
    <header class="page-heading"><p class="eyebrow">Instrument workspace / 01</p><h1 id="tuning-title" tabindex="-1">Tuning Library</h1><p>Explore a tuning. Make it your own.</p></header>
    <div class="tuning-workstation">
      <aside class="tuning-surface tuning-library" aria-labelledby="presets-title">
        <div class="tuning-panel-heading"><h2 id="presets-title">Tuning library</h2><span id="tuning-library-count">07</span></div>
        <label class="tuning-field">Library view<select id="tuning-view"><option value="all">All tunings</option><option value="factory">Factory Presets</option><option value="saved">My Tunings</option><option value="favorites">Favorites</option></select></label>
        <label class="tuning-field">Search tunings<input type="search" id="tuning-search" placeholder="Name or notes…" autocomplete="off"></label>
        <label class="tuning-field">String configuration<select id="tuning-count"><option value="6">6 strings · 3+3</option><option value="7">7 strings · 3+4</option><option value="8">8 strings · 4+4</option></select></label>
        <label class="tuning-field">Category filter<select id="tuning-category-filter"><option value="">All categories</option></select></label>
        <label class="tuning-field">Sort by<select id="tuning-sort"><option value="name">Name</option><option value="updated">Recently updated</option><option value="created">Recently created</option></select></label>
        <div id="tuning-presets" aria-label="Tuning presets and saved tunings"></div>
        <p id="tuning-empty" hidden>No matches. Try another view, string count or search.</p>
        <div class="tuning-library-tools"><button id="tuning-new">Open standard tuning</button><button id="tuning-refresh">Refresh storage</button></div>
        <details class="tuning-backup"><summary>Backup &amp; restore</summary><p>Saved tunings only. Export regularly: browser storage can be cleared or evicted.</p><button id="tuning-export">Export Backup</button><button id="tuning-import">Import Backup</button><input id="tuning-import-file" type="file" accept=".json,application/json" hidden></details>
        <p id="tuning-storage-status" role="status">Opening local storage…</p>
      </aside>
      <section class="tuning-surface tuning-stage" aria-labelledby="draft-title">
        <header class="tuning-stage-heading"><div><h2 id="draft-title"></h2><p id="tuning-summary"></p></div><span id="tuning-badge"></span></header>
        <div class="headstock-workspace"><div id="tuning-vector"></div><div id="tuning-peg-controls"></div></div>
        <footer class="tuning-stage-footer"><div class="tuning-audio-controls"><button id="tuning-play-all">▶ Play all strings</button><button id="tuning-stop">Stop</button><label>Preview volume<input id="tuning-volume" type="range" min="0" max="1" step="0.01" value="0.35"></label></div><button id="tuning-reset">Reset changes</button><p id="tuning-audio-status" role="status">Select ▶ to hear the current draft.</p></footer>
      </section>
      <aside class="tuning-surface tuning-details" aria-labelledby="tuning-details-title">
        <div class="tuning-panel-heading"><h2 id="tuning-details-title">Tuning details</h2><span>EDIT</span></div>
        <label class="tuning-field">Tuning name<input id="tuning-name" maxlength="80" required></label>
        <label class="tuning-field">Description / notes<textarea id="tuning-description" maxlength="1000" rows="3"></textarea></label>
        <div class="tuning-note-heading"><h3>Strings · low to high</h3><span>NOTE / OCTAVE</span></div><div id="tuning-note-editor"></div>
        <p class="tuning-range-note">Scientific pitch · C4 = MIDI 60.<br>Full MIDI range: C−1 to G9. String order never follows pitch.</p>
        <label class="tuning-favorite"><input id="tuning-favorite" type="checkbox"> Favorite <span>(save to apply)</span></label>
        <fieldset class="tuning-category-assignment"><legend>Categories</legend><div id="tuning-category-choices"></div></fieldset>
        <details class="tuning-category-management"><summary>Manage categories</summary><button id="tuning-category-new">Create category</button><label>Category<select id="tuning-category-manage"></select></label><div><button id="tuning-category-rename">Rename</button><button id="tuning-category-delete">Delete category</button></div></details>
        <p id="tuning-metadata"></p><p id="tuning-status" role="status" aria-live="polite"></p>
        <div class="tuning-save-actions"><button id="tuning-save">Save Changes</button><button id="tuning-save-as">Save as New</button><button id="tuning-duplicate">Duplicate</button><button id="tuning-delete">Delete tuning</button></div>
        <p class="tuning-session-note">Factory presets stay unchanged. Unsaved drafts remain when switching tunings or pages; save them before closing this tab.</p>
      </aside>
    </div>`;
  const $ = selector => element.querySelector(selector);
  const drafts = new Map(), baselines = new Map(), controls = new Map(), lastPreset = new Map();
  let selected = FACTORY_PRESETS[0], activeString = 'string-6', query = '', saved = [], categories = [];
  let storageReady = false, busy = false, message = '', beforeUnloadAttached = false;
  const draft = () => drafts.get(keyOf(selected));
  const audio = new TuningAudio({ onState: id => {
    for (const [key, refs] of controls) { refs.wrapper.classList.toggle('is-playing', key === id); refs.peg.classList.toggle('is-playing', key === id); }
  }, onError: error => { $('#tuning-audio-status').textContent = error.message; } });
  const warnUnload = event => { event.preventDefault(); event.returnValue = ''; };
  function trackDirty() {
    const dirty = [...drafts].some(([key, value]) => changed(value, baselines.get(key)));
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
    const matches = [...FACTORY_PRESETS, ...saved].filter(p => p.stringCount === selected.stringCount &&
      (view === 'all' || (view === 'factory' && !p.createdAt) || (view === 'saved' && p.createdAt) || (view === 'favorites' && p.favorite)) &&
      (!category || p.categoryIds?.includes(category)) && `${p.name} ${p.notesLowToHigh.map(noteLabel).join(' ')}`.toLowerCase().includes(terms));
    const sort = $('#tuning-sort').value;
    matches.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b[sort === 'created' ? 'createdAt' : 'updatedAt'] || '').localeCompare(a[sort === 'created' ? 'createdAt' : 'updatedAt'] || '') || a.name.localeCompare(b.name));
    for (const source of matches) {
      const key = keyOf(source), button = node('button', 'tuning-preset'); button.type = 'button';
      button.dataset.key = key;
      if (!source.createdAt) button.dataset.preset = source.id;
      else button.dataset.saved = source.id;
      button.setAttribute('aria-pressed', String(key === keyOf(selected)));
      button.append(node('strong', '', source.name), node('span', 'preset-notes', source.notesLowToHigh.map(noteLabel).join(' ')), node('span', 'preset-draft', ''));
      if (source.createdAt) button.append(node('small', 'tuning-record-id', `My tuning · ${source.id.slice(-8)}`));
      button.addEventListener('click', () => { if (busy) return; selectPreset(source); [...list.children].find(child => child.dataset.key === key)?.focus(); });
      list.append(button);
    }
    $('#tuning-library-count').textContent = `${matches.length} shown`;
    $('#tuning-empty').hidden = matches.length !== 0;
    sync();
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
    $('#draft-title').textContent = value.name || 'Untitled draft';
    $('#tuning-summary').textContent = `${value.stringCount} STRINGS · ${value.notesLowToHigh.map(noteLabel).join(' – ')}`;
    $('#tuning-badge').textContent = modified ? 'UNSAVED DRAFT' : custom ? 'SAVED TUNING' : 'FACTORY PRESET';
    $('#tuning-status').textContent = busy ? 'Working…' : message || (modified ? 'Unsaved changes · save to keep' : custom ? 'Saved locally' : 'Factory preset · Save as New to keep a custom copy');
    $('#tuning-metadata').textContent = custom ? `Created ${new Date(selected.createdAt).toLocaleString()} · Updated ${new Date(selected.updatedAt).toLocaleString()} · ID ${selected.id}` : 'Immutable factory original';
    for (const input of element.querySelectorAll('button, input, select, textarea')) input.disabled = busy;
    $('#tuning-stop').disabled = false;
    $('#tuning-reset').disabled = busy || !modified;
    for (const selector of ['#tuning-save', '#tuning-delete', '#tuning-duplicate']) $(selector).hidden = !custom;
    $('#tuning-save').disabled = busy || !storageReady || !modified;
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
      refs.peg.setAttribute('aria-label', `Edit string ${string.number}, ${noteLabel(midi)}`);
      refs.play.setAttribute('aria-label', `Play string ${string.number}, ${noteLabel(midi)}`);
    }
    for (const button of $('#tuning-presets').children) {
      const key = button.dataset.key, edited = drafts.has(key) && changed(drafts.get(key), baselines.get(key));
      button.querySelector('.preset-draft').textContent = edited ? 'Unsaved draft' : key.startsWith('factory:') ? 'Factory preset' : 'Saved locally';
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
      for (const category of categories) select.append(option(category.id, `${category.name} · ${category.id.slice(-6)}`));
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
    if (!categories.length) choices.append(node('p', '', 'No categories yet. Create one below.'));
  }
  function renderEditor() {
    const value = draft(); controls.clear();
    $('#tuning-vector').replaceChildren(createHeadstock(value, id => { highlight(id); controls.get(id).pitch.focus(); }));
    $('#tuning-peg-controls').replaceChildren(); $('#tuning-note-editor').replaceChildren();
    for (const string of headstockAnchors(value.stringCount)) {
      const { id, number, side, y } = string;
      const wrapper = node('div', `peg-control peg-control-${side}`);
      wrapper.style.top = `${y / 620 * 100}%`;
      wrapper.append(node('span', '', `STRING ${number}`));
      const full = node('select'); full.setAttribute('aria-label', `String ${number} full note`);
      for (let midi = 0; midi <= 127; midi++) full.append(option(midi, noteLabel(midi)));
      full.addEventListener('change', () => editPitch(id, Number(full.value)));
      const play = node('button', 'tuning-string-play', '▶'); play.type = 'button';
      play.addEventListener('click', () => playStrings(id));
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
      row.append(title, pitch, octave, output, play); $('#tuning-note-editor').append(row);
      const peg = $(`.headstock-peg[data-string="${id}"]`);
      controls.set(id, { row, pitch, octave, output, full, wrapper, peg, play });
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
    if (!selected.createdAt) { drafts.set(oldKey, editable(selected)); baselines.set(oldKey, selected); }
    saved = [...saved.filter(r => r.id !== record.id), record];
    baselines.set(keyOf(record), record); drafts.set(keyOf(record), editable(record));
    $('#tuning-view').value = 'all'; $('#tuning-category-filter').value = ''; query = ''; $('#tuning-search').value = '';
    selectPreset(record); message = 'Saved locally. Export a backup to protect your library.';
    $('#tuning-storage-status').textContent = `${saved.length} personal tunings saved in this browser.`;
  }
  async function reset() {
    const choices = storageReady ? [['save', 'Save first'], ['discard', 'Discard changes'], ['cancel', 'Cancel']] : [['discard', 'Discard changes'], ['cancel', 'Cancel']];
    const result = await tuningDialog({ title: 'Reset this draft?', message: 'Restore its factory original or last saved version. Other drafts are kept.', choices });
    if (result.action === 'cancel') return;
    audio.stop();
    if (result.action === 'save') await save(!selected.createdAt);
    else { drafts.set(keyOf(selected), editable(baselines.get(keyOf(selected)))); renderEditor(); message = 'Changes discarded for this draft.'; }
  }
  $('#tuning-search').addEventListener('input', event => { query = event.target.value; renderLibrary(); });
  for (const selector of ['#tuning-view', '#tuning-sort', '#tuning-category-filter']) $(selector).addEventListener('change', renderLibrary);
  $('#tuning-count').addEventListener('change', event => {
    if (busy) return;
    const count = Number(event.target.value); query = ''; $('#tuning-search').value = '';
    selectPreset(lastPreset.get(count) || FACTORY_PRESETS.find(p => p.stringCount === count));
  });
  $('#tuning-new').addEventListener('click', () => {
    if (busy) return;
    const source = FACTORY_PRESETS.find(p => p.stringCount === selected.stringCount);
    selectPreset(source); $('#tuning-name').focus();
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
