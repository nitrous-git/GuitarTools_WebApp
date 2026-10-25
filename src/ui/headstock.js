import { stringMap } from '../domain/tunings.js';
import { noteLabel } from '../domain/notes.js';
const NS = 'http://www.w3.org/2000/svg';
function svgNode(tag, attributes, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}
// Deliberately separate contours: compact 3+3, offset 4+3, broad swept 4+4.
// Coordinates are project-drawn, not traced from a manufacturer's outline.
const VARIANTS = {
  6: {
    body: 'M234 620 V515 C231 476 209 453 164 433 Q158 430 163 420 C190 350 198 250 197 160 L195 74 Q195 66 202 72 C247 108 296 112 351 91 Q359 87 360 96 C356 216 366 344 399 420 Q403 429 396 433 C351 456 330 480 326 515 V620 Z',
    left: [[228,172],[209,282],[184,392]], right: [[332,172],[351,282],[376,392]]
  },
  7: {
    body: 'M232 620 V515 C228 482 205 467 159 443 Q153 440 158 431 C184 355 194 255 195 149 L196 52 Q196 45 203 50 C246 88 293 110 350 83 Q358 79 359 88 C357 195 366 335 398 426 Q403 434 396 439 C350 464 332 486 328 515 V620 Z',
    left: [[222,151],[214,237],[202,323],[183,409]], right: [[330,190],[351,296],[376,402]]
  },
  8: {
    body: 'M229 620 V515 C225 485 198 469 155 449 Q150 445 155 435 C181 345 193 234 195 139 L193 44 Q193 36 201 40 C268 62 331 99 363 146 Q367 152 364 160 C350 206 370 340 404 444 Q407 451 400 456 C356 476 336 491 331 515 V620 Z',
    left: [[223,157],[213,241],[200,325],[181,409]], right: [[324,183],[344,267],[362,351],[382,435]]
  }
};
// One anchor map drives wires, pegs and surrounding HTML controls. MIDI order stays intact.
export function headstockAnchors(count) {
  return stringMap(count).map(string => {
    const [x, y] = VARIANTS[count][string.side][string.row];
    return { ...string, x, y, nutX: 236 + string.index * 88 / (count - 1) };
  });
}
export function createHeadstock(tuning, onSelect) {
  const svg = svgNode('svg', { viewBox: '0 0 560 620', class: 'tuning-headstock', role: 'group', 'aria-label': `${tuning.stringCount}-string interactive headstock` });
  // Project-drawn crown, bevels and monogram; no traced instrument artwork.
  const anchors = headstockAnchors(tuning.stringCount);
  const { body } = VARIANTS[tuning.stringCount];
  const defs = svgNode('defs', {});
  for (const [id, stops] of [
    ['tuning-finish', [['0%', '#343c3a'], ['34%', '#20262b'], ['70%', '#14191e'], ['100%', '#30383d']]],
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
  face.append(svgNode('path', { d: body, fill: 'none', stroke: '#68716f', 'stroke-width': 1.8, opacity: '.8' }));
  const grain = svgNode('g', { 'clip-path': 'url(#tuning-face-clip)', stroke: '#9ca29b', opacity: '.035', fill: 'none' });
  for (let i = 0; i < 16; i++) grain.append(svgNode('path', { d: `M${174 + i * 15} 45 Q${160 + i * 15} 255 ${180 + i * 15} 620` }));
  face.append(grain);
  // A geometric, open-line GT emblem drawn from simple strokes, not a brand font.
  const brand = svgNode('g', { transform: 'translate(56 40) scale(.8)' });
  brand.append(svgNode('path', { d: 'M277 96 H257 L249 104 V120 H277 V110 H266 M285 96 H311 M298 96 V120', fill: 'none', stroke: '#d2a27c', 'stroke-width': 4, 'stroke-linejoin': 'bevel' }));
  brand.append(svgNode('text', { x: 280, y: 140, 'text-anchor': 'middle', fill: '#b2aaa1', 'font-size': 8, 'font-family': 'sans-serif', 'letter-spacing': 2 }, 'GUITAR TOOLS'));
  face.append(brand);
  // Restrained truss-rod cover sits between the strings above the nut.
  face.append(svgNode('path', { d: 'M269 489 L272 454 Q280 438 288 454 L291 489 Z', fill: '#11171b', stroke: '#4b555b' }));
  face.append(svgNode('path', { d: 'M278 481 H282 M280 479 V483', stroke: '#89918f', 'stroke-width': 1.5 }));
  svg.append(face);
  for (const anchor of anchors) {
    const { x, y, nutX, side, id, index, number } = anchor;
    const group = svgNode('g', { 'data-string': id, class: 'headstock-peg', role: 'button', tabindex: 0 });
    group.append(svgNode('path', { d: `M${nutX} 620 V510 L${x} ${y}`, fill: 'none', class: 'headstock-wire', stroke: '#b2b9b7', 'stroke-width': 2.7 - index * .22 }));
    group.append(svgNode('rect', { x: side === 'left' ? x - 40 : x, y: y - 8, width: 40, height: 16, rx: 3, fill: 'url(#tuning-metal)', stroke: '#58636b' }));
    const buttonX = side === 'left' ? x - 47 : x + 47;
    group.append(svgNode('path', { d: `M${buttonX - 9} ${y - 19} H${buttonX + 8} L${buttonX + 14} ${y - 10} V${y + 11} L${buttonX + 7} ${y + 19} H${buttonX - 9} L${buttonX - 14} ${y + 10} V${y - 10} Z`, fill: 'url(#tuning-metal)', stroke: '#647078', 'stroke-width': 1.5 }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 19, fill: '#141b20', stroke: '#75828a', 'stroke-width': 2, class: 'peg-ring' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 13, fill: 'url(#tuning-metal)' }));
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
