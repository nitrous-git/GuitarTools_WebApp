// Called by shell.test.mjs: native IndexedDB, real Web Audio and UI workflows.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
export async function tuningIntegration({ page, base, route, fits }) {
  const snapshot = p => p.evaluate(async () => (await import('./src/storage/tuningRepository.js')).tuningRepository.snapshot());
  const ready = p => p.waitForFunction(() => !document.querySelector('#tuning-save-as').disabled);
  const openMore = async () => { if (await page.locator('.tuning-more').getAttribute('open') === null) await page.locator('.tuning-more > summary').click(); };
  const openFilters = async () => { if (await page.locator('.tuning-filters').getAttribute('open') === null) await page.locator('.tuning-filters > summary').click(); };
  const saveNew = async name => {
    await openMore();
    await page.locator('#tuning-name').fill(name); await openMore(); await page.locator('#tuning-save-as').click();
    await page.waitForFunction(() => document.querySelector('#tuning-status').textContent.startsWith('Saved locally.'));
  };
  const confirm = async (p, choice) => p.locator(`dialog [data-choice="${choice}"]`).click();
  await ready(page);
  await page.locator('[data-preset=drop-d]').click();
  await page.getByLabel('String 6 full note', { exact: true }).selectOption('37');
  await saveNew('Six custom');
  let data = await snapshot(page); const six = data.tunings[0]; assert.equal(six.notesLowToHigh[0], 37);
  await page.reload(); await ready(page); await page.locator(`[data-saved="${six.id}"]`).click();
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '37');
  await page.selectOption('#tuning-count', '8');
  await page.getByLabel('String 8 full note', { exact: true }).selectOption('84');
  await page.getByLabel('String 2 full note', { exact: true }).selectOption('20');
  await saveNew('Eight reentrant');
  const eight = (await snapshot(page)).tunings.find(t => t.name === 'Eight reentrant');
  assert.deepEqual(eight.notesLowToHigh, [84, 35, 40, 45, 50, 55, 20, 64]);
  await page.reload(); await ready(page); await page.selectOption('#tuning-count', '8'); await page.locator(`[data-saved="${eight.id}"]`).click();
  for (let i = 0; i < 8; i++) assert.equal(await page.getByLabel(`String ${8 - i} full note`, { exact: true }).inputValue(), String(eight.notesLowToHigh[i]));
  await page.selectOption('#tuning-count', '7'); await saveNew('Seven custom');
  console.log('PASS native IndexedDB save/reload with exact 6/7/8 string identities and reentrant pitches');

  await page.selectOption('#tuning-count', '6'); await page.locator(`[data-saved="${six.id}"]`).click();
  await openMore();
  await page.locator('#tuning-duplicate').click(); await ready(page);
  await page.waitForFunction(() => document.querySelector('#tuning-name').value.endsWith('(copy)'));
  const duplicate = (await snapshot(page)).tunings.find(t => t.name.endsWith('(copy)'));
  assert.notEqual(duplicate.id, six.id);
  await page.locator('#tuning-name').fill('Favorite copy'); await openMore(); await page.locator('#tuning-favorite').check();
  await page.locator('.tuning-category-management summary').click();
  for (const name of ['Practice', 'Low tunings']) {
    await page.locator('#tuning-category-new').click();
    await page.getByRole('dialog').getByLabel('Category name').fill(name); await confirm(page, 'create'); await ready(page);
  }
  await page.locator('.tuning-more > summary').click();
  await page.locator('.tuning-category-assignment > summary').click();
  await page.locator('#tuning-category-choices').getByLabel('Practice', { exact: true }).check();
  await page.locator('#tuning-category-choices').getByLabel('Low tunings', { exact: true }).check();
  await page.locator('#tuning-save').click(); await ready(page);
  data = await snapshot(page); const updated = data.tunings.find(t => t.id === duplicate.id), category = data.categories.find(c => c.name === 'Low tunings');
  assert.equal(updated.name, 'Favorite copy'); assert(updated.favorite); assert.equal(updated.categoryIds.length, 2); assert.equal(updated.createdAt, duplicate.createdAt);
  await openFilters();
  await page.selectOption('#tuning-view', 'favorites'); await page.locator('#tuning-search').fill('favorite');
  await openFilters();
  await page.selectOption('#tuning-category-filter', category.id);
  assert.equal(await page.locator('.tuning-preset').count(), 1);
  await page.selectOption('#tuning-sort', 'updated'); assert.equal(await page.locator('.tuning-preset strong').textContent(), 'Favorite copy ★');
  await openMore();
  await page.selectOption('#tuning-category-manage', category.id); await page.locator('#tuning-category-rename').click();
  await page.getByRole('dialog').getByLabel('Category name').fill('Heavy'); await confirm(page, 'rename'); await ready(page);
  await page.locator('#tuning-category-delete').click(); await confirm(page, 'delete'); await ready(page);
  assert.equal((await snapshot(page)).tunings.find(t => t.id === duplicate.id).categoryIds.length, 1);
  await openMore(); await page.locator('#tuning-delete').click(); await page.keyboard.press('Escape'); await ready(page);
  assert((await snapshot(page)).tunings.some(t => t.id === duplicate.id));
  await openMore(); await page.locator('#tuning-delete').click(); await confirm(page, 'delete'); await ready(page);
  await page.reload(); await ready(page); assert(!(await snapshot(page)).tunings.some(t => t.id === duplicate.id));
  console.log('PASS duplicate/rename/favorite, multiple categories, search/filter/sort, category rename/delete, Escape and confirmed tuning deletion');

  await page.locator(`[data-saved="${six.id}"]`).click();
  await page.locator('#tuning-name').fill('Unsaved protected');
  await page.locator('#tuning-reset').click(); await page.keyboard.press('Escape'); await ready(page);
  assert.equal(await page.locator('#tuning-name').inputValue(), 'Unsaved protected');
  await route('library'); await route('tuning'); assert.equal(await page.locator('#tuning-name').inputValue(), 'Unsaved protected');
  await page.evaluate(() => {
    window.originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(...args) { if (this.name === 'tunings') throw new DOMException('Injected full storage', 'QuotaExceededError'); return window.originalPut.apply(this, args); };
  });
  await page.locator('#tuning-save').click();
  await page.waitForFunction(() => document.querySelector('#tuning-status').textContent.startsWith('Failed:'));
  assert.equal(await page.locator('#tuning-name').inputValue(), 'Unsaved protected'); assert.equal(await page.locator('#tuning-badge').textContent(), 'UNSAVED DRAFT');
  assert.equal((await snapshot(page)).tunings.find(t => t.id === six.id).name, 'Six custom');
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalPut; });
  await page.locator('#tuning-reset').click(); await confirm(page, 'save'); await ready(page);
  assert.equal((await snapshot(page)).tunings.find(t => t.id === six.id).name, 'Unsaved protected');
  console.log('PASS failed save preserves draft and stored baseline; reset save/cancel and route retention');

  // Capture a real download, then restore into a separate browser profile.
  await page.locator('#tuning-volume').fill('0.42'); await page.locator('#tuning-volume').dispatchEvent('change'); await ready(page);
  await openMore();
  const downloadPromise = page.waitForEvent('download'); await page.locator('#tuning-export').click();
  const download = await downloadPromise; const text = await fs.readFile(await download.path(), 'utf8');
  const original = await snapshot(page); assert.deepEqual(JSON.parse(text).tunings, original.tunings);
  const context = await page.context().browser().newContext(); const clean = await context.newPage();
  await clean.goto(base); await ready(clean);
  const importText = async content => {
    await clean.setInputFiles('#tuning-import-file', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  };
  await importText(text); await confirm(clean, 'import'); await ready(clean);
  assert.deepEqual(await snapshot(clean), original);
  await importText(text); await confirm(clean, 'import'); await ready(clean);
  assert.deepEqual(await snapshot(clean), original);
  for (const bad of ['{bad', text.replace('"version": 1', '"version": 99')]) {
    await importText(bad); await clean.waitForFunction(() => document.querySelector('#tuning-status').textContent.startsWith('Failed:'));
    assert.deepEqual(await snapshot(clean), original);
  }
  await context.close();
  const blockedContext = await page.context().browser().newContext();
  await blockedContext.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }));
  const blocked = await blockedContext.newPage(); await blocked.goto(base);
  await blocked.waitForFunction(() => document.querySelector('#tuning-storage-status').textContent.includes('unavailable'));
  assert(await blocked.locator('#tuning-save-as').isDisabled());
  await blocked.getByLabel('String 6 full note', { exact: true }).selectOption('36');
  assert.equal(await blocked.locator('#tuning-badge').textContent(), 'UNSAVED DRAFT');
  await blockedContext.close();
  console.log('PASS backup download, clean-profile restore, repeat import skip, corrupt/version rejection, blocked-storage factory fallback');

  const instrument = () => {
    const Original = window.AudioContext;
    window.tuningAudioProbe = { contexts: 0, starts: [], active: 0 };
    window.AudioContext = class extends Original {
      constructor(...args) { super(...args); window.tuningAudioProbe.contexts++; }
      createOscillator() {
        const osc = super.createOscillator(), start = osc.start.bind(osc);
        const setFrequency = osc.frequency.setValueAtTime.bind(osc.frequency); let scheduledFrequency;
        osc.frequency.setValueAtTime = (value, time) => { scheduledFrequency = value; return setFrequency(value, time); };
        osc.start = (...args) => { window.tuningAudioProbe.starts.push(scheduledFrequency); window.tuningAudioProbe.active++; return start(...args); };
        osc.addEventListener('ended', () => window.tuningAudioProbe.active--);
        return osc;
      }
    };
  };
  await page.evaluate(instrument);
  await openFilters();
  await page.locator('#tuning-view').selectOption('all'); await page.locator('#tuning-search').fill('');
  for (const midi of [40, 69, 30]) {
    await page.getByLabel('String 6 full note', { exact: true }).selectOption(String(midi));
    const start = await page.evaluate(() => tuningAudioProbe.starts.length);
    await page.locator('.tuning-string-play').first().click();
    await page.waitForFunction(n => tuningAudioProbe.starts.length > n, start);
    assert(!(await page.locator('#tuning-audio-status').textContent()).includes('unavailable'));
    const frequency = await page.evaluate(n => tuningAudioProbe.starts[n], start);
    assert(Math.abs(frequency - 440 * 2 ** ((midi - 69) / 12)) < .001);
  }
  await page.getByLabel('String 6 full note', { exact: true }).selectOption('84');
  await page.getByLabel('String 5 full note', { exact: true }).selectOption('30');
  let start = await page.evaluate(() => tuningAudioProbe.starts.length);
  await page.locator('#tuning-play-all').click();
  await page.waitForFunction(n => tuningAudioProbe.starts.length >= n + 6, start);
  const actual = await page.evaluate(n => [tuningAudioProbe.starts[n], tuningAudioProbe.starts[n + 3]], start);
  assert(Math.abs(actual[0] - 440 * 2 ** ((84 - 69) / 12)) < .001);
  assert(Math.abs(actual[1] - 440 * 2 ** ((30 - 69) / 12)) < .001);
  await page.locator('#tuning-stop').click(); start = await page.evaluate(() => tuningAudioProbe.starts.length);
  await page.waitForTimeout(1500); assert.equal(await page.evaluate(() => tuningAudioProbe.starts.length), start);
  await page.locator('#tuning-play-all').click(); await route('library'); start = await page.evaluate(() => tuningAudioProbe.starts.length);
  await page.waitForTimeout(1500); assert.equal(await page.evaluate(() => tuningAudioProbe.starts.length), start);
  assert.equal(await page.evaluate(() => tuningAudioProbe.active), 0); assert.equal(await page.evaluate(() => tuningAudioProbe.contexts), 1);
  await route('tuning');
  for (const width of [1760, 1280, 900, 650, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await fits();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `complete-tuning-${width}.png`), fullPage: true });
  }
  await page.locator('#tuning-reset').click(); await confirm(page, 'discard'); await ready(page);
  await page.locator('[data-preset=standard-e]').click();
  console.log('PASS real user-gesture Web Audio E2/A4/F#1, non-monotonic sequence, stop/route cancellation, one context, responsive 320–1760px');
}
