import { transaction, requestResult as read, STORES } from './db.js';
import { validateRecord, validateCategory, validateSnapshot, categoryName, uniqueId, nextTimestamp, volume } from './records.js';

export function createTuningRepository(open) {
  const run = (mode, work) => transaction(STORES, mode, work, open);
  async function snapshot(tx) {
    const [tunings, categories, preferences] = await Promise.all(STORES.map(name => read(tx.objectStore(name).getAll())));
    const preview = preferences.find(p => p.key === 'previewVolume');
    const factory = preferences.find(p => p.key === 'factoryPresets');
    return validateSnapshot({ tunings, categories, preferences: { ...(preview ? { previewVolume: preview.value } : {}), ...(factory ? { factoryPresets: factory.value } : {}) } });
  }
  async function writeTuning(value, update) {
    return run('readwrite', async tx => {
      const current = await snapshot(tx);
      const old = update && current.tunings.find(t => t.id === value.id);
      if (update && !old) throw new Error('This tuning no longer exists. Use Save as New to keep your draft.');
      if (old && value.updatedAt !== old.updatedAt) throw new Error('This tuning changed in another tab. Use Save as New to keep your draft, or reload after backing it up.');
      const now = nextTimestamp(old?.updatedAt);
      const record = validateRecord({ id: old?.id || uniqueId(), name: value.name.trim(), description: value.description,
        stringCount: value.stringCount, notesLowToHigh: [...value.notesLowToHigh], categoryIds: [...(value.categoryIds || [])],
        favorite: value.favorite ?? false, ...(value.presetId ? { presetId: value.presetId } : {}),
        createdAt: old?.createdAt || now, updatedAt: now });
      if (record.categoryIds.some(id => !current.categories.some(c => c.id === id))) throw new Error('A selected category no longer exists. Refresh the library before saving.');
      await read(tx.objectStore('tunings').put(record));
      return record;
    });
  }
  return {
    snapshot: () => run('readonly', snapshot),
    listTunings: () => run('readonly', async tx => (await snapshot(tx)).tunings),
    getTuning: id => run('readonly', async tx => (await snapshot(tx)).tunings.find(t => t.id === id)),
    createTuning: value => writeTuning(value, false),
    updateTuning: value => writeTuning(value, true),
    deleteTuning: (id, expectedUpdatedAt) => run('readwrite', async tx => {
      const old = (await snapshot(tx)).tunings.find(t => t.id === id);
      if (!old) throw new Error('This tuning has already been removed.');
      if (expectedUpdatedAt && old.updatedAt !== expectedUpdatedAt) throw new Error('This tuning changed in another tab. Refresh before deleting.');
      await read(tx.objectStore('tunings').delete(id));
    }),
    setFactoryPreset: (value, expectedUpdatedAt) => run('readwrite', async tx => {
      const current = await snapshot(tx), states = current.preferences.factoryPresets || [];
      const old = states.find(s => s.id === value.id);
      if (old?.updatedAt !== expectedUpdatedAt) throw new Error('This preset changed in another tab. Refresh storage before trying again.');
      const state = { id: value.id, collectionId: value.collectionId, deleted: value.deleted, updatedAt: nextTimestamp(old?.updatedAt) };
      current.preferences.factoryPresets = [...states.filter(s => s.id !== value.id), state];
      validateSnapshot(current);
      await read(tx.objectStore('preferences').put({ key: 'factoryPresets', value: current.preferences.factoryPresets }));
      return state;
    }),
    listCategories: () => run('readonly', async tx => (await snapshot(tx)).categories),
    createCategory: name => run('readwrite', async tx => {
      name = categoryName(name);
      const { categories } = await snapshot(tx);
      if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) throw new Error('A category with that name already exists.');
      const now = nextTimestamp();
      const value = validateCategory({ id: uniqueId(), name, createdAt: now, updatedAt: now });
      await read(tx.objectStore('categories').add(value)); return value;
    }),
    updateCategory: (id, name, expectedUpdatedAt) => run('readwrite', async tx => {
      name = categoryName(name);
      const { categories } = await snapshot(tx), old = categories.find(c => c.id === id);
      if (!old) throw new Error('Category not found.');
      if (expectedUpdatedAt && old.updatedAt !== expectedUpdatedAt) throw new Error('Category changed in another tab. Refresh and retry.');
      if (categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) throw new Error('A category with that name already exists.');
      const value = validateCategory({ ...old, name, updatedAt: nextTimestamp(old.updatedAt) });
      await read(tx.objectStore('categories').put(value)); return value;
    }),
    deleteCategory: (id, expectedUpdatedAt) => run('readwrite', async tx => {
      const { categories, tunings, preferences } = await snapshot(tx), old = categories.find(c => c.id === id);
      if (!old) throw new Error('Category not found.');
      if (expectedUpdatedAt && old.updatedAt !== expectedUpdatedAt) throw new Error('Category changed in another tab. Refresh and retry.');
      const affected = [];
      for (const value of tunings) if (value.categoryIds.includes(id)) {
        const updated = { ...value, categoryIds: value.categoryIds.filter(key => key !== id), updatedAt: nextTimestamp(value.updatedAt) };
        await read(tx.objectStore('tunings').put(updated)); affected.push({ before: value, after: updated });
      }
      if (preferences.factoryPresets?.some(s => s.collectionId === id)) {
        const value = preferences.factoryPresets.map(s => s.collectionId === id ? { ...s, collectionId: '', updatedAt: nextTimestamp(s.updatedAt) } : s);
        await read(tx.objectStore('preferences').put({ key: 'factoryPresets', value }));
      }
      await read(tx.objectStore('categories').delete(id));
      return affected;
    }),
    getPreference: key => run('readonly', async tx => {
      if (key !== 'previewVolume') throw new Error('Unknown preference.');
      const record = await read(tx.objectStore('preferences').get(key));
      return record ? volume(record.value) : undefined;
    }),
    setPreference: (key, value) => run('readwrite', async tx => {
      if (key !== 'previewVolume') throw new Error('Unknown preference.');
      await read(tx.objectStore('preferences').put({ key, value: volume(value) }));
    }),
    // Recheck collisions inside the write transaction: another tab may have changed data since preview.
    mergeSnapshot: data => {
      const incoming = validateSnapshot(data);
      return run('readwrite', async tx => {
        const current = await snapshot(tx);
        const counts = { tunings: 0, categories: 0, skippedTunings: 0, skippedCategories: 0 };
        for (const store of ['categories', 'tunings']) {
          const existing = new Set(current[store].map(r => r.id));
          for (const record of incoming[store]) {
            if (existing.has(record.id)) counts[store === 'tunings' ? 'skippedTunings' : 'skippedCategories']++;
            else { await read(tx.objectStore(store).add(record)); counts[store]++; }
          }
        }
        // Safe merge: a user's existing preference wins; a clean profile recovers the backup value.
        if (current.preferences.previewVolume === undefined && incoming.preferences.previewVolume !== undefined) await read(tx.objectStore('preferences').put({ key: 'previewVolume', value: incoming.preferences.previewVolume }));
        const states = current.preferences.factoryPresets || [], ids = new Set(states.map(s => s.id));
        const additions = (incoming.preferences.factoryPresets || []).filter(s => !ids.has(s.id));
        if (additions.length) await read(tx.objectStore('preferences').put({ key: 'factoryPresets', value: [...states, ...additions] }));
        counts.factoryPresets = additions.length;
        return counts;
      });
    }
  };
}
export const tuningRepository = createTuningRepository();
