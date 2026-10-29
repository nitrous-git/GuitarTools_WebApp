import {monoAudio} from '../../services/drumAnalysisEngine.js';
const peakCache=new WeakMap();
function peaks(buffer){
  if(!peakCache.has(buffer)){const mono=monoAudio(buffer),step=128,data=new Float32Array(Math.ceil(mono.length/step));for(let i=0;i<mono.length;i++)data[Math.floor(i/step)]=Math.max(data[Math.floor(i/step)],Math.abs(mono[i]));peakCache.set(buffer,{data,step});}
  return peakCache.get(buffer);
}
function draw(canvas,track,range,color){
  const w=Math.max(1,canvas.clientWidth),h=canvas.clientHeight,dpr=globalThis.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);ctx.strokeStyle='#2c3943';ctx.lineWidth=1;
  for(let x=0;x<w;x+=w/8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();if(!track)return;
  const {data,step}=peaks(track.buffer),scale=track.buffer.sampleRate/step;
  ctx.beginPath();for(let x=0;x<w;x++){const a=(range.start+x/w*(range.end-range.start)-track.offset)*scale,b=(range.start+(x+1)/w*(range.end-range.start)-track.offset)*scale;let p=0;for(let i=Math.max(0,Math.floor(a));i<Math.min(data.length,Math.ceil(b));i++)p=Math.max(p,data[i]);ctx.moveTo(x,h/2-p*h*.46);ctx.lineTo(x,h/2+p*h*.46);}ctx.stroke();
}
export class DrumWaveformEditor {
  constructor(root,{seek,select,edit,range}){
    this.root=root;this.callbacks={seek,select,edit,range};this.drag=null;
    root.addEventListener('pointerdown',e=>this.down(e));root.addEventListener('pointermove',e=>this.move(e));root.addEventListener('pointerup',e=>this.up(e));root.addEventListener('pointercancel',e=>this.up(e));
    root.addEventListener('keydown',e=>{const marker=e.target.closest('[data-hit]');if(marker&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(marker.dataset.hit);edit(marker.dataset.hit,'move',(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?.1:.01),true);}const handle=e.target.dataset.range;if(handle&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const p={...this.state.range};p[handle]+=(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1);range(p);}});
  }
  down(e){
    const surface=e.target.closest('[data-wave]');if(!surface||!this.state.duration||e.button!==0)return;
    const rect=surface.getBoundingClientRect(),isOverview=surface.dataset.wave==='overview',view=isOverview?{start:0,end:this.state.duration}:this.state.viewport;
    const hit=e.target.closest('[data-hit]'),edge=e.target.dataset.edge,rangeEdge=e.target.dataset.range;
    if(hit){e.preventDefault();e.stopPropagation();this.callbacks.select(hit.dataset.hit);this.drag={id:hit.dataset.hit,mode:edge||'move',x:e.clientX,scale:(view.end-view.start)/rect.width};}
    else if(rangeEdge){e.preventDefault();this.drag={rangeEdge,x:e.clientX,scale:this.state.duration/rect.width,range:{...this.state.range}};}
    else this.callbacks.seek(view.start+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(view.end-view.start));
    if(this.drag){this.drag.pointer=e.pointerId;this.root.setPointerCapture(e.pointerId);}
  }
  move(e){if(!this.drag)return;const d=this.drag,delta=(e.clientX-d.x)*d.scale;if(d.rangeEdge)this.callbacks.range({...d.range,[d.rangeEdge]:d.range[d.rangeEdge]+delta});else{this.callbacks.edit(d.id,d.mode,delta,false);d.x=e.clientX;}}
  up(e){if(!this.drag)return;const id=this.drag.id;this.drag=null;if(this.root.hasPointerCapture(e.pointerId))this.root.releasePointerCapture(e.pointerId);if(id)this.callbacks.edit(id,'finish',0,true);}
  render(state){
    this.state=state;const {tracks,duration,viewport,range,markers,selected,drums}=state;
    draw(this.root.querySelector('[data-wave=overview] canvas'),tracks.original||tracks.drums,{start:0,end:duration||1},'#819da9');
    for(const [key,color] of [['original','#8daabb'],['drums','#d99a68']])draw(this.root.querySelector(`[data-wave=${key}] canvas`),tracks[key],viewport,color);
    const selection=this.root.querySelector('.dt-overview-selection');selection.style.left=`${range.start/(duration||1)*100}%`;selection.style.width=`${(range.end-range.start)/(duration||1)*100}%`;
    const overlay=this.root.querySelector('.dt-markers');const focused=overlay.contains(document.activeElement)?document.activeElement?.dataset.hit:null;overlay.replaceChildren();
    for(const m of markers){if(m.end<viewport.start||m.start>viewport.end)continue;
      const width=viewport.end-viewport.start,region=document.createElement('div');region.className=`dt-region ${m.id===selected?'selected':''} ${m.review}`;region.dataset.hit=m.id;region.style.left=`${(m.start-viewport.start)/width*100}%`;region.style.width=`${(m.end-m.start)/width*100}%`;region.style.setProperty('--hit',drums.find(d=>d.id===m.drumId)?.color||'#a5afb9');
      const button=document.createElement('button');button.type='button';button.dataset.hit=m.id;button.textContent=drums.find(d=>d.id===m.drumId)?.label||'Unassigned';button.setAttribute('aria-label',`${button.textContent} at ${m.onset.toFixed(3)} seconds, ${m.review}`);button.setAttribute('aria-pressed',String(m.id===selected));button.style.left=`${(m.onset-m.start)/(m.end-m.start)*100}%`;button.onclick=()=>this.callbacks.select(m.id);region.append(button);
      for(const edge of ['start','end']){const handle=document.createElement('span');handle.className=`dt-hit-edge ${edge}`;handle.dataset.edge=edge;handle.title=`Drag ${edge}; exact values below`;region.append(handle);}overlay.append(region);
    }
    if(focused&&!this.drag)overlay.querySelector(`[data-hit="${focused}"] button`)?.focus({preventScroll:true});
    const ruler=this.root.querySelector('.dt-ruler');ruler.replaceChildren();for(let i=0;i<=4;i++){const span=document.createElement('span');span.textContent=`${(viewport.start+i/4*(viewport.end-viewport.start)).toFixed(2)}s`;ruler.append(span);}
  }
  playhead(time){const v=this.state?.viewport;if(!v)return;for(const line of this.root.querySelectorAll('.dt-playhead')){line.style.left=`${(time-v.start)/(v.end-v.start)*100}%`;line.hidden=time<v.start||time>v.end;}}
}
