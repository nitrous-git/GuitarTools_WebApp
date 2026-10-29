import {estimatePitch} from './drumPitchEstimator.js';
// Cache a single mono conversion per AudioBuffer. No repeated full-song preprocessing.
const monoCache=new WeakMap();
export function monoAudio(buffer) {
  if(!monoCache.has(buffer)) {
    const mono=new Float32Array(buffer.length);
    for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<mono.length;i++)mono[i]+=channel[i]/buffer.numberOfChannels;}
    monoCache.set(buffer,mono);
  }
  return monoCache.get(buffer);
}
export function analyzeHit(buffer,marker,kind,offset=0) {
  const start=marker.start-offset,end=marker.end-offset;
  if(start<0||end>buffer.duration+.00001)throw new Error('This hit extends beyond the selected audio source. Refine its region.');
  const result=estimatePitch(monoAudio(buffer).subarray(Math.floor(start*buffer.sampleRate),Math.floor(end*buffer.sampleRate)),buffer.sampleRate,kind);
  return {...result,analyzedStart:marker.start,analyzedEnd:marker.end};
}
