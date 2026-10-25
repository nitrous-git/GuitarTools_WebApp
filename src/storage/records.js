import { validateTuning, FACTORY_PRESETS } from '../domain/tunings.js';
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function object(value, allowed) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Expected a plain data object.');
  for (const key of Object.keys(value)) if (forbidden.has(key) || !allowed.includes(key)) throw new Error(`Unsupported data field: ${key}`);
}
export function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value) || forbidden.has(value)) throw new Error('Invalid record identifier.');
  return value;
}
export function timestamp(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('Invalid UTC timestamp.');
  return value;
}
export function categoryName(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('Category name must contain 1–80 characters.');
  return value.trim();
}
export function validateCategory(value) {
  object(value, ['id', 'name', 'createdAt', 'updatedAt']);
  id(value.id); categoryName(value.name); timestamp(value.createdAt); timestamp(value.updatedAt);
  if (value.updatedAt < value.createdAt) throw new Error('Invalid category dates.');
  return structuredClone(value);
}
export function validateRecord(value) {
  object(value, ['id', 'name', 'description', 'stringCount', 'notesLowToHigh', 'categoryIds', 'favorite', 'presetId', 'createdAt', 'updatedAt']);
  const errors = validateTuning(value);
  if (errors.length) throw new Error(errors.join(' '));
  id(value.id);
  if (FACTORY_PRESETS.some(p => p.id === value.id)) throw new Error('A custom record cannot use a factory identifier.');
  timestamp(value.createdAt); timestamp(value.updatedAt);
  if (value.updatedAt < value.createdAt) throw new Error('Invalid tuning dates.');
  if (typeof value.favorite !== 'boolean') throw new Error('Invalid favorite flag.');
  if (!Array.isArray(value.categoryIds) || value.categoryIds.length > 2000 || new Set(value.categoryIds).size !== value.categoryIds.length) throw new Error('Invalid category membership.');
  for (const key of value.categoryIds) id(key);
  if (value.presetId !== undefined && !FACTORY_PRESETS.some(p => p.id === value.presetId)) throw new Error('Unknown factory provenance.');
  return structuredClone(value);
}
export function volume(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('Preview volume must be between 0 and 1.');
  return value;
}
export function validateSnapshot(snapshot) {
  const tunings = snapshot.tunings.map(validateRecord), categories = snapshot.categories.map(validateCategory);
  for (const records of [tunings, categories]) if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Duplicate record IDs.');
  const ids = new Set(categories.map(c => c.id));
  if (tunings.some(t => t.categoryIds.some(key => !ids.has(key)))) throw new Error('A tuning refers to a missing category.');
  object(snapshot.preferences, ['previewVolume', 'factoryPresets']);
  if (snapshot.preferences.factoryPresets !== undefined) {
    const states = snapshot.preferences.factoryPresets;
    if (!Array.isArray(states) || states.length > FACTORY_PRESETS.length || new Set(states.map(s => s.id)).size !== states.length) throw new Error('Invalid factory preset states.');
    for (const state of states) {
      object(state, ['id', 'collectionId', 'deleted', 'updatedAt']);
      if (!FACTORY_PRESETS.some(p => p.id === state.id) || typeof state.deleted !== 'boolean') throw new Error('Invalid factory preset state.');
      if (typeof state.collectionId !== 'string' || (state.collectionId !== '' && state.collectionId !== 'favorites' && !ids.has(state.collectionId))) throw new Error('Unknown factory collection.');
      timestamp(state.updatedAt);
    }
  }
  if (snapshot.preferences.previewVolume !== undefined) volume(snapshot.preferences.previewVolume);
  return { tunings, categories, preferences: structuredClone(snapshot.preferences) };
}
export function uniqueId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure identifiers are unavailable. Use HTTPS or localhost.');
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
}
export function nextTimestamp(previous) {
  return new Date(Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0)).toISOString();
}
