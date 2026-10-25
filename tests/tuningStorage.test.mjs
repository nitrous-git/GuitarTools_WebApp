// Development-only: FAKE_INDEXEDDB_MODULE can point to an external fake-indexeddb install.
import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuningRepository } from '../src/storage/tuningRepository.js';
import { validateRecord } from '../src/storage/records.js';
import { parseBackup, serializeBackup, MAX_BACKUP_BYTES } from '../src/storage/tuningBackup.js';
import { FACTORY_PRESETS, createDraft } from '../src/domain/tunings.js';
const require = createRequire(import.meta.url);
const { IDBFactory, IDBObjectStore } = require(process.env.FAKE_INDEXEDDB_MODULE || 'fake-indexeddb');
async function setup() {
  const factory = new IDBFactory();
  const db = await new Promise((resolve, reject) => {
    const request = factory.open('test', 1);
    request.onupgradeneeded = () => {
      for (const name of ['tunings', 'categories', 'preferences']) request.result.createObjectStore(name, { keyPath: name === 'preferences' ? 'key' : 'id' });
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  return { db, repo: createTuningRepository(async () => db) };
}
const source = () => ({ ...createDraft(FACTORY_PRESETS[0]), categoryIds: [], favorite: false });
test('CRUD commits stable IDs, independent copies, timestamps and exact reentrant pitches', async () => {
  const { repo } = await setup();
  const draft = { ...source(), notesLowToHigh: [72, 45, 50, 55, 20, 64] };
  const a = await repo.createTuning(draft), b = await repo.createTuning(draft);
  assert.notEqual(a.id, b.id); assert.notEqual(a.id, a.presetId);
  a.name = 'Renamed'; a.favorite = true;
  const updated = await repo.updateTuning(a);
  assert.equal(updated.id, a.id); assert.equal(updated.createdAt, a.createdAt); assert(updated.updatedAt > a.updatedAt);
  assert.deepEqual((await repo.getTuning(a.id)).notesLowToHigh, [72, 45, 50, 55, 20, 64]);
  assert.equal((await repo.getTuning(a.id)).favorite, true);
  await assert.rejects(repo.updateTuning(a), /another tab/);
  await assert.rejects(repo.deleteTuning(a.id, a.updatedAt), /another tab/);
  assert.equal((await repo.getTuning(b.id)).name, FACTORY_PRESETS[0].name);
  await repo.deleteTuning(a.id, updated.updatedAt); assert.equal(await repo.getTuning(a.id), undefined);
  await assert.rejects(repo.updateTuning(updated), /no longer exists/);
});
test('invalid records never write, stored data is validated on read', async () => {
  const { repo, db } = await setup();
  for (const patch of [{ stringCount: 5 }, { stringCount: 9 }, { notesLowToHigh: [40] }, { notesLowToHigh: [0, 1, 2, 3, 4, 128] }, { notesLowToHigh: [0, 1, 2, 3, 4, 2.5] }, { name: '' }, { favorite: 'yes' }, { categoryIds: ['missing'] }]) await assert.rejects(repo.createTuning({ ...source(), ...patch }));
  assert.deepEqual(await repo.listTunings(), []);
  const good = await repo.createTuning(source());
  await new Promise((resolve, reject) => {
    const tx = db.transaction('tunings', 'readwrite'); tx.objectStore('tunings').put({ ...good, notesLowToHigh: [99] }); tx.oncomplete = resolve; tx.onabort = reject;
  });
  await assert.rejects(repo.listTunings(), /physical string/);
});
test('categories, favorites and preferences persist; category deletion is atomic and keeps tuning', async () => {
  const { repo } = await setup();
  const a = await repo.createCategory('Drop'), b = await repo.createCategory('Practice');
  await assert.rejects(repo.createCategory(' drop '), /already exists/);
  const tuning = await repo.createTuning({ ...source(), categoryIds: [a.id, b.id], favorite: true });
  await repo.updateCategory(a.id, 'Low tunings', a.updatedAt);
  await repo.setPreference('previewVolume', .23);
  assert.equal(await repo.getPreference('previewVolume'), .23);
  await assert.rejects(repo.setPreference('previewVolume', NaN));
  await repo.deleteCategory(a.id);
  const stored = await repo.getTuning(tuning.id);
  assert.deepEqual(stored.categoryIds, [b.id]); assert(stored.favorite); assert(stored.updatedAt > tuning.updatedAt);
  assert.equal((await repo.listCategories()).length, 1);
});
test('transaction abort rejects a save; a failed merge rolls back ALL prior writes', async () => {
  const a = await setup(), b = await setup();
  await a.repo.createCategory('Backup category');
  await a.repo.createTuning(source()); await a.repo.createTuning(source());
  const snapshot = await a.repo.snapshot(), before = await b.repo.snapshot();
  const add = IDBObjectStore.prototype.add;
  let writes = 0;
  IDBObjectStore.prototype.add = function(...args) {
    if (this.name === 'tunings' && ++writes === 2) throw new DOMException('Injected quota failure', 'QuotaExceededError');
    return add.apply(this, args);
  };
  try { await assert.rejects(b.repo.mergeSnapshot(snapshot), /quota/); }
  finally { IDBObjectStore.prototype.add = add; }
  assert.deepEqual(await b.repo.snapshot(), before);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(...args) { const request = put.apply(this, args); this.transaction.abort(); return request; };
  try { await assert.rejects(b.repo.createTuning(source())); }
  finally { IDBObjectStore.prototype.put = put; }
  assert.deepEqual(await b.repo.listTunings(), []);
});
test('backup round-trip preserves every field across 6/7/8 strings; safe merge skips collisions', async () => {
  const { repo } = await setup(), target = (await setup()).repo;
  const category = await repo.createCategory('Custom');
  for (const preset of [FACTORY_PRESETS[0], FACTORY_PRESETS[5], FACTORY_PRESETS[6]]) {
    const draft = createDraft(preset); draft.notesLowToHigh[0] = 84;
    await repo.createTuning({ ...draft, categoryIds: [category.id], favorite: true });
  }
  await repo.setPreference('previewVolume', .42);
  const original = await repo.snapshot(), parsed = parseBackup(serializeBackup(original));
  assert.deepEqual(parsed, original);
  assert.deepEqual(await target.mergeSnapshot(parsed), { tunings: 3, categories: 1, skippedTunings: 0, skippedCategories: 0 });
  assert.deepEqual(await target.snapshot(), original);
  await target.setPreference('previewVolume', .2);
  assert.deepEqual(await target.mergeSnapshot(parsed), { tunings: 0, categories: 0, skippedTunings: 3, skippedCategories: 1 });
  assert.equal(await target.getPreference('previewVolume'), .2);
  assert.equal((await target.listTunings()).length, 3);
});
test('malformed and malicious backups rejected before any mutation', async () => {
  const { repo } = await setup(); await repo.createTuning(source());
  const value = JSON.parse(serializeBackup(await repo.snapshot()));
  const invalid = [ { ...value, version: 9 }, { ...value, tunings: {} }, { ...value, tunings: [...value.tunings, ...value.tunings] }, { ...value, exportedAt: 'tomorrow' }, { ...value, preferences: { previewVolume: 2 } }, { ...value, tunings: [{ ...value.tunings[0], categoryIds: ['absent'] }] }, { ...value, tunings: [{ ...value.tunings[0], updatedAt: '2020-01-01T00:00:00.000Z' }] } ];
  for (const backup of invalid) assert.throws(() => parseBackup(JSON.stringify(backup)));
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(() => parseBackup(JSON.stringify(value).replace('"preferences":{}', `"preferences":{"${key}":{}}`)));
    assert.throws(() => validateRecord(JSON.parse(JSON.stringify(value.tunings[0]).replace('{', `{"${key}":{},`))));
  }
  assert.throws(() => parseBackup('{broken')); assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)));
  assert.deepEqual(await repo.snapshot(), parseBackup(JSON.stringify(value)));
});
