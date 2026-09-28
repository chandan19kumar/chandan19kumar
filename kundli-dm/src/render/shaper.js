// Text -> glyph outlines via HarfBuzz (the shaper used by Chrome/Android).
// resvg's built-in shaping zero-widths the Devanagari AA-matra (ा), turning
// "राशि" into "रशि"; so for PNG output we shape here and emit <path>s.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as hb from 'harfbuzzjs';
import { FONT } from './theme.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');
const FILES = {
  [`${FONT.sans}|400`]: 'NotoSansDevanagari_400Regular.ttf',
  [`${FONT.sans}|600`]: 'NotoSansDevanagari_600SemiBold.ttf',
  [`${FONT.sans}|700`]: 'NotoSansDevanagari_700Bold.ttf',
  [`${FONT.serifDeva}|600`]: 'NotoSerifDevanagari_600SemiBold.ttf',
  [`${FONT.display}|600`]: 'CormorantGaramond_600SemiBold.ttf',
  [`${FONT.display}|700`]: 'CormorantGaramond_700Bold.ttf',
};

const fonts = new Map();
function fontFor(family, weight) {
  const w = weight >= 650 ? 700 : weight >= 500 ? 600 : 400;
  const key = FILES[`${family}|${w}`] ? `${family}|${w}` : FILES[`${family}|600`] ? `${family}|600` : `${FONT.sans}|${w}`;
  let f = fonts.get(key);
  if (!f) {
    const buf = fs.readFileSync(path.join(dir, FILES[key]));
    const face = new hb.Face(new hb.Blob(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
    f = { key, font: new hb.Font(face), upem: face.upem, glyphs: new Map(), shapes: new Map() };
    fonts.set(key, f);
  }
  return f;
}

function shape(f, str) {
  let s = f.shapes.get(str);
  if (!s) {
    const b = new hb.Buffer();
    b.addText(str); b.guessSegmentProperties();
    hb.shape(f.font, b);
    const infos = b.getGlyphInfos(); const pos = b.getGlyphPositions();
    s = { glyphs: infos.map((g, i) => ({ gid: g.codepoint, cluster: g.cluster, ...pos[i] })), advance: pos.reduce((a, p) => a + p.xAdvance, 0) };
    f.shapes.set(str, s);
  }
  return s;
}

function glyphPath(f, gid) {
  let d = f.glyphs.get(gid);
  if (d === undefined) { d = f.font.glyphToPath(gid); f.glyphs.set(gid, d); }
  return d;
}

/** Width in px of `str` at `size`. */
export function measure(str, size, family = FONT.sans, weight = 400, letterSpacing = 0) {
  const f = fontFor(family, weight);
  const s = shape(f, String(str));
  return (s.advance * size) / f.upem + letterSpacing * Math.max(0, s.glyphs.length - 1);
}

/** SVG group drawing `str` with its baseline at (x, y). */
export function textAsPaths(str, x, y, { size, weight = 400, family = FONT.sans, fill, anchor = 'start', letterSpacing = 0, opacity }) {
  const f = fontFor(family, weight);
  const s = shape(f, String(str));
  const k = size / f.upem;
  const lsU = letterSpacing / k;
  const total = s.advance + lsU * Math.max(0, s.glyphs.length - 1);
  const x0 = anchor === 'middle' ? x - (total * k) / 2 : anchor === 'end' ? x - total * k : x;
  let pen = 0; let paths = '';
  for (const g of s.glyphs) {
    const d = glyphPath(f, g.gid);
    if (d) paths += `<path transform="translate(${(pen + g.xOffset).toFixed(1)},${g.yOffset.toFixed(1)})" d="${d}"/>`;
    pen += g.xAdvance + lsU;
  }
  const op = opacity !== undefined ? ` opacity="${opacity}"` : '';
  return `<g transform="translate(${x0.toFixed(2)},${y.toFixed(2)}) scale(${k.toFixed(6)},${(-k).toFixed(6)})" fill="${fill}"${op}>${paths}</g>`;
}
