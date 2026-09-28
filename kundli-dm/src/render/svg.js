// SVG helpers. Text is emitted either as HarfBuzz-shaped outlines (PNG cards)
// or as plain <text> (HTML report, where the browser shapes it).
import { FONT } from './theme.js';
import { measure, textAsPaths } from './shaper.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEVA = /[ऀ-ॿ]/;
export const hasDeva = (s) => DEVA.test(s);

let mode = 'paths';
/** Run `fn` with text emitted as 'paths' (default) or 'text'. */
export function withTextMode(m, fn) {
  const prev = mode; mode = m;
  try { return fn(); } finally { mode = prev; }
}

// Cormorant has no Devanagari; a Hindi name falls back to Noto Serif Devanagari.
const resolveFamily = (str, family) => (family === FONT.display && hasDeva(str) ? FONT.serifDeva : family);

export function estimateWidth(str, size, family = FONT.sans, weight = 600) {
  return measure(str, size, resolveFamily(str, family), weight);
}

export function fitSize(str, maxWidth, size, min = 12, family = FONT.sans, weight = 400, ls = 0) {
  let s = size;
  while (s > min && measure(str, s, family, weight, ls) > maxWidth) s -= 1;
  return s;
}

export function text(str, x, y, { size = 24, weight = 400, fill = '#000', anchor = 'start', family = FONT.sans, maxWidth, letterSpacing, opacity } = {}) {
  const fam = resolveFamily(str, family);
  // Letter-spacing splits Devanagari clusters visually: Latin only.
  const ls = letterSpacing && !hasDeva(str) ? letterSpacing : 0;
  const sz = maxWidth ? fitSize(str, maxWidth, size, 12, fam, weight, ls) : size;
  if (mode === 'paths') return textAsPaths(str, x, y, { size: sz, weight, family: fam, fill, anchor, letterSpacing: ls, opacity });
  const lsAttr = ls ? ` letter-spacing="${ls}"` : '';
  const op = opacity !== undefined ? ` opacity="${opacity}"` : '';
  return `<text x="${x}" y="${y}" font-family="${fam}, ${FONT.sans}" font-size="${sz}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${lsAttr}${op}>${esc(str)}</text>`;
}

export const rect = (x, y, w, h, { fill = 'none', stroke = 'none', sw = 1, rx = 0, opacity } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;

export const line = (x1, y1, x2, y2, stroke, sw = 1) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;
