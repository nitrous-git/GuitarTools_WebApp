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
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[], requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>requests.push({url:r.url(),status:r.status()}));
const check=(name)=>console.log('PASS',name);
try {
  await page.goto(`${base}?test`);
  await page.waitForFunction(()=>window.stageB?.api.tickCache?.masterBars.length===6 && document.querySelector('#score svg'));
  assert.equal(await page.locator('#error').isVisible(),false);
  check('static subpath, score + TAB SVG, repeat timeline [0,1,0,1,2,3]');
  assert.deepEqual(await page.evaluate(()=>stageB.api.tickCache.masterBars.map(b=>b.masterBar.index)),[0,1,0,1,2,3]);
  for(const bars of ['2','3','4']) { await page.selectOption('#bars',bars); await page.waitForTimeout(200); assert.equal(await page.evaluate(()=>stageB.api.settings.display.barsPerRow),Number(bars)); const counts=await page.evaluate(()=>stageB.api.renderer.boundsLookup.staffSystems.map(s=>s.bars.length)); assert.deepEqual(counts,bars==='2'?[2,2]:bars==='3'?[3,1]:[4]); }
  await page.selectOption('#layout','horizontal'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>stageB.api.settings.display.layoutMode),1); assert.equal(await page.evaluate(()=>stageB.api.renderer.boundsLookup.staffSystems.length),1);
  assert(await page.locator('#score svg').count()>0);
  await page.locator('#zoom').fill('150'); await page.locator('#zoom').dispatchEvent('change'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>stageB.api.settings.display.scale),1.5);
  await page.selectOption('#layout','page'); await page.selectOption('#bars','2');
  await page.locator('#zoom').fill('100'); await page.locator('#zoom').dispatchEvent('change');
  check('Page geometry [2,2]/[3,1]/[4], one Horizontal system, 150% zoom');
  if(process.env.SCREENSHOT_DIR) await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'page.png'),fullPage:true});
  await page.click('#audio'); await page.waitForFunction(()=>stageB.audioReady && stageB.api.isReadyForPlayback);
  await page.click('#play'); await page.waitForFunction(()=>stageB.api.tickPosition>300);
  await page.click('#play'); const paused=await page.evaluate(()=>stageB.api.tickPosition); await page.waitForTimeout(150); assert.equal(await page.evaluate(()=>stageB.api.tickPosition),paused);
  await page.click('#stop');
  await page.evaluate(()=>stageB.seek(0)); await page.waitForTimeout(100);
  assert.equal(JSON.parse(await page.locator('#diagnostic').textContent()).active.length,3);
  await page.evaluate(()=>stageB.seek(1920)); await page.waitForTimeout(100);
  assert.equal(JSON.parse(await page.locator('#diagnostic').textContent()).active.length,0);
  await page.selectOption('#fret-track','2'); await page.evaluate(()=>stageB.seek(0)); await page.waitForTimeout(100);
  assert.equal(JSON.parse(await page.locator('#diagnostic').textContent()).active[0].string,8);
  await page.selectOption('#fret-track','0');
  await page.evaluate(()=>stageB.seek(stageB.api.tickCache.masterBars[4].start)); await page.waitForFunction(()=>document.querySelector('#tempo').textContent.includes('Score 90.0'));
  check('user-gesture audio, play/pause/stop, chord/rest seeks, 8-string low note, tempo change to 90 BPM');
  await page.getByLabel('visible Seven string',{exact:true}).check(); await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(()=>stageB.api.tracks.map(t=>t.index)),[0,1]);
  await page.getByLabel('mute Six string',{exact:true}).check(); await page.getByLabel('solo Seven string',{exact:true}).check();
  check('visibility independent of mixer controls (audible mix pending human check)');
  await page.getByLabel('mute Six string',{exact:true}).uncheck(); await page.getByLabel('solo Seven string',{exact:true}).uncheck();
  await page.selectOption('#loop-end','0'); await page.check('#loop');
  await page.evaluate(()=>{ window.wraps=0;let prev=0;stageB.api.playerPositionChanged.on(e=>{if(e.currentTick<prev)window.wraps++;prev=e.currentTick;}); });
  await page.click('#play');await page.waitForFunction(()=>window.wraps>=1,{},{timeout:10000});await page.click('#stop');await page.uncheck('#loop');
  check('selected occurrence loop wraps');
  await page.setInputFiles('#file',{name:'broken.gp',mimeType:'application/octet-stream',buffer:Buffer.from('bad')});
  await page.waitForFunction(()=>!document.querySelector('#error').hidden);
  assert.equal(await page.evaluate(()=>stageB.api.score.title),'Stage B original exercise');
  await page.setInputFiles('#file',{name:'empty.gp',mimeType:'application/octet-stream',buffer:Buffer.alloc(0)});
  await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('empty'));
  check('invalid/empty import preserves previous score');
  await page.setInputFiles('#file',path.join(root,'tests/fixtures/public/stage-b-generated.gp'));
  await page.waitForFunction(()=>stageB.originalBytes?.length>0); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>stageB.api.score.tracks.length),4);
  await page.click('#play');await page.waitForFunction(()=>stageB.api.tickPosition>300);await page.click('#stop');
  check('generated GP7-container import/render/play; not an independent Guitar Pro fixture');
  await page.click('#pitch-sample');await page.waitForFunction(()=>stageB.api.score.title==='Pitch reference E4' && stageB.api.isReadyForPlayback);
  const before=await page.evaluate(async()=>{const at=await import('./assets/vendor/alphatab/alphaTab.mjs');return at.model.JsonConverter.scoreToJson(stageB.api.score);});
  const measurements=[];
  for(const [pitch,speed] of [[0,100],[-2,100],[2,100],[0,50]]) {
    await page.selectOption('#pitch',String(pitch));await page.selectOption('#speed',String(speed));await page.click('#stop');await page.click('#play');
    await page.waitForFunction(()=>stageB.api.player.output._worklet && stageB.api.tickPosition>50);
    const hz=await page.evaluate(async()=>{
      // Test-only tap of the REAL live AudioWorklet output, not MIDI labels or export settings.
      const output=stageB.api.player.output,analyser=output.context.createAnalyser();analyser.fftSize=8192;output._worklet.connect(analyser);
      await new Promise(r=>setTimeout(r,350));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);output._worklet.disconnect(analyser);
      const rate=output.context.sampleRate;let best=0,bestLag=0;const corr=[];
      for(let lag=Math.floor(rate/400);lag<=Math.ceil(rate/260);lag++) {let xy=0,xx=0,yy=0;for(let i=0;i<data.length-lag;i++){xy+=data[i]*data[i+lag];xx+=data[i]**2;yy+=data[i+lag]**2;}corr[lag]=xy/Math.sqrt(xx*yy);if(corr[lag]>best){best=corr[lag];bestLag=lag;}}
      const a=corr[bestLag-1],b=corr[bestLag],c=corr[bestLag+1];const refined=bestLag+(a-c)/(2*(a-2*b+c));return {hz:rate/refined,correlation:best,rms:Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length)};
    });
    const expected=440*2**((64+pitch-69)/12);
    assert(hz.rms>0.0001);assert(Math.abs(1200*Math.log2(hz.hz/expected))<20,JSON.stringify({pitch,speed,...hz,expected}));
    measurements.push({pitch,speed,...hz,expected});await page.click('#stop');
    const after=await page.evaluate(async()=>{const at=await import('./assets/vendor/alphatab/alphaTab.mjs');return at.model.JsonConverter.scoreToJson(stageB.api.score);});
    assert.equal(after,before);
  }
  console.log('PITCH_MEASUREMENTS',JSON.stringify(measurements));check('live SoundFont PCM -2/0/+2 and 50% speed; score serialization invariant');
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(requests.filter(r=>r.status>=400).length,0);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('390px page fits; score/fretboard scroll internally');
  const second=await browser.newPage(); await second.route('**/sonivox.sf2',r=>r.fulfill({status:404,body:'missing'}));
  await second.goto(`${base}?test`);await second.waitForFunction(()=>window.stageB?.playerReady);await second.click('#audio');await second.waitForFunction(()=>document.querySelector('#error').textContent.includes('SoundFont unavailable'));
  await second.unroute('**/sonivox.sf2');await second.click('#audio');await second.waitForFunction(()=>stageB.audioReady);await second.close();check('missing SoundFont actionable error + successful retry');
  assert(served.includes('assets/vendor/alphatab/alphaTab.worklet.mjs'));check('AudioWorklet module served under repository subpath');
  console.log('BROWSER',browser.version());console.log('ASSETS',JSON.stringify([...new Set(served.filter(r=>r.startsWith('assets/vendor/')))]));
} finally {await browser.close();server.close();}
