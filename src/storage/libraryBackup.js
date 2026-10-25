import { transaction, requestResult as read, STORES } from './db.js';
import { validateSnapshot, validateCategory, uniqueId, object, timestamp } from './records.js';
import { validateSong } from './songRepository.js';
import { checksum, parseSong } from '../services/songImport.js';
import { encodeZip, decodeZip } from './libraryZip.js';
const FORMAT = 'guitar-tools-full-library';
const text = new TextEncoder();
async function snapshot(tx) {
  const values = await Promise.all(STORES.map(name => read(tx.objectStore(name).getAll())));
  return Object.fromEntries(STORES.map((name,i) => [name, values[i]]));
}
function tuningData(data) { return validateSnapshot({ tunings: data.tunings, categories: data.categories, preferences: Object.fromEntries(data.preferences.map(p => [p.key,p.value])) }); }
export function createLibraryBackup(open) {
  const run = (mode, work) => transaction(STORES, mode, work, open);
  return {
    async export() {
      const data = await run('readonly', snapshot), entries = [], files = [];
      const used = new Set(data.songs.map(s => s.fileId));
      for (const f of data.songFiles) {
        if (!used.has(f.id)) throw new Error('Orphan source file found. Export stopped to avoid silently omitting data.');
        const bytes = new Uint8Array(f.bytes), path = `files/${f.id}.bin`;
        if (await checksum(bytes) !== f.id) throw new Error('Stored source checksum mismatch. Export stopped.');
        files.push({ id: f.id, path, size: bytes.length }); entries.push([path,bytes]);
      }
      const manifest = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), songs: data.songs, collections: data.songCollections, files, ...tuningData(data) };
      validateManifest(manifest);
      const manifestBytes = text.encode(JSON.stringify(manifest));
      if (manifestBytes.length > 16 * 1024 * 1024) throw new Error('Manifest exceeds the 16 MiB limit.');
      return encodeZip([['manifest.json',manifestBytes], ...entries]);
    },
    async preview(file) {
      const entries = await decodeZip(file), manifestBytes = entries.get('manifest.json');
      if (!manifestBytes || manifestBytes.length > 16 * 1024 * 1024) throw new Error('Missing or oversized manifest.');
      let manifest; try { manifest = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(manifestBytes)); } catch { throw new Error('Invalid manifest JSON.'); }
      validateManifest(manifest);
      if (entries.size !== manifest.files.length + 1) throw new Error('Unexpected archive entries.');
      const binaries = [];
      for (const f of manifest.files) {
        const bytes = entries.get(f.path);
        if (!bytes || bytes.length !== f.size || await checksum(bytes) !== f.id) throw new Error('Missing file, size mismatch or SHA-256 checksum failure.');
        // Re-parse source files before writing; a manifest is not proof of valid GP data.
        const source = manifest.songs.find(s => s.fileId === f.id);
        const parsed = await parseSong(new File([bytes],source.filename));
        for (const song of manifest.songs.filter(s => s.fileId === f.id)) {
          if (song.format !== parsed.metadata.format || song.tempo !== parsed.metadata.tempo || JSON.stringify(song.tracks) !== JSON.stringify(parsed.metadata.tracks)) throw new Error('Source metadata does not match original Guitar Pro content.');
        }
        binaries.push({ id:f.id, bytes });
      }
      const current = await run('readonly',snapshot);
      const collisions = {};
      for (const [key,store] of [['songs','songs'],['collections','songCollections'],['tunings','tunings'],['categories','categories'],['files','songFiles']]) {
        const ids = new Set(current[store].map(r => r.id)); collisions[key] = manifest[key].filter(r => ids.has(r.id)).length;
      }
      return { manifest, binaries, collisions };
    },
    async restore(preview) {
      const { manifest:m, binaries } = preview; validateManifest(m);
      // All mutations, including tuning/preferences and shared binaries, commit together.
      return run('readwrite', async tx => {
        const current = await snapshot(tx), maps = {}, counts = {};
        for (const [key,store] of [['collections','songCollections'],['categories','categories']]) {
          const used = new Set(current[store].map(r=>r.id)); maps[key] = new Map(); counts[key] = 0;
          for (const record of m[key]) {
            const same = current[store].find(r => r.id === record.id && JSON.stringify(r) === JSON.stringify(record));
            const next = same ? record.id : used.has(record.id) ? uniqueId() : record.id;
            maps[key].set(record.id,next); used.add(next);
            if (!same) { await read(tx.objectStore(store).add({...record,id:next})); counts[key]++; }
          }
        }
        for (const f of binaries) {
          const old = current.songFiles.find(r=>r.id===f.id);
          if (old) {
            const a=new Uint8Array(old.bytes), b=new Uint8Array(f.bytes);
            if (a.length!==b.length || a.some((n,i)=>n!==b[i])) throw new Error('Checksum collision or damaged existing source. Restore cancelled.');
          } else await read(tx.objectStore('songFiles').add(f));
        }
        for (const [key,member,map] of [['songs','collectionIds','collections'],['tunings','categoryIds','categories']]) {
          counts[key]=0;
          const used = new Set(current[key].map(r=>r.id));
          for (const record of m[key]) {
            const value = {...record,[member]:record[member].map(id=>maps[map].get(id))};
            if (current[key].some(r=>r.id===record.id && JSON.stringify(r)===JSON.stringify(value))) continue;
            if (used.has(value.id)) value.id=uniqueId(); used.add(value.id);
            await read(tx.objectStore(key).add(value)); counts[key]++;
          }
        }
        const existing = Object.fromEntries(current.preferences.map(p=>[p.key,p.value]));
        if (existing.previewVolume === undefined && m.preferences.previewVolume !== undefined) await read(tx.objectStore('preferences').put({key:'previewVolume',value:m.preferences.previewVolume}));
        const states=existing.factoryPresets||[], additions=(m.preferences.factoryPresets||[]).filter(s=>!states.some(old=>old.id===s.id)).map(s=>({...s,collectionId:maps.categories.get(s.collectionId)||s.collectionId}));
        if (additions.length) await read(tx.objectStore('preferences').put({key:'factoryPresets',value:[...states,...additions]}));
        return counts;
      });
    }
  };
}
function validateManifest(m) {
  object(m,['format','version','exportedAt','songs','collections','files','tunings','categories','preferences']);
  if (m.format!==FORMAT || m.version!==1) throw new Error('Unsupported full-library backup schema.'); timestamp(m.exportedAt);
  for (const key of ['songs','collections','files','tunings','categories']) {
    if (!Array.isArray(m[key]) || m[key].length > (['collections','categories'].includes(key)?2000:10000) || new Set(m[key].map(r=>r?.id)).size!==m[key].length) throw new Error(`Invalid ${key} records or duplicate identifiers.`);
  }
  validateSnapshot(m); m.collections.forEach(validateCategory); m.songs.forEach(validateSong);
  const collections=new Set(m.collections.map(c=>c.id)), files=new Map(m.files.map(f=>[f.id,f]));
  for (const f of m.files) {
    object(f,['id','path','size']);
    if (!/^[a-f0-9]{64}$/.test(f.id) || f.path!==`files/${f.id}.bin` || !Number.isInteger(f.size) || f.size<1 || f.size>20*1024*1024 || !m.songs.some(s=>s.fileId===f.id)) throw new Error('Invalid archive source file.');
  }
  for (const s of m.songs) if (s.collectionIds.some(id=>!collections.has(id)) || files.get(s.fileId)?.size!==s.size) throw new Error('Broken song collection/file reference.');
}
export const libraryBackup=createLibraryBackup();
export function downloadFile(blob,name) {
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
