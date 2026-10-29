export const uid = () => globalThis.crypto.randomUUID();
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const REVIEW_STATES = ['suggested', 'confirmed', 'ambiguous', 'excluded'];
export function validateRegion(start, end, duration) {
  if (![start,end,duration].every(Number.isFinite) || start < 0 || end > duration || end - start < .02) throw new Error('Use a region of at least 20 ms inside the recording.');
  return { start, end };
}
export function createMarker(time, duration, drumId = null, origin = 'manual') {
  if (!Number.isFinite(duration) || duration < .02) throw new Error('Import audio before adding a hit.');
  const onset = clamp(time, 0, duration - .02);
  return { id:uid(), drumId, onset, start:onset, end:Math.min(duration,onset+.4), origin, review:origin==='manual'?'confirmed':'suggested', result:null };
}
export function editMarker(marker, changes, duration) {
  const next = {...marker,...changes};
  validateRegion(next.start,next.end,duration);
  if (!Number.isFinite(next.onset) || next.onset < next.start || next.onset > next.end || !REVIEW_STATES.includes(next.review)) throw new Error('Onset must be inside the hit region; choose a valid review state.');
  if (['start','end','onset','drumId'].some(k=>next[k]!==marker[k])) next.result = null;
  return next;
}
export function moveMarker(marker, delta, duration) {
  const shift = clamp(delta,-marker.start,duration-marker.end);
  return editMarker(marker,{onset:marker.onset+shift,start:marker.start+shift,end:marker.end+shift},duration);
}
export function defaultDrums() {
  return ['Kick','Snare','Tom 8″','Tom 12″','Tom 14″','Tom 16″'].map((label,i)=>({id:uid(),label,kind:i===0?'kick':i===1?'snare':'tom',color:['#9ab4c7','#c2a2c8','#dca874','#b9be80','#80b7af','#879fd2'][i]}));
}
