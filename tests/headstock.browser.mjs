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
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/GuitarTools_WebApp/`);
  await page.waitForFunction(() => !document.querySelector('#tuning-save-as').disabled);
  const expected = {6:[[4,5,6],[3,2,1]],7:[[4,5,6,7],[3,2,1]],8:[[5,6,7,8],[4,3,2,1]]};
  for (const count of [6,7,8]) {
    await page.locator(`[data-count="${count}"]`).click();
    await page.locator('#tuning-new').click();
    const anchors = await page.evaluate(async count => (await import('./src/ui/headstock.js')).headstockAnchors(count), count);
    for (const [i,side] of ['left','right'].entries()) {
      assert.deepEqual(anchors.filter(a=>a.side===side).sort((a,b)=>a.y-b.y).map(a=>a.number),expected[count][i]);
    }
    for (const {id,number,index,x,y} of anchors) {
      const peg = page.locator(`.headstock-peg[data-string="${id}"]`);
      // Click the actual post, not the wire's much larger bounding rectangle.
      await peg.locator('.peg-ring').click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),`tuning-${id}-full`);
      await peg.focus(); await page.keyboard.press(number%2 ? 'Enter' : 'Space');
      assert.equal(await page.evaluate(()=>document.activeElement.id),`tuning-${id}-full`);
      await page.getByLabel(`String ${number} full note`,{exact:true}).selectOption(String(40+index));
      const label = await page.evaluate(async midi => (await import('./src/domain/notes.js')).noteLabel(midi),40+index);
      assert.equal(await peg.getAttribute('aria-label'),`Edit string ${number}, ${label}`);
      assert.equal(await page.getByLabel(`String ${number} pitch class`,{exact:true}).inputValue(),String((40+index)%12));
      assert(await page.locator('.tuning-headstock').evaluate((svg,{x,y})=>svg.querySelector('g[aria-hidden] > path').isPointInFill(new DOMPoint(x,y)),{x,y}));
      const wire = await peg.locator('.headstock-wire').getAttribute('d');
      assert(wire.endsWith(`L${x} ${y}`));
      await page.locator('.peg-control').filter({has:page.locator(`#tuning-${id}-full`)}).locator('button').click();
      await page.waitForFunction(id=>document.querySelector(`.headstock-peg[data-string="${id}"]`).classList.contains('is-playing'),id);
      assert(!(await page.locator('#tuning-audio-status').textContent()).includes('unavailable'));
      await page.locator('#tuning-stop').click();
    }
    for (const [width,height] of [[1760,1000],[1024,768],[768,1000],[390,844],[320,800]]) {
      await page.setViewportSize({width,height});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const boxes = await page.locator('.peg-control').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
      for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) {
        const a=boxes[i],b=boxes[j]; assert(a.right<=b.x || b.right<=a.x || a.bottom<=b.y || b.bottom<=a.y,`${count}/${width}: controls overlap`);
      }
      // Ensure the artwork itself stays in its SVG viewport.
      assert(await page.locator('.tuning-headstock').evaluate(svg=>{const b=svg.getBBox();return b.x>=0 && b.y>=0 && b.x+b.width<=560 && b.y+b.height<=624;}));
      if(process.env.SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`headstock-${count}-${width}.png`),fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 6/7/8 exact geometry, post click, Enter/Space, note editing, per-string audition/Stop, 320–1760px containment and control spacing');
} finally { await browser?.close(); server.close(); }
