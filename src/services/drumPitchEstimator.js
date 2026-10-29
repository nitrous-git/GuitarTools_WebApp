// Dependency-free radix-2 FFT; analysis reports a resonant tone, not lug tension.
export const ALGORITHM_VERSION = 'resonance-stft-1.0';
const median = values => { const v=[...values].sort((a,b)=>a-b); return v.length ? (v[Math.floor((v.length-1)/2)]+v[Math.floor(v.length/2)])/2 : null; };
export function frequencyNote(hz) {
  if (!(hz>0) || !Number.isFinite(hz)) return null;
  const midi=69+12*Math.log2(hz/440), nearest=Math.round(midi);
  return { note:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][((nearest%12)+12)%12], octave:Math.floor(nearest/12)-1, cents:100*(midi-nearest), midi:nearest };
}
export function spectrum(samples, size) {
  const real=new Float64Array(size), imag=new Float64Array(size);
  const length=Math.min(samples.length,size), mean=samples.reduce((s,x)=>s+x,0)/samples.length;
  for(let i=0;i<length;i++) real[i]=(samples[i]-mean)*(.5-.5*Math.cos(2*Math.PI*i/(length-1)));
  for(let i=1,j=0;i<size;i++) { let bit=size>>1; for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[real[i],real[j]]=[real[j],real[i]]; }
  for(let len=2;len<=size;len<<=1) {
    const angle=-2*Math.PI/len;
    for(let i=0;i<size;i+=len)for(let j=0;j<len/2;j++) {
      const a=i+j,b=a+len/2,c=Math.cos(angle*j),s=Math.sin(angle*j),r=real[b]*c-imag[b]*s,im=real[b]*s+imag[b]*c;
      real[b]=real[a]-r;imag[b]=imag[a]-im;real[a]+=r;imag[a]+=im;
    }
  }
  return Float64Array.from(real.subarray(0,size/2),(r,i)=>r*r+imag[i]*imag[i]);
}
const uncertain = reason => ({version:ALGORITHM_VERSION,hz:null,quality:'uncertain',confidence:0,reason,spectrum:[]});
export function estimatePitch(samples, sampleRate, kind='tom') {
  if(samples.length/sampleRate>2)return uncertain('Region too long: isolate one hit within two seconds.');
  if (!(sampleRate>=8000) || samples.length/sampleRate<.12) return uncertain('Region too short: use at least 120 ms of decay.');
  let energy=0, peak=0, peakIndex=0, clipped=0;
  for(let i=0;i<samples.length;i++){const a=Math.abs(samples[i]);if(!Number.isFinite(a))return uncertain('Invalid audio samples.');energy+=a*a;if(a>peak){peak=a;peakIndex=i;}if(a>=.999)clipped++;}
  if(Math.sqrt(energy/samples.length)<.0001) return uncertain('Silence or signal too quiet.');
  const [lo,hi]=kind==='kick'?[30,200]:kind==='snare'?[90,700]:[45,650];
  // Skip the attack only when it is near the region start. Long selections are capped.
  const skip=Math.min(Math.floor(sampleRate*.03),Math.floor(samples.length*.12),peakIndex+Math.floor(sampleRate*.008));
  const available=Math.min(samples.length-skip,Math.floor(sampleRate*1.5));
  const frame=Math.min(available,Math.floor(sampleRate*.18));
  if(frame/sampleRate<.09)return uncertain('Not enough decay after attack.');
  let n=1;while(n<frame*4)n*=2;
  const hop=Math.max(1,Math.floor(frame/3)), frames=[], avg=new Float64Array(n/2);
  for(let offset=skip;offset+frame<=skip+available && frames.length<24;offset+=hop) {
    const p=spectrum(samples.subarray(offset,offset+frame),n), peaks=[];
    let band=0, total=0;
    for(let k=1;k<p.length;k++) {total+=p[k];if(k*sampleRate/n>=lo&&k*sampleRate/n<=hi)band+=p[k];}
    for(let k=Math.max(2,Math.ceil(lo*n/sampleRate));k<Math.min(p.length-1,hi*n/sampleRate);k++) {
      if(p[k]>p[k-1]&&p[k]>=p[k+1]) {
        const a=Math.log(p[k-1]+1e-30),b=Math.log(p[k]+1e-30),c=Math.log(p[k+1]+1e-30),shift=.5*(a-c)/(a-2*b+c);
        peaks.push({hz:(k+Math.max(-.5,Math.min(.5,shift)))*sampleRate/n,power:p[k],k});
      }
    }
    peaks.sort((a,b)=>b.power-a.power);
    if(!peaks.length||band<=0)continue;
    let best=peaks[0];
    // A measurable subharmonic may beat a stronger overtone. Never invent a missing fundamental.
    const lower=peaks.filter(p=>p.hz<best.hz*.75&&p.power>best.power*.12&&[2,3].some(h=>Math.abs(1200*Math.log2(best.hz/(p.hz*h)))<40));
    if(lower.length)best=lower.sort((a,b)=>a.hz-b.hz)[0];
    const radius=Math.ceil(2*n/frame);let tonal=0;
    const bins=new Set();
    for(const partial of peaks.filter(p=>[1,2,3].some(h=>Math.abs(1200*Math.log2(p.hz/(best.hz*h)))<40)&&p.power>peaks[0].power*.1))
      for(let k=Math.max(1,partial.k-radius);k<=Math.min(p.length-1,partial.k+radius);k++)bins.add(k);
    for(const k of bins)tonal+=p[k];
    frames.push({hz:best.hz,tonality:tonal/total});
    for(let k=0;k<avg.length;k++)avg[k]+=p[k];
  }
  if(!frames.length)return uncertain('No tonal resonance found.');
  const hz=median(frames.map(f=>f.hz)), spread=median(frames.map(f=>Math.abs(1200*Math.log2(f.hz/hz)))), tonality=median(frames.map(f=>f.tonality));
  const confidence=Math.max(0,Math.min(1,tonality*(1-Math.min(spread/100,1))));
  const reliable=tonality>.30&&spread<40&&clipped/samples.length<.02;
  const max=Math.max(...avg), plot=[];
  for(let k=Math.ceil(lo*n/sampleRate);k<=Math.floor(hi*n/sampleRate);k+=Math.max(1,Math.floor((hi-lo)*n/sampleRate/220)))plot.push([k*sampleRate/n,10*Math.log10(avg[k]/max+1e-12)]);
  return { version:ALGORITHM_VERSION,hz:reliable?hz:null,candidateHz:hz,note:reliable?frequencyNote(hz):null,confidence,quality:reliable?'usable':'uncertain',reason:reliable?'Persistent resonant tone; verify by listening.':'Weak, unstable, clipped or broadband decay; refine the region.',spreadCents:spread,spectrum:plot };
}
export function aggregateHits(markers) {
  const candidates=markers.filter(m=>m.review==='confirmed'&&m.result?.quality==='usable'&&m.result.hz>0);
  const center=median(candidates.map(m=>m.result.hz));
  const accepted=candidates.filter(m=>Math.abs(1200*Math.log2(m.result.hz/center))<=150);
  const outliers=candidates.filter(m=>!accepted.includes(m)).map(m=>m.id);
  const hz=median(accepted.map(m=>m.result.hz));
  return {hz,note:hz?frequencyNote(hz):null,count:accepted.length,outliers,confidence:accepted.length?median(accepted.map(m=>m.result.confidence)):0};
}
