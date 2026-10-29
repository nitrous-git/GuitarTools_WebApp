// Additive schema migration: never delete the Stage C stores.
export const DB_NAME = 'guitar-tools-user-data';
export const DB_VERSION = 3;
export const TUNING_STORES = ['tunings', 'categories', 'preferences'];
export const SONG_STORES = ['songFiles', 'songs', 'songCollections'];
export const STORES = [...TUNING_STORES, ...SONG_STORES, 'drumProjects'];
let connection;
export function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Local storage is unavailable in this browser.')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let failed = false;
    const timer = setTimeout(() => fail(new Error('Local storage did not open. Close other Guitar Tools tabs and retry.')), 8000);
    function fail(error) { failed = true; clearTimeout(timer); reject(error); }
    request.onupgradeneeded = () => {
      for (const name of STORES) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: name === 'preferences' ? 'key' : 'id' });
    };
    request.onblocked = () => fail(new Error('Storage is blocked by another tab. Close other Guitar Tools tabs, then retry.'));
    request.onerror = () => fail(request.error || new Error('Could not open local storage.'));
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      if (failed) { db.close(); return; }
      db.onversionchange = () => { db.close(); connection = undefined; };
      db.onclose = () => { connection = undefined; };
      resolve(db);
    };
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}
export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Storage request failed.'));
  });
}
// Only IDB requests may be awaited inside work; no network, timers or UI dialogs.
// Resolve after COMMIT, not after a successful individual put request.
export async function transaction(stores, mode, work, open = openDatabase) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result, failure;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure || tx.error || new Error('Storage transaction was aborted.'));
    tx.onerror = () => { failure ||= tx.error; };
    Promise.resolve().then(() => work(tx)).then(value => { result = value; }).catch(error => {
      failure = error;
      try { tx.abort(); } catch { reject(error); }
    });
  });
}
export function storageMessage(error) {
  if (error?.name === 'QuotaExceededError') return 'Storage is full. Export a backup, free browser space and retry. Your draft is still here.';
  return `${error?.message || 'Local storage failed.'} Your draft is still here. Check browser storage permissions and retry.`;
}
