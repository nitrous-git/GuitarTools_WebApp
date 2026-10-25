// Optional development-only Playwright suite, served at the GitHub Pages subpath.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/GuitarTools_WebApp\//, '');
  const file = path.join(root, relative || 'index.html');
  try {
    res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.statusCode = 404; res.end('Missing'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], failed = [], requests = [], workers = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  page.on('request', r => requests.push(r.url()));
  page.on('worker', w => workers.push(w.url()));
  // Count listener registration before application startup; counts must stop growing on return visits.
  await page.addInitScript(() => {
    window.listenerCounts = { keydown: 0, hashchange: 0 };
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, ...args) {
      if (Object.hasOwn(window.listenerCounts, type)) window.listenerCounts[type]++;
      return add.call(this, type, ...args);
    };
  });
  const base = `http://127.0.0.1:${server.address().port}/GuitarTools_WebApp/`;
  const route = async name => {
    await page.locator(`[data-route="${name}"]`).click();
    await page.waitForFunction(name => document.querySelector(`[data-route="${name}"]`).getAttribute('aria-current') === 'page', name);
  };
  const fits = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(base);
  await page.waitForURL('**/#/tuning');
  assert.equal(await page.locator('#tuning-title').textContent(), 'Tuning Library');
  assert.equal(await page.locator('#score').count(), 0);
  assert(!requests.some(url => url.includes('alphaTab')));
  assert.equal(await page.evaluate(() => window.stageB), undefined);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'workspace');
  assert(page.url().endsWith('#/tuning'));
  await route('library'); await page.goBack(); await page.waitForURL('**/#/tuning');
  await page.goForward(); await page.waitForURL('**/#/library');
  await page.reload(); await page.locator('#library-title').waitFor();
  await page.goto(`${base}#/invalid`); await page.waitForURL('**/#/tuning');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['tuning', 'library']) {
      await route(name); await fits();
      if (name === 'library') assert.equal(await page.locator('#workspace article:not([hidden]) button').count(), 0);
      else assert.equal(await page.locator('.headstock-peg').count(), 6);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${name}-${width}.png`), fullPage: true });
    }
  }
  console.log('PASS default/direct/reload/history/fallback, lazy SDK, tuning interface, Song placeholder, keyboard skip link, desktop/mobile');
  await route('tuning');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('[data-preset="drop-c"]').click();
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '36');
  await page.getByLabel('String 6 octave', { exact: true }).selectOption('5');
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '72');
  assert.equal(await page.locator('#tuning-badge').textContent(), 'EDITED DRAFT');
  await page.locator('#tuning-name').fill('Reentrant experiment');
  await page.locator('#tuning-name').press('Tab');
  await page.locator('#tuning-description').fill('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('.tuning-details img').count(), 0);
  await page.locator('[data-preset="standard-e"]').click();
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '40');
  await page.locator('[data-preset="drop-c"]').click();
  assert.equal(await page.locator('#tuning-name').inputValue(), 'Reentrant experiment');
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '72');
  await route('library'); await route('tuning');
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '72');
  await page.locator('#tuning-search').fill('dadgad');
  assert.equal(await page.locator('.tuning-preset').count(), 1);
  await page.locator('#tuning-search').fill('no match');
  assert(await page.locator('#tuning-empty').isVisible());
  await page.locator('#tuning-search').fill('');
  for (const count of [6, 7, 8]) {
    await page.selectOption('#tuning-count', String(count));
    assert.equal(await page.locator('.headstock-peg').count(), count);
    assert.equal(await page.locator('.peg-control-left').count(), Math.floor(count / 2));
    assert.equal(await page.locator('.peg-control-right').count(), Math.ceil(count / 2));
    for (let number = count; number >= 1; number--) {
      const peg = page.locator(`.headstock-peg[data-string="string-${number}"]`);
      await peg.focus(); await page.keyboard.press(number % 2 ? 'Enter' : 'Space');
      assert.equal(await page.evaluate(() => document.activeElement.id), `tuning-string-${number}-pitch`);
      await page.getByLabel(`String ${number} full note`, { exact: true }).selectOption(String(30 + number));
      assert.equal(await page.getByLabel(`String ${number} pitch class`, { exact: true }).inputValue(), String((30 + number) % 12));
      assert.equal(await page.getByLabel(`String ${number} octave`, { exact: true }).inputValue(), String(Math.floor((30 + number) / 12) - 1));
    }
    for (const width of [1760, 1280, 900, 650, 390, 280]) {
      await page.setViewportSize({ width, height: 900 }); await fits();
      if (process.env.SCREENSHOT_DIR && [1760, 390].includes(width)) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `tuning-${count}-${width}.png`), fullPage: true });
    }
  }
  await page.getByLabel('String 1 full note', { exact: true }).selectOption('127');
  assert.equal(await page.getByLabel('String 1 pitch class', { exact: true }).locator('option:disabled').count(), 4);
  await page.getByLabel('String 1 full note', { exact: true }).selectOption('0');
  assert.equal(await page.getByLabel('String 1 octave', { exact: true }).inputValue(), '-1');
  await page.locator('#tuning-reset').click();
  assert.equal(await page.getByLabel('String 8 full note', { exact: true }).inputValue(), '30');
  assert(await page.locator('#tuning-reset').isDisabled());
  await page.reload();
  assert.equal(await page.getByLabel('String 6 full note', { exact: true }).inputValue(), '40');
  assert(!requests.some(url => url.includes('alphaTab')));
  console.log('PASS preset search, independent drafts, reset/reload, navigation retention, 6/7/8 peg editing, keyboard Enter/Space, MIDI boundaries, responsive 280–1760px');
  await page.goto(`${base}?test#/player`);
  await page.waitForFunction(() => window.stageB?.api.tickCache?.masterBars.length === 6 && document.querySelector('#score svg'));
  await page.reload();
  await page.waitForFunction(() => window.stageB?.playerReady && document.querySelector('#score svg'));
  await page.setInputFiles('#file', path.join(root, 'tests/fixtures/public/stage-b-generated.gp'));
  await page.waitForFunction(() => stageB.originalBytes?.length && stageB.api.isReadyForPlayback);
  await page.click('#audio'); await page.waitForFunction(() => stageB.audioReady);
  await page.selectOption('#layout', 'horizontal');
  await page.locator('#zoom').fill('120'); await page.locator('#zoom').dispatchEvent('change');
  await page.selectOption('#speed', '75'); await page.selectOption('#pitch', '2');
  await page.selectOption('#fret-track', '1');
  await page.getByLabel('mute Six string', { exact: true }).check();
  await page.getByLabel('solo Seven string', { exact: true }).check();
  await page.check('#loop');
  await page.evaluate(() => {
    window.saved = { adapter: stageB, api: stageB.api, score: stageB.api.score, bytes: stageB.originalBytes, player: stageB.api.player, dom: document.querySelector('#score') };
  });
  await page.click('#play'); await page.waitForFunction(() => stageB.api.tickPosition > 300);
  await route('tuning'); await page.waitForFunction(() => stageB.api.playerState === 0);
  const paused = await page.evaluate(() => stageB.api.tickPosition);
  await page.locator('#tuning-title').focus(); await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => stageB.api.tickPosition), paused);
  await route('player'); await page.waitForTimeout(150);
  const listenerCounts = await page.evaluate(() => window.listenerCounts);
  const workerCount = workers.length;
  const soundfonts = requests.filter(u => u.endsWith('sonivox.sf2')).length;
  const worklets = requests.filter(u => u.endsWith('alphaTab.worklet.mjs')).length;
  for (let i = 0; i < 12; i++) {
    for (const name of ['tuning', 'player', 'library', 'player']) await route(name);
  }
  assert(await page.evaluate(() => saved.adapter === stageB && saved.api === stageB.api && saved.player === stageB.api.player && saved.score === stageB.api.score && saved.bytes === stageB.originalBytes && saved.dom === document.querySelector('#score')));
  assert.deepEqual(await page.evaluate(() => window.listenerCounts), listenerCounts);
  assert.equal(workers.length, workerCount);
  assert.equal(requests.filter(u => u.endsWith('sonivox.sf2')).length, soundfonts);
  assert.equal(requests.filter(u => u.endsWith('alphaTab.worklet.mjs')).length, worklets);
  assert.deepEqual(await page.evaluate(() => ({ tick: stageB.api.tickPosition, state: stageB.api.playerState, speed: stageB.api.playbackSpeed, pitch: stageB.offset, track: stageB.selectedTrack.index, layout: stageB.api.settings.display.layoutMode, zoom: stageB.api.settings.display.scale, loop: stageB.api.isLooping })), { tick: paused, state: 0, speed: .75, pitch: 2, track: 1, layout: 1, zoom: 1.2, loop: true });
  assert(await page.getByLabel('mute Six string', { exact: true }).isChecked());
  assert(await page.getByLabel('solo Seven string', { exact: true }).isChecked());
  await route('player'); // same route is a no-op
  assert.equal(await page.evaluate(() => stageB.api.tickPosition), paused);
  await page.click('#play'); await page.waitForFunction(tick => stageB.api.tickPosition !== tick, paused);
  await page.click('#play');
  await page.locator('#player-title').focus(); await page.keyboard.press('Space');
  await page.waitForFunction(() => stageB.api.playerState === 1);
  await page.keyboard.press('Space'); await page.waitForFunction(() => stageB.api.playerState === 0);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(250); await fits();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `player-${width}.png`), fullPage: true });
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(failed.length, 0, failed.join('\n'));
  console.log('PASS imported bytes/score/DOM/adapter/synth retained; 12 navigation cycles; settings, loop, pause/resume, Space shortcut, stable workers/listeners/SoundFont/worklet');
  console.log('BROWSER', browser.version());
} finally { await browser?.close(); server.close(); }
