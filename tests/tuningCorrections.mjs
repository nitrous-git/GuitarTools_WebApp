import assert from 'node:assert/strict';
import path from 'node:path';
export async function tuningCorrections({ browser, base }) {
  const context = await browser.newContext(); const page = await context.newPage({ viewport: { width: 1760, height: 1000 } });
  page.on('dialog', d => d.accept());
  const ready = () => page.waitForFunction(() => !document.querySelector('#tuning-save-as').disabled);
  const snapshot = () => page.evaluate(async () => (await import('./src/storage/tuningRepository.js')).tuningRepository.snapshot());
  const save = async () => { await page.locator('#tuning-save').click(); await ready(); };
  try {
    await page.goto(base); await ready();
    assert.equal(await page.locator('.tuning-collection').count(), 2);
    assert.equal(await page.locator('#tuning-collection').inputValue(), 'favorites');
    assert.equal(await page.locator('#tuning-collection').getAttribute('multiple'), null);
    assert.equal(await page.locator('#tuning-favorite').count(), 0);
    const fullHeight = (await page.locator('.tuning-preset').first().boundingBox()).height;
    await page.locator('#tuning-search').fill('drop');
    assert.equal(await page.locator('.tuning-preset').count(), 2);
    for (const card of await page.locator('.tuning-preset').all()) assert.equal((await card.boundingBox()).height, fullHeight);
    await page.locator('#tuning-search').fill('');
    await page.locator('[data-preset=drop-d]').click();
    await page.locator('#tuning-name').fill('Unsaved drop');
    const contained = await page.locator('[data-preset=drop-d]').evaluate(n => {
      const card = n.getBoundingClientRect(), label = n.querySelector('.preset-draft').getBoundingClientRect();
      return label.top >= card.top && label.bottom <= card.bottom && label.right <= card.right;
    }); assert(contained);
    await page.locator('[data-preset=standard-e]').click();
    await page.locator('#tuning-manage-collections').click();
    assert.equal(await page.getByRole('dialog').locator('h2').textContent(), 'Create Collection');
    await page.getByLabel('Collection name').fill('Metal'); await page.locator('[data-choice=create]').click(); await ready();
    const category = (await snapshot()).categories[0];
    await page.locator('#tuning-collection').selectOption(category.id);
    assert.equal(await page.locator('#tuning-save').textContent(), '✓ Save collection');
    await page.evaluate(() => {
      window.originalFactoryPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value) { if (value.key === 'factoryPresets') throw new Error('Injected metadata failure'); return window.originalFactoryPut.call(this, value); };
    });
    await page.locator('#tuning-save').click(); await page.waitForFunction(() => document.querySelector('#tuning-status').textContent.startsWith('Failed:'));
    assert.equal(await page.locator('#tuning-collection').inputValue(), category.id);
    assert.equal((await snapshot()).preferences.factoryPresets, undefined);
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.originalFactoryPut; });
    await save();
    assert.equal((await snapshot()).tunings.length, 0);
    await page.reload(); await ready(); assert.equal(await page.locator('#tuning-collection').inputValue(), category.id);
    await page.locator(`[data-collection="${category.id}"]`).click(); assert.equal(await page.locator('.tuning-preset').count(), 1);
    await page.locator('[data-collection=all]').click();
    // Populate a legacy record without a destructive read-time migration.
    const legacy = await page.evaluate(async categoryId => {
      const { tuningRepository: repo } = await import('./src/storage/tuningRepository.js');
      const second = await repo.createCategory('Legacy second');
      return repo.createTuning({ name: 'Legacy custom', description: 'keep me', stringCount: 6, notesLowToHigh: [80,45,50,55,59,20], favorite: true, categoryIds: [categoryId, second.id] });
    }, category.id);
    await page.reload(); await ready(); await page.locator(`[data-saved="${legacy.id}"]`).click();
    assert.equal(await page.locator('#tuning-collection').inputValue(), 'favorites');
    assert.deepEqual((await snapshot()).tunings[0], legacy);
    await page.locator('#tuning-name').fill('Legacy renamed'); await save();
    assert.deepEqual((await snapshot()).tunings[0].categoryIds, legacy.categoryIds);
    await page.locator('#tuning-collection').selectOption(category.id); await save();
    assert.deepEqual((await snapshot()).tunings[0].categoryIds, [category.id]); assert.equal((await snapshot()).tunings[0].favorite, false);
    // Six-string row order from both SVG geometry and associated HTML controls.
    const order = await page.locator('.headstock-peg').evaluateAll(nodes => nodes.map(n => ({ id:n.dataset.string, x:Number(n.querySelector('circle').getAttribute('cx')), y:Number(n.querySelector('circle').getAttribute('cy')) })).sort((a,b)=>a.x-b.x || a.y-b.y).map(n=>n.id));
    assert.deepEqual(order, ['string-4','string-5','string-6','string-3','string-2','string-1']);
    await page.locator('[data-preset=standard-e]').click();
    assert(await page.locator('#tuning-delete').isVisible());
    await page.locator('#tuning-delete').click(); await page.keyboard.press('Escape'); await ready();
    assert.equal(await page.locator('[data-preset=standard-e]').count(), 1);
    await page.locator('#tuning-delete').click(); await page.locator('[data-choice=delete]').click(); await ready();
    await page.reload(); await ready(); assert.equal(await page.locator('[data-preset=standard-e]').count(), 0);
    assert.equal((await snapshot()).tunings.length, 1);
    const backup = await page.evaluate(async () => {
      const { serializeBackup } = await import('./src/storage/tuningBackup.js');
      const { tuningRepository } = await import('./src/storage/tuningRepository.js'); return serializeBackup(await tuningRepository.snapshot());
    });
    const cleanContext = await browser.newContext(); const clean = await cleanContext.newPage();
    await clean.goto(base); await clean.waitForFunction(() => !document.querySelector('#tuning-save-as').disabled);
    await clean.setInputFiles('#tuning-import-file', {name:'v2.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await clean.locator('[data-choice=import]').click(); await clean.waitForFunction(() => document.querySelector('#tuning-status').textContent.startsWith('Imported'));
    assert.equal(await clean.locator('[data-preset=standard-e]').count(), 0);
    assert.deepEqual(await clean.evaluate(async () => (await import('./src/storage/tuningRepository.js')).tuningRepository.snapshot()), await snapshot());
    await cleanContext.close();
    await page.evaluate(async () => { const { tuningRepository: repo } = await import('./src/storage/tuningRepository.js'); for(let i=0;i<12;i++) await repo.createCategory('Collection '+i); });
    await page.reload(); await ready();
    const top = (await page.locator('.tuning-collections .tuning-list-heading').boundingBox()).y;
    await page.locator('#tuning-collections').evaluate(n => n.scrollTop = n.scrollHeight);
    assert.equal((await page.locator('.tuning-collections .tuning-list-heading').boundingBox()).y, top);
    assert(await page.locator('#tuning-manage-collections').isVisible());
    for (const [width,height] of [[1760,1000],[1024,768],[390,844],[320,800]]) {
      await page.setViewportSize({width,height});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      if(process.env.SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`corrections-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1760,height:1000});
    // Delete every stored/factory tuning; the empty state still offers backup and creation.
    while(await page.locator('.tuning-preset').count()) {
      await page.locator('.tuning-preset').first().click(); await page.locator('#tuning-delete').click(); await page.locator('[data-choice=delete]').click();
      await page.waitForFunction(()=>!document.querySelector('#tuning-new').disabled);
    }
    assert(await page.locator('#tuning-no-selection').isVisible());
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tuning-new');
    await page.reload(); await page.waitForFunction(()=>document.querySelector('#tuning-no-selection').hidden === false);
    assert.equal(await page.locator('.tuning-preset').count(), 0);
    await page.locator('[data-count="7"]').click(); await page.locator('#tuning-new').click();
    assert.equal(await page.getByLabel('String 7 full note',{exact:true}).inputValue(), '35');
    await page.locator('#tuning-delete').click(); await page.locator('[data-choice=delete]').click();
    await page.waitForFunction(()=>document.querySelector('#tuning-no-selection').hidden === false);
    assert.equal((await snapshot()).tunings.length,0);
    console.log('PASS UX corrections: fixed cards, contained badge, single collection/default favorite, direct +, legacy preservation, fixed collection header, factory deletion/backup/reload, exact peg order, empty library and draft discard');
  } finally { await context.close(); }
}
