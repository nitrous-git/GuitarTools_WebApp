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
  // Original asymmetric shoulder and curved crown, independent of branded instruments.
  const defs = svgNode('defs', {});
  const wood = svgNode('linearGradient', { id: 'tuning-wood', x2: '1', y2: '1' });
  for (const [offset, color] of [['0%', '#3b3029'], ['55%', '#201e1c'], ['100%', '#302820']]) wood.append(svgNode('stop', { offset, 'stop-color': color }));
  const metal = svgNode('linearGradient', { id: 'tuning-metal' });
  for (const [offset, color] of [['0%', '#d6dddc'], ['45%', '#69747c'], ['100%', '#b4bfbe']]) metal.append(svgNode('stop', { offset, 'stop-color': color }));
  defs.append(wood, metal); svg.append(defs);
  svg.append(svgNode('path', { d: 'M234 620 L234 518 Q230 489 200 473 Q158 453 161 407 L169 159 Q171 114 202 80 Q230 46 259 55 Q278 67 299 51 Q325 37 350 79 Q389 128 391 172 L399 407 Q403 453 362 478 Q333 497 326 518 L326 620 Z', fill: 'url(#tuning-wood)', stroke: '#c58c58', 'stroke-width': 4 }));
  for (let i = 0; i < 7; i++) svg.append(svgNode('path', { d: `M${203 + i * 24} 116 Q${190 + i * 25} 270 ${210 + i * 21} 454`, fill: 'none', stroke: '#786047', opacity: '.18' }));
  svg.append(svgNode('text', { x: 280, y: 115, 'text-anchor': 'middle', fill: '#e0ad7d', 'font-size': 27, 'font-family': 'Georgia, serif', 'font-style': 'italic' }, 'GT'));
  svg.append(svgNode('text', { x: 280, y: 136, 'text-anchor': 'middle', fill: '#b9a38d', 'font-size': 8, 'letter-spacing': 3 }, 'GUITAR TOOLS'));
  for (const anchor of headstockAnchors(tuning.stringCount)) {
    const { x, y, nutX, side, id, index, number } = anchor;
    const group = svgNode('g', { 'data-string': id, class: 'headstock-peg', role: 'button', tabindex: 0 });
    group.append(svgNode('path', { d: `M${nutX} 620 V510 L${x} ${y}`, fill: 'none', class: 'headstock-wire', stroke: '#9aa7ad', 'stroke-width': 2.7 - index * .22 }));
    group.append(svgNode('rect', { x: side === 'left' ? x - 55 : x, y: y - 8, width: 55, height: 16, rx: 4, fill: 'url(#tuning-metal)' }));
    group.append(svgNode('rect', { x: side === 'left' ? x - 71 : x + 48, y: y - 18, width: 23, height: 36, rx: 9, fill: 'url(#tuning-metal)', stroke: '#b5bfbe' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 22, fill: '#1d252b', stroke: '#aeb9be', 'stroke-width': 3, class: 'peg-ring' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 15, fill: 'url(#tuning-metal)' }));
    group.append(svgNode('circle', { cx: x, cy: y, r: 5, fill: '#39424a', stroke: '#dce1dc' }));
    group.setAttribute('aria-label', `Edit string ${number}, ${noteLabel(tuning.notesLowToHigh[index])}`);
    group.addEventListener('click', () => onSelect(id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); }
    });
    svg.append(group);
  }
  svg.append(svgNode('rect', { x: 233, y: 506, width: 94, height: 8, fill: '#d3c9af', 'pointer-events': 'none' }));
  return svg;
}
