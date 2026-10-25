// Optional development test only. Install Playwright outside the deployed site.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const served = [];
const server = http.createServer((req,res) => {
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/GuitarTools_WebApp\//,'');
  const file = path.join(root,relative || 'index.html');
  served.push(relative);
  try {
    res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.statusCode=404; res.end('Missing'); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/GuitarTools_WebApp/`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1760,height:1000}});
page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const fixture=path.join(root,'tests/fixtures/public/stage-b-generated.gp');
const choose=async action=>page.locator(`dialog [data-choice=${action}]`).click();
const rows=()=>page.locator('#library-rows tr');
const idle=()=>page.waitForFunction(()=>!document.querySelector('.library-page').hasAttribute('aria-busy'));
const action=async name=>{await page.getByRole('button',{name:/Actions for/}).first().click();await choose(name);};
try{
  await page.goto(`${base}?test#/library`);await idle();
  assert.equal(await rows().count(),0);assert.equal(await page.evaluate(()=>window.stageB),undefined);
  await page.setInputFiles('#library-import',[{name:'stage-b-generated.gp',mimeType:'application/octet-stream',buffer:fs.readFileSync(fixture)},{name:'corrupt.gp',mimeType:'application/octet-stream',buffer:Buffer.from('bad')}]);await idle();
  assert.equal(await rows().count(),1);assert.match(await page.locator('#library-status').textContent(),/1 imported.*1 failed[\s\S]*corrupt.gp/);
  await page.setInputFiles('#library-import',fixture);await choose('skip');await idle();assert.equal(await rows().count(),1);
  await page.setInputFiles('#library-import',fixture);await choose('keep');await idle();assert.equal(await rows().count(),2);
  for(const name of ['Practice','Metal']){await page.locator('.library-heading [data-action=new]').click();await page.getByLabel('Collection name',{exact:true}).fill(name);await choose('save');await idle();}
  await action('edit');await page.getByLabel('Song title',{exact:true}).fill('My practice song');await page.getByLabel('Artist',{exact:true}).fill('Personal');await page.getByLabel('Personal notes',{exact:true}).fill('Slow alternate picking <script>');await choose('save');await idle();
  await page.locator('#library-search').fill('My practice');await page.getByRole('button',{name:'Favorite My practice song',exact:true}).click();await idle();
  await action('collections');await page.getByLabel('Practice',{exact:true}).check();await page.getByLabel('Metal',{exact:true}).check();await choose('save');await idle();
  assert.match(await page.locator('#library-inspector').textContent(),/Practice.*Metal|Metal.*Practice/);
  await page.reload();await idle();await page.locator('#library-search').fill('My practice');assert.equal(await rows().count(),1);assert.match(await page.locator('#library-inspector').textContent(),/Slow alternate picking <script>/);
  await page.selectOption('#library-format','gp5');assert.equal(await rows().count(),0);await page.selectOption('#library-format','gp');assert.equal(await rows().count(),1);
  await page.locator('#library-search').fill('');await page.selectOption('#library-sort','title');
  for(const width of [1760,1280,390,280]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(process.env.SCREENSHOT_DIR&&width!==280)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`library-${width}.png`),fullPage:true});}
  await page.setViewportSize({width:1760,height:1000});await page.locator('#library-search').fill('My practice');
  const downloadPromise=page.waitForEvent('download');await action('download');const download=await downloadPromise;const downloadPath=await download.path();assert.deepEqual(fs.readFileSync(downloadPath),fs.readFileSync(fixture));
  await page.getByRole('button',{name:'▶ Open in Player',exact:true}).click();await page.waitForURL(/#\/player$/);await page.waitForFunction(()=>window.stageB?.originalBytes?.length&&document.querySelector('#score svg'));
  assert.equal(await page.evaluate(()=>stageB.api.score.title),'Stage B original exercise');await page.waitForTimeout(500);assert(await page.evaluate(()=>stageB.source.includes('stage-b-generated.gp')));
  await page.evaluate(()=>{window.retained=stageB;window.retainedPlayer=stageB.api.player;});
  await page.locator('[data-route=library]').click();await idle();await page.getByRole('button',{name:'▶ Open in Player',exact:true}).click();await page.waitForURL(/#\/player$/);assert(await page.evaluate(()=>stageB===retained&&stageB.api.player===retainedPlayer));
  await page.locator('[data-route=tuning]').click();await page.locator('#tuning-name').fill('Keep this draft');
  await page.locator('[data-route=library]').click();await idle();await page.getByRole('button',{name:'♫ Open tuning',exact:true}).click();await page.locator('dialog select[name=track]').selectOption('1');await choose('open');await page.waitForURL(/#\/tuning$/);assert.equal(await page.locator('#tuning-count').inputValue(),'7');assert.match(await page.locator('#tuning-status').textContent(),/new unsaved draft/);
  await page.locator('#tuning-count').selectOption('6');assert.equal(await page.locator('#tuning-name').inputValue(),'Keep this draft');
  await page.locator('[data-route=library]').click();await idle();
  const backupPromise=page.waitForEvent('download');await page.locator('[data-action=export]').click();const backup=await backupPromise;const backupPath=await backup.path();await idle();
  const clean=await browser.newPage();clean.on('pageerror',e=>errors.push(e.message));await clean.goto(`${base}?test#/library`);await clean.waitForFunction(()=>!document.querySelector('.library-page').hasAttribute('aria-busy'));
  await clean.setInputFiles('#library-restore',backupPath);await clean.locator('dialog [data-choice=restore]').click();await clean.waitForFunction(()=>document.querySelector('#library-status').textContent.startsWith('Restored'));
  assert.equal(await clean.locator('#library-rows tr').count(),2);await clean.locator('#library-search').fill('My practice');assert.match(await clean.locator('#library-inspector').textContent(),/Slow alternate picking/);
  await clean.getByRole('button',{name:'▶ Open in Player',exact:true}).click();await clean.waitForFunction(()=>window.stageB?.originalBytes?.length);assert.deepEqual(await clean.evaluate(()=>Array.from(stageB.originalBytes)),Array.from(fs.readFileSync(fixture)));
  await clean.close();
  // Exercise a selected file arriving while the first Player demo fetch is pending.
  const race=await browser.newPage(); race.setDefaultTimeout(15000);
  let releaseDemo; const demoGate=new Promise(resolve=>{releaseDemo=resolve;});
  let demoRequested; const demoSeen=new Promise(resolve=>{demoRequested=resolve;});
  await race.route('**/stage-b.tex',async route=>{demoRequested();await demoGate;await route.continue();});
  await race.goto(`${base}?test#/library`);
  await race.setInputFiles('#library-import',fixture);
  await race.waitForFunction(()=>document.querySelector('#library-rows tr'));
  await race.locator('[data-route=player]').click(); await demoSeen;
  await race.locator('[data-route=library]').click();
  await race.waitForFunction(()=>!document.querySelector('.library-page').hasAttribute('aria-busy'));
  await race.getByRole('button',{name:'▶ Open in Player',exact:true}).click(); releaseDemo();
  await race.waitForFunction(()=>window.stageB?.originalBytes?.length);
  await race.waitForTimeout(300);
  assert.deepEqual(await race.evaluate(()=>Array.from(stageB.originalBytes)),Array.from(fs.readFileSync(fixture)));
  await race.close();
  await page.getByRole('button',{name:'Manage collection Metal',exact:true}).click();await choose('delete');await choose('delete');await idle();await page.locator('#library-search').fill('');assert.equal(await rows().count(),2);
  await action('delete');await choose('delete');await idle();assert.equal(await rows().count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS Library browser: imports/errors, duplicates, CRUD, multi-collections, reload, search/filter/sort, 280–1760px layout, original download, retained Player first/repeat load, tuning draft preservation, ZIP clean-profile restore and restored Player load.');
}catch(error){console.error('LIBRARY STATUS',await page.locator('#library-status').textContent().catch(()=>''));console.error('DIALOG',await page.locator('dialog').allTextContents());throw error;}finally{await browser.close();server.close();}
