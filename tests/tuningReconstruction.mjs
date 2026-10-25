import assert from 'node:assert/strict';
import path from 'node:path';

// Isolated profile: verifies the reconstruction against existing saved records.
export async function tuningReconstruction({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  const ready = () => page.waitForFunction(() => !document.querySelector('#tuning-save-as').disabled);
  const snapshot = () => page.evaluate(async () => (await import('./src/storage/tuningRepository.js')).tuningRepository.snapshot());
  try {
    await page.goto(base); await ready();
    await page.evaluate(async () => {
      const { tuningRepository: repo } = await import('./src/storage/tuningRepository.js');
      await repo.createTuning({ name: 'Existing record', description: 'Keep all fields', stringCount: 7,
        notesLowToHigh: [80, 40, 45, 50, 55, 59, 20], favorite: true, categoryIds: [] });
    });
    const before = await snapshot();
    await page.reload(); await ready();
    assert.deepEqual(await snapshot(), before);
    assert.equal(await page.locator('#tuning-library-count').textContent(), '1 SAVED');
    await page.locator('[data-collection=favorites]').click();
    assert.equal(await page.locator('.tuning-preset').count(), 1);
    await page.locator('.tuning-preset').click();
    assert.equal(await page.locator('[data-count="7"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#tuning-save').textContent(), '✓ Saved');
    assert(await page.locator('#tuning-save').isDisabled());
    await page.locator('#tuning-new').click();
    assert.equal(await page.locator('#tuning-badge').textContent(), 'UNSAVED DRAFT');
    assert.equal(await page.getByLabel('String 7 full note', { exact: true }).inputValue(), '35');
    await page.locator('#tuning-name').fill('First independent draft');
    await page.getByLabel('String 7 full note', { exact: true }).selectOption('84');
    await page.locator('#tuning-new').click();
    assert.equal(await page.getByLabel('String 7 full note', { exact: true }).inputValue(), '35');
    await page.locator('#tuning-name').fill('Second independent draft');
    await page.locator('[data-count="8"]').click();
    await page.locator('[data-count="7"]').click();
    assert.equal(await page.locator('#tuning-name').inputValue(), 'Second independent draft');
    await page.getByRole('button', { name: /First independent draft/ }).click();
    assert.equal(await page.getByLabel('String 7 full note', { exact: true }).inputValue(), '84');
    await page.locator('#tuning-save').click(); await ready();
    assert.equal((await snapshot()).tunings.length, 2);
    assert.deepEqual((await snapshot()).tunings.find(t => t.id === before.tunings[0].id), before.tunings[0]);
    await page.reload(); await ready();
    await page.getByRole('button', { name: /First independent draft/ }).click();
    assert.equal(await page.getByLabel('String 7 full note', { exact: true }).inputValue(), '84');
    // Factory primary Save creates a record without changing factory data.
    await page.locator('[data-preset=drop-c]').click();
    await page.locator('#tuning-save').click(); await ready();
    assert.equal((await snapshot()).tunings.length, 3);
    await page.locator('[data-preset=drop-c]').click();
    assert.equal(await page.locator('#tuning-name').inputValue(), 'Drop C');
    await page.locator('.tuning-more > summary').focus(); await page.keyboard.press('Enter');
    await page.locator('#tuning-save-as').focus(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.tuning-more').getAttribute('open'), null);
    assert.equal(await page.evaluate(() => document.activeElement.parentElement.className), 'tuning-more');
    for (const count of [6, 7, 8]) {
      await page.locator(`[data-count="${count}"]`).click();
      for (const [width, height] of [[1760, 1000], [1440, 900], [1280, 800], [1024, 768], [768, 1000], [390, 844], [320, 800]]) {
        await page.setViewportSize({ width, height });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const boxes = await page.locator('.peg-control').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom }; }));
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          assert(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `${count} strings at ${width}: controls overlap`);
        }
        if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `reconstruction-${count}-${width}.png`), fullPage: true });
      }
    }
    console.log('PASS reconstruction: independent New drafts, contextual primary Save, existing records unchanged, collections, keyboard More, all target viewports and non-overlapping 6/7/8 controls');
  } finally { await context.close(); }
}
