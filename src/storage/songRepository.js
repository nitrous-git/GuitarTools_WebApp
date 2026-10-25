import { transaction, requestResult as read, SONG_STORES } from './db.js';
import { uniqueId, nextTimestamp, validateCategory, id, timestamp, object } from './records.js';
import { MAX_SONG_BYTES, FORMATS } from '../services/songImport.js';
export function validateSong(s) {
  object(s, ['id','fileId','title','artist','filename','format','extension','size','tempo','tracks','notes','favorite','collectionIds','createdAt','updatedAt']);
  id(s.id); if (!/^[a-f0-9]{64}$/.test(s.fileId)) throw new Error('Invalid source checksum.');
  for (const [key, limit] of [['title',500],['artist',500],['filename',255],['notes',20000]]) if (typeof s[key] !== 'string' || s[key].length > limit) throw new Error(`Invalid song ${key}.`);
  if (!s.title.trim() || !s.filename || /[\x00-\x1f/\\]/.test(s.filename)) throw new Error('Invalid title or original filename.');
  if (!FORMATS.includes(s.format) || !FORMATS.includes(s.extension) || !Number.isInteger(s.size) || s.size < 1 || s.size > MAX_SONG_BYTES) throw new Error('Invalid source format or size.');
  if (s.tempo !== null && (!Number.isFinite(s.tempo) || s.tempo <= 0 || s.tempo > 10000)) throw new Error('Invalid tempo.');
  if (typeof s.favorite !== 'boolean' || !Array.isArray(s.collectionIds) || s.collectionIds.length > 2000 || new Set(s.collectionIds).size !== s.collectionIds.length) throw new Error('Invalid song membership.');
  s.collectionIds.forEach(id); timestamp(s.createdAt); timestamp(s.updatedAt);
  if (s.updatedAt < s.createdAt || !Array.isArray(s.tracks) || !s.tracks.length || s.tracks.length > 1000) throw new Error('Invalid song tracks or dates.');
  for (const t of s.tracks) {
    object(t, ['name','program','staves']);
    if (typeof t.name !== 'string' || t.name.length > 500 || (t.program !== null && (!Number.isInteger(t.program) || t.program < 0 || t.program > 127)) || !Array.isArray(t.staves) || t.staves.length > 32) throw new Error('Invalid track.');
    for (const staff of t.staves) {
      object(staff, ['percussion','capo','notesLowToHigh']);
      if (typeof staff.percussion !== 'boolean' || !Number.isInteger(staff.capo) || staff.capo < 0 || staff.capo > 48 || !Array.isArray(staff.notesLowToHigh) || staff.notesLowToHigh.length > 16 || staff.notesLowToHigh.some(n => !Number.isInteger(n) || n < 0 || n > 127)) throw new Error('Invalid source tuning.');
    }
  }
  return structuredClone(s);
}
export function createSongRepository(open) {
  const run = (mode, work) => transaction(SONG_STORES, mode, work, open);
  const snapshot = async tx => {
    return { songs: await read(tx.objectStore('songs').getAll()), collections: await read(tx.objectStore('songCollections').getAll()) };
  };
  return {
    snapshot: () => run('readonly', snapshot),
    hasHash: hash => run('readonly', async tx => Boolean(await read(tx.objectStore('songFiles').get(hash)))),
    file: song => run('readonly', async tx => {
      const record = await read(tx.objectStore('songFiles').get(song.fileId));
      if (!record) throw new Error('Original file is missing. Restore a backup.');
      return new File([record.bytes], song.filename, { type: 'application/octet-stream' });
    }),
    add: (parsed, keepDuplicate = false) => run('readwrite', async tx => {
      const existing = await read(tx.objectStore('songFiles').get(parsed.hash));
      if (existing && !keepDuplicate) return null;
      const now = nextTimestamp();
      const song = validateSong({ ...parsed.metadata, id: uniqueId(), fileId: parsed.hash, notes: '', favorite: false, collectionIds: [], createdAt: now, updatedAt: now });
      if (!existing) await read(tx.objectStore('songFiles').add({ id: parsed.hash, bytes: parsed.bytes }));
      await read(tx.objectStore('songs').add(song)); return song;
    }),
    update: (song, patch) => run('readwrite', async tx => {
      object(patch, ['title','artist','notes','favorite','collectionIds']);
      const old = await read(tx.objectStore('songs').get(song.id));
      if (!old || old.updatedAt !== song.updatedAt) throw new Error('Song changed in another tab. Refresh the library and retry.');
      const value = validateSong({ ...old, ...patch, updatedAt: nextTimestamp(old.updatedAt) });
      for (const key of value.collectionIds) if (!await read(tx.objectStore('songCollections').get(key))) throw new Error('Collection no longer exists.');
      await read(tx.objectStore('songs').put(value)); return value;
    }),
    remove: song => run('readwrite', async tx => {
      const old = await read(tx.objectStore('songs').get(song.id));
      if (!old || old.updatedAt !== song.updatedAt) throw new Error('Song changed in another tab. Refresh and retry.');
      await read(tx.objectStore('songs').delete(song.id));
      const remaining = await read(tx.objectStore('songs').getAll());
      if (!remaining.some(s => s.fileId === old.fileId)) await read(tx.objectStore('songFiles').delete(old.fileId));
    }),
    saveCollection: (name, old) => run('readwrite', async tx => {
      const all = await read(tx.objectStore('songCollections').getAll());
      if (old && !all.some(c => c.id === old.id && c.updatedAt === old.updatedAt)) throw new Error('Collection changed. Refresh and retry.');
      if (all.some(c => c.id !== old?.id && c.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('A collection with that name already exists.');
      const now = nextTimestamp(old?.updatedAt), value = validateCategory({ id: old?.id || uniqueId(), name: name.trim(), createdAt: old?.createdAt || now, updatedAt: now });
      await read(tx.objectStore('songCollections').put(value)); return value;
    }),
    removeCollection: collection => run('readwrite', async tx => {
      const old = await read(tx.objectStore('songCollections').get(collection.id));
      if (!old || old.updatedAt !== collection.updatedAt) throw new Error('Collection changed. Refresh and retry.');
      for (const s of await read(tx.objectStore('songs').getAll())) if (s.collectionIds.includes(old.id)) await read(tx.objectStore('songs').put({ ...s, collectionIds: s.collectionIds.filter(id => id !== old.id), updatedAt: nextTimestamp(s.updatedAt) }));
      await read(tx.objectStore('songCollections').delete(old.id));
    })
  };
}
export const songRepository = createSongRepository();
