import { object, timestamp, validateSnapshot } from './records.js';
export const BACKUP_FORMAT = 'guitar-tools-tuning-backup';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Backup exceeds the 5 MiB limit.');
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  object(value, ['format', 'version', 'exportedAt', 'tunings', 'categories', 'preferences']);
  if (value.format !== BACKUP_FORMAT || ![1, 2].includes(value.version)) throw new Error('Unsupported tuning backup format or version.');
  timestamp(value.exportedAt);
  if (!Array.isArray(value.tunings) || value.tunings.length > 10000 || !Array.isArray(value.categories) || value.categories.length > 2000) throw new Error('Invalid backup arrays or record limits.');
  return validateSnapshot(value);
}
export function serializeBackup(snapshot) {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 2, exportedAt: new Date().toISOString(), ...validateSnapshot(snapshot) }, null, 2);
}
export function previewMerge(incoming, current) {
  const counts = {};
  for (const key of ['tunings', 'categories']) {
    const ids = new Set(current[key].map(record => record.id));
    counts[key] = incoming[key].filter(record => !ids.has(record.id)).length;
    counts[`skipped${key[0].toUpperCase()}${key.slice(1)}`] = incoming[key].length - counts[key];
  }
  const existing = new Set((current.preferences.factoryPresets || []).map(s => s.id));
  counts.factoryPresets = (incoming.preferences.factoryPresets || []).filter(s => !existing.has(s.id)).length;
  return counts;
}
export function downloadBackup(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = `guitar-tools-tunings-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
