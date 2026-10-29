// Energy-rise suggestions only; no instrument classification.
export function detectOnsets(samples,sampleRate,start,end) {
  const hop=Math.max(1,Math.round(sampleRate*.01)), points=[];let previous=0,last=-Infinity;
  for(let i=Math.floor(start*sampleRate);i<Math.min(samples.length,end*sampleRate);i+=hop){
    let energy=0;for(let j=i;j<Math.min(i+hop,samples.length);j++)energy+=samples[j]*samples[j];
    const rms=Math.sqrt(energy/hop),time=i/sampleRate;
    if(rms>.015&&rms>previous*2.5&&time-last>.12){points.push(time);last=time;if(points.length>=500)break;}
    previous=previous*.7+rms*.3;
  }
  return points;
}
