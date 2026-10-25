import { stringMap } from '../domain/tunings.js';
import { noteLabel } from '../domain/notes.js';
const NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}
// One anchor map drives wires, pegs and surrounding HTML controls.
export function headstockAnchors(count) {
  return stringMap(count).map(string => ({ ...string,
    x: string.side === 'left' ? 195 : 365, y: 170 + string.row * 86,
    nutX: 236 + string.index * 88 / (count - 1)
  }));
}
export function createHeadstock(tuning, onSelect) {
  const svg = svgNode('svg', { viewBox: '0 0 560 620', class: 'tuning-headstock', role: 'group', 'aria-label': `${tuning.stringCount}-string interactive headstock` });
  // Project-drawn crown, bevels and monogram; no traced instrument artwork.
  const anchors = headstockAnchors(tuning.stringCount);
  const shoulder = Math.max(...anchors.map(anchor => anchor.y)) + 45;
  const body = `M234 620 V518 Q230 492 211 ${shoulder + 25} L163 ${shoulder}
    L166 126 L183 82 L310 42 L391 109 L397 ${shoulder - 12}
    L354 ${shoulder + 27} Q331 493 326 518 V620 Z`;
  const defs = svgNode('defs', {});
  for (const [id, stops] of [
    ['tuning-finish', [['0%', '#394148'], ['34%', '#20262b'], ['70%', '#14191e'], ['100%', '#30383d']]],
    ['tuning-metal', [['0%', '#657078'], ['24%', '#303a42'], ['60%', '#10161c'], ['100%', '#465159']]],
    ['tuning-nut', [['0%', '#adb3ad'], ['45%', '#66716e'], ['100%', '#343e3e']]]
  ]) {
    const gradient = svgNode('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '35%' });
    for (const [offset, color] of stops) gradient.append(svgNode('stop', { offset, 'stop-color': color }));
    defs.append(gradient);
  }
  const clip = svgNode('clipPath', { id: 'tuning-face-clip' });
  clip.append(svgNode('path', { d: body })); defs.append(clip); svg.append(defs);
  const face = svgNode('g', { 'aria-hidden': 'true', 'pointer-events': 'none' });
  face.append(svgNode('path', { d: body, fill: 'url(#tuning-finish)', stroke: '#11171c', 'stroke-width': 7, 'stroke-linejoin': 'round' }));
  // Thin bevels catch light without the bright binding of the former artwork.
  face.append(svgNode('path', { d: `M234 518 Q227 487 211 ${shoulder + 25} L163 ${shoulder} L166 126 L183 82 L310 42 L391 109`, fill: 'none', stroke: '#7b8588', 'stroke-width': 2, opacity: '.75' }));
  face.append(svgNode('path', { d: `M183 82 L310 42 L391 109 L378 118 L307 57 L190 95 L178 132 L176 ${shoulder - 6} L163 ${shoulder} L166 126 Z`, fill: '#839195', opacity: '.12' }));
  const grain = svgNode('g', { 'clip-path': 'url(#tuning-face-clip)', stroke: '#9ca29b', opacity: '.055', fill: 'none' });
  for (let i = 0; i < 16; i++) grain.append(svgNode('path', { d: `M${174 + i * 15} 45 Q${160 + i * 15} 255 ${180 + i * 15} 620` }));
  face.append(grain);
  // A geometric, open-line GT emblem drawn from simple strokes, not a brand font.
  face.append(svgNode('path', { d: 'M277 96 H257 L249 104 V120 H277 V110 H266 M285 96 H311 M298 96 V120', fill: 'none', stroke: '#d2a27c', 'stroke-width': 4, 'stroke-linejoin': 'bevel' }));
  face.append(svgNode('text', { x: 280, y: 140, 'text-anchor': 'middle', fill: '#b2aaa1', 'font-size': 8, 'font-family': 'sans-serif', 'letter-spacing': 2 }, 'GUITAR TOOLS'));
  // Restrained truss-rod cover sits between the strings above the nut.
  face.append(svgNode('path', { d: 'M269 489 L272 454 Q280 438 288 454 L291 489 Z', fill: '#11171b', stroke: '#4b555b' }));
  face.append(svgNode('path', { d: 'M278 481 H282 M280 479 V483', stroke: '#89918f', 'stroke-width': 1.5 }));
  svg.append(face);
  for (const anchor of anchors) {
    const { x, y, nutX, side, id, index, number } = anchor;
    const group = svgNode('g', { 'data-string': id, class: 'headstock-peg', role: 'button', tabindex: 0 });
    group.append(svgNode('path', { d: `M${nutX} 620 V510 L${x} ${y}`, fill: 'none', class: 'headstock-wire', stroke: '#b2b9b7', 'stroke-width': 2.7 - index * .22 }));
    group.append(svgNode('rect', { x: side === 'left' ? x - 55 : x, y: y - 8, width: 55, height: 16, rx: 3, fill: 'url(#tuning-metal)', stroke: '#58636b' }));
    const buttonX = side === 'left' ? x - 61 : x + 61;
    group.append(svgNode('path', { d: `M${buttonX - 9} ${y - 19} H${buttonX + 8} L${buttonX + 14} ${y - 10} V${y + 11} L${buttonX + 7} ${y + 19} H${buttonX - 9} L${buttonX - 14} ${y + 10} V${y - 10} Z`, fill: 'url(#tuning-metal)', stroke: '#647078', 'stroke-width': 1.5 }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 22, fill: '#141b20', stroke: '#75828a', 'stroke-width': 2, class: 'peg-ring' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 15, fill: 'url(#tuning-metal)' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 7, fill: '#161e24', stroke: '#9ba5a7' }));
    group.append(svgNode('path', { d: `M${x - 4} ${y + 3} L${x + 4} ${y - 3}`, stroke: '#79868e', 'stroke-width': 2 }));
    group.setAttribute('aria-label', `Edit string ${number}, ${noteLabel(tuning.notesLowToHigh[index])}`);
    group.addEventListener('click', () => onSelect(id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); }
    });
    svg.append(group);
  }
  svg.append(svgNode('rect', { x: 233, y: 506, width: 94, height: 8, fill: 'url(#tuning-nut)', stroke: '#a4ada9', 'pointer-events': 'none' }));
  for (const { nutX } of anchors) svg.append(svgNode('path', { d: `M${nutX} 506 V514`, stroke: '#1c262b', 'stroke-width': 2, 'pointer-events': 'none', 'aria-hidden': 'true' }));
  return svg;
}
