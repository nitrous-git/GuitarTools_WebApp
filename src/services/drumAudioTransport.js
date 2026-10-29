export class DrumAudioTransport {
  constructor(createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()) {
    this.createContext=createContext;this.tracks={};this.sources=new Set();this.position=0;this.playing=false;this.mode='original';this.generation=0;
  }
  context(){return this.ctx ||= this.createContext();}
  async decode(file) {
    if(!file.size||!(/\.(wav|mp3|flac)$/i.test(file.name)))throw new Error('Choose a nonempty WAV, MP3 or FLAC file. Codec support depends on your browser.');
    if(file.size>200*1024*1024)throw new Error('Audio exceeds the 200 MiB import limit. Use a shorter excerpt.');
    try{return await this.context().decodeAudioData(await file.arrayBuffer());}catch{throw new Error('This browser could not decode the file. Try PCM WAV or another supported encoding.');}
  }
  setTrack(key,buffer,offset=0){this.pause();this.tracks[key]?.gain.disconnect();const gain=this.context().createGain();gain.connect(this.ctx.destination);this.tracks[key]={buffer,offset,gain,volume:.7,muted:false};this.updateGains();}
  clear(){this.pause();for(const t of Object.values(this.tracks))t.gain.disconnect();this.tracks={};this.position=0;}
  get duration(){return Math.max(0,...Object.values(this.tracks).map(t=>t.offset+t.buffer.duration));}
  updateGains(){const audible=Object.entries(this.tracks).filter(([key,t])=>!t.muted&&(this.mode==='both'||this.mode===key));const scale=1/Math.max(1,audible.length);for(const [key,t]of Object.entries(this.tracks))t.gain.gain.value=audible.some(([k])=>k===key)?t.volume*scale:0;}
  current(){if(!this.playing)return this.position;const elapsed=Math.max(0,this.ctx.currentTime-this.clock);const first=this.range.end-this.anchor;if(elapsed<first)return this.anchor+elapsed;return this.loop?this.range.start+(elapsed-first)%(this.range.end-this.range.start):this.range.end;}
  schedule(from,to,when){for(const t of Object.values(this.tracks)){const a=Math.max(from,t.offset),b=Math.min(to,t.offset+t.buffer.duration);if(b<=a)continue;const s=this.ctx.createBufferSource();s.buffer=t.buffer;s.connect(t.gain);s.onended=()=>{this.sources.delete(s);s.disconnect();};this.sources.add(s);s.start(when+a-from,a-t.offset,b-a);}}
  async play(range,loop=false){
    this.pause();if(!this.duration)return;
    const generation=this.generation;await this.context().resume();if(generation!==this.generation)return;
    this.range={start:Math.max(0,range.start),end:Math.min(this.duration,range.end)};if(this.range.end<=this.range.start)return;
    this.loop=loop;this.anchor=this.position>=this.range.start&&this.position<this.range.end?this.position:this.range.start;this.clock=this.ctx.currentTime+.025;this.playing=true;
    this.schedule(this.anchor,this.range.end,this.clock);this.next=this.clock+this.range.end-this.anchor;
    this.timer=setInterval(()=>{if(!this.playing)return;if(!this.loop&&this.ctx.currentTime>=this.next){this.pause();this.position=this.range.end;return;}while(this.loop&&this.next<this.ctx.currentTime+.15){this.schedule(this.range.start,this.range.end,this.next);this.next+=this.range.end-this.range.start;}},25);
  }
  pause(){this.position=this.current();this.playing=false;this.generation++;clearInterval(this.timer);for(const s of this.sources){s.onended=null;try{s.stop();}catch{}s.disconnect();}this.sources.clear();}
  seek(time){const was=this.playing,range=this.range,loop=this.loop;this.pause();this.position=Math.max(0,Math.min(this.duration,time));if(was)return this.play(range,loop);}
  stop(start=0){this.pause();this.position=start;}
}
