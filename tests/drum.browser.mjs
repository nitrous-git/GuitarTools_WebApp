// Dev-only: PLAYWRIGHT_MODULE and CHROMIUM_PATH may point to external installations.
import {createRequire} from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\/GuitarTools_WebApp\//,'')||'index.html');try{res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Missing');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1760,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const base=`http://127.0.0.1:${server.address().port}/GuitarTools_WebApp/`;
const idle=()=>page.waitForFunction(()=>!document.querySelector('.drum-page').hasAttribute('aria-busy'));
const action=async name=>{await page.locator(`.drum-page [data-action="${name}"]`).first().click();await idle();};
function wav(sr=48000){const n=sr*4,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const t=i/sr;let sample=0;for(const onset of [.5,1.5,2.5])if(t>=onset&&t<onset+.65)sample+=.55*Math.sin(2*Math.PI*110*(t-onset))*Math.exp(-(t-onset)*4);b.writeInt16LE(Math.round(sample*32767),44+i*2);}return b;}
try{
  // Instrument real source scheduling without replacing Web Audio.
  await page.addInitScript(()=>{window.drumStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.drumStarts.push(args);return start.apply(this,args);};});
  await page.goto(base+'?test#/drum-assistant');await page.locator('#dt-title').waitFor();assert.equal(await page.evaluate(()=>window.stageB),undefined);
  for(const [key,sr]of [['original',44100],['drums',48000]]){const file={name:key+'.wav',mimeType:'audio/wav',buffer:wav(sr)};const choosing=page.waitForEvent('filechooser');await page.locator(`[data-action=import-${key}]`).click();const chooser=await choosing;await chooser.setFiles(file);await idle();assert.match(await page.locator(`#dt-${key}-name`).textContent(),/wav/);}
  await page.locator('#dt-name').fill('Browser test kit');
  await page.locator('#dt-kit-list button').nth(2).click();
  await page.locator('#dt-seek').evaluate(e=>{e.value=.5;e.dispatchEvent(new Event('input',{bubbles:true}));});await idle();await action('add-hit');
  await action('analyze-hit');assert.match(await page.locator('.dt-frequency').textContent(),/110\.\d Hz/);
  const initial=await page.locator('#dt-onset').inputValue();assert.equal(initial,'0.500');
  await page.locator('.dt-region button').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#dt-onset').inputValue(),'0.510');assert.equal(await page.locator('.dt-frequency').textContent(),'—');
  await action('analyze-hit');assert.match(await page.locator('.dt-frequency').textContent(),/110/);
  await page.locator('#dt-start').fill('.5');await page.locator('#dt-onset').fill('.5');await page.locator('#dt-end').fill('1.05');await action('apply-hit');await action('analyze-hit');
  await page.locator('#dt-range-start').fill('.4');await page.locator('#dt-range-start').press('Tab');await page.locator('#dt-range-end').fill('1.2');await page.locator('#dt-range-end').press('Tab');assert.equal(await page.locator('#dt-onset').inputValue(),'0.500');await action('fit-range');
  // Drag marker without seeking, then resize the decay region.
  const before=await page.locator('#dt-seek').inputValue();let rect=await page.locator('.dt-region').boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+60);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.5+12,rect.y+60);await page.mouse.up();assert.equal(await page.locator('#dt-seek').inputValue(),before);assert(Number(await page.locator('#dt-onset').inputValue())>.5);
  const end=Number(await page.locator('#dt-end').inputValue());rect=await page.locator('.dt-hit-edge.end').boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+40);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+8,rect.y+40);await page.mouse.up();assert(Number(await page.locator('#dt-end').inputValue())>end);
  await action('analyze-hit');await page.getByRole('button',{name:'Exclude',exact:true}).click();assert.equal(await page.locator('.dt-frequency').textContent(),'—');await page.getByRole('button',{name:'Restore',exact:true}).click();assert.match(await page.locator('.dt-frequency').textContent(),/110/);
  assert(await page.locator('#dt-loop').isVisible());await page.locator('#dt-monitor').selectOption('both');await action('play');const starts=await page.evaluate(()=>drumStarts.slice(-2));assert.equal(starts[0][0],starts[1][0]);assert.equal(starts[0][1],starts[1][1]);
  await page.locator('[data-route=tuning]').click();await page.locator('[data-route=drum-assistant]').click();await page.waitForFunction(()=>document.querySelector('[data-route=drum-assistant]').hasAttribute('aria-current'));assert.equal(await page.locator('[data-action=play]').textContent(),'▶ Play');
  await action('save');assert.match(await page.locator('#dt-status').textContent(),/saved/);
  for(const width of [1760,1280,1024,390,280]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);if(process.env.SCREENSHOT_DIR&&width!==280)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`drum-${width}.png`),fullPage:true});}
  await page.reload();await page.locator('#dt-title').waitFor();await page.locator('[data-action=saved]').click();await page.locator('dialog [data-choice=load]').click();await idle();assert.equal(await page.locator('#dt-name').inputValue(),'Browser test kit');assert.equal(await page.locator('#dt-hit-list button').count(),1);assert.match(await page.locator('#dt-original-name').textContent(),/Reimport/);assert.match(await page.locator('#dt-summary-rows').textContent(),/110/);
  // Reimport retains saved results, then selected hit can be re-analyzed.
  await page.setInputFiles('#dt-drums-file',{name:'drums.wav',mimeType:'audio/wav',buffer:wav()});await idle();await page.locator('#dt-hit-list button').click();await action('analyze-hit');assert.match(await page.locator('.dt-frequency').textContent(),/110/);
  await page.setInputFiles('#dt-original-file',{name:'corrupt.wav',mimeType:'audio/wav',buffer:Buffer.from('broken')});await idle();assert.match(await page.locator('#dt-status').textContent(),/could not decode/);
  await action('reset-range');await action('suggest');assert(await page.locator('#dt-hit-list button').count()>1);assert.match(await page.locator('#dt-hit-list').textContent(),/Unassigned/);
  await page.locator('[data-route=player]').click();await page.waitForFunction(()=>window.stageB?.api);await page.evaluate(()=>window.retainedDrumPlayer=stageB);await page.locator('[data-route=drum-assistant]').click();await page.locator('[data-route=player]').click();assert(await page.evaluate(()=>stageB===retainedDrumPlayer));
  assert.deepEqual(errors,[]);console.log('PASS Drum browser: real WAV decode, source clock sync, DSP, precise/keyboard/drag/resize editing, exclusion/restore, excerpts, navigation pause, save/reload/reimport, corrupt import, onset suggestions, retained Player, 280–1760px responsive layout.');
}finally{await browser.close();server.close();}
