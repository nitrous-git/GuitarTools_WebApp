// alphaTab 1.8.4: tuning is high-to-low; Note.string is 1-based LOW-to-high.
export const tuningLowToHigh = staff => [...staff.tuning].reverse();
export function position(note) {
  const staff = note.beat.voice.bar.staff;
  if (staff.isPercussion || note.string < 1 || note.string > staff.tuning.length || note.fret < 0) return null;
  return { staff: staff.index, sdkString: note.string, lowIndex: note.string - 1,
    string: staff.tuning.length - note.string + 1, fret: note.fret,
    tie: note.isTieDestination, dead: note.isDead };
}
export const positions = beats => beats.flatMap(b => b.isRest ? [] : b.notes.map(position).filter(Boolean));
export function diagnostic(track, beats) {
  const current = beats.filter(b => b.voice.bar.staff.track === track);
  const bars = [...new Set(current.map(b => b.voice.bar))];
  return { active: positions(current), measure: positions(bars.flatMap(b => b.voices.flatMap(v => v.beats))),
    bars: [...new Set(bars.map(b => b.index + 1))], beats: current.map(b => b.id) };
}
export function channelPolicy(tracks) {
  const channels = t => [...new Set([t.playbackInfo.primaryChannel, t.playbackInfo.secondaryChannel])];
  const percussion = t => t.staves.some(s => s.isPercussion) || channels(t).includes(9);
  const protectedChannels = new Set([9, ...tracks.filter(percussion).flatMap(channels)]);
  const safe = tracks.filter(t => !percussion(t) && channels(t).every(c => !protectedChannels.has(c)));
  const shared = [];
  for (let i = 0; i < tracks.length; i++) for (let j = i + 1; j < tracks.length; j++) {
    const common = channels(tracks[i]).filter(c => channels(tracks[j]).includes(c));
    if (common.length) shared.push(`${tracks[i].name || i + 1} / ${tracks[j].name || j + 1}: ${common.join(', ')}`);
  }
  return { safe, shared, excluded: tracks.filter(t => !safe.includes(t)) };
}
