import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from '../src/app/router.js';

test('canonical routes, default, invalid hashes and test compatibility', () => {
  for (const route of ['tuning', 'library', 'player']) assert.equal(resolveRoute(`#/${route}`), route);
  assert.equal(resolveRoute(''), 'tuning');
  assert.equal(resolveRoute('', true), 'player');
  assert.equal(resolveRoute('#/library', true), 'library');
  for (const hash of ['#bad', '#/unknown', '#/constructor', '#/player/extra']) assert.equal(resolveRoute(hash), 'tuning');
});

test('hash transitions are idempotent, invalid routes replace history, skip preserves page', async () => {
  const { startRouter } = await import('../src/app/router.js');
  const original = Object.fromEntries(['window', 'document', 'location', 'history'].map(key => [key, globalThis[key]]));
  const listeners = new Map(), visited = [], replaced = [];
  let focused = false;
  globalThis.location = { hash: '', search: '?test' };
  globalThis.history = { replaceState(_state, _unused, hash) { replaced.push(hash); location.hash = hash; } };
  globalThis.window = {
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { assert.equal(listeners.get(type), fn); listeners.delete(type); }
  };
  globalThis.document = { getElementById() { return { focus() { focused = true; } }; } };
  try {
    const stop = startRouter((...args) => visited.push(args));
    assert.deepEqual(visited, [['player', true]]);
    const change = hash => { location.hash = hash; listeners.get('hashchange')(); };
    change('#/player');
    assert.equal(visited.length, 1);
    change('#/library'); change('#/player'); change('#/library');
    assert.deepEqual(visited.slice(1), [['library', false], ['player', false], ['library', false]]);
    change('#workspace');
    assert(focused); assert.equal(location.hash, '#/library'); assert.equal(visited.length, 4);
    change('#/missing');
    assert.equal(location.hash, '#/tuning'); assert.deepEqual(visited.at(-1), ['tuning', false]);
    assert.deepEqual(replaced, ['#/player', '#/library', '#/tuning']);
    stop(); assert.equal(listeners.size, 0);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
