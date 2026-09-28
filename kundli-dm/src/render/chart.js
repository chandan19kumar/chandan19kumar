// North Indian (diamond) chart. House 1 is the top diamond; houses run
// counter-clockwise. Each house shows its rashi number and its grahas.
import { THEME } from './theme.js';
import { text, estimateWidth } from './svg.js';

// Per-house layout, in units of the chart size S.
//  kite: diamond houses 1/4/7/10 — `k` is its centre, `n` the rashi-number spot
//  edge: triangles; `side` is the chart edge they rest on, `along` their centre on it
const HOUSES = [
  { kind: 'kite', k: [0.5, 0.25], n: [0.5, 0.425] }, // 1
  { kind: 'edge', side: 'top', along: 0.25 }, // 2
  { kind: 'edge', side: 'left', along: 0.25 }, // 3
  { kind: 'kite', k: [0.25, 0.5], n: [0.425, 0.5] }, // 4
  { kind: 'edge', side: 'left', along: 0.75 }, // 5
  { kind: 'edge', side: 'bottom', along: 0.25 }, // 6
  { kind: 'kite', k: [0.5, 0.75], n: [0.5, 0.575] }, // 7
  { kind: 'edge', side: 'bottom', along: 0.75 }, // 8
  { kind: 'edge', side: 'right', along: 0.75 }, // 9
  { kind: 'kite', k: [0.75, 0.5], n: [0.575, 0.5] }, // 10
  { kind: 'edge', side: 'right', along: 0.25 }, // 11
  { kind: 'edge', side: 'top', along: 0.75 }, // 12
];
const NUM_DEPTH = 0.195; // how far into a triangle the rashi number sits

function numberSpot(h) {
  if (h.kind === 'kite') return h.n;
  const d = NUM_DEPTH;
  return { top: [h.along, d], bottom: [h.along, 1 - d], left: [d, h.along], right: [1 - d, h.along] }[h.side];
}

// Lay out `items` for one house. Returns [{x, y, text, color, size}] in px (baseline y).
function placeItems(h, items, S, fs) {
  if (!items.length) return [];
  const n = items.length;
  let size = fs;
  let cols = 1;
  if (h.kind === 'kite') { if (n > 5) cols = 2; if (n > 8) size = Math.round(fs * 0.85); }
  else if (h.side === 'top' || h.side === 'bottom') { if (n > 3) { cols = 2; size = Math.round(fs * 0.9); } if (n > 6) size = Math.round(fs * 0.78); }
  else if (n > 4) size = Math.round(fs * (n > 5 ? 0.72 : 0.82));
  const lh = size * 1.2;
  const rows = Math.ceil(n / cols);
  const hgt = rows * lh;
  const wmax = Math.max(...items.map((it) => estimateWidth(it.text, size)));
  const colGap = size * 0.5;
  const blockW = cols * wmax + (cols - 1) * colGap;

  let cx; let cy; // block centre, px
  if (h.kind === 'kite') { cx = h.k[0] * S; cy = h.k[1] * S; }
  else if (h.side === 'top' || h.side === 'bottom') {
    const depth = Math.max(0.085 * S, 0.028 * S + hgt / 2);
    cx = h.along * S; cy = h.side === 'top' ? depth : S - depth;
  } else {
    const depth = 0.022 * S + blockW / 2;
    cx = h.side === 'left' ? depth : S - depth; cy = h.along * S;
  }
  return items.map((it, i) => {
    const col = cols === 2 ? i % 2 : 0;
    const row = cols === 2 ? Math.floor(i / 2) : i;
    const x = cx - blockW / 2 + col * (wmax + colGap) + wmax / 2;
    const y = cy - hgt / 2 + row * lh + lh / 2 + size * 0.36;
    return { x, y, size, text: it.text, color: it.color };
  });
}

/**
 * @param {number} S size in px
 * @param {{sign:number, items:{text:string, color?:string}[]}[]} houses 12 entries, index 0 = house 1
 */
export function northIndianChart(S, houses, { fontSize } = {}) {
  const fs = fontSize || Math.round(S * 0.034);
  const numSize = Math.round(fs * 0.8);
  const lw = Math.max(1.5, S / 420);
  let out = '';
  out += `<rect x="0" y="0" width="${S}" height="${S}" fill="${THEME.panel}"/>`;
  // Tint the lagna house.
  out += `<polygon points="${S / 2},0 ${0.75 * S},${0.25 * S} ${S / 2},${S / 2} ${0.25 * S},${0.25 * S}" fill="${THEME.goldLight}" opacity="0.3"/>`;
  out += `<g stroke="${THEME.maroon}" stroke-width="${lw}" fill="none" stroke-linejoin="round">`;
  out += `<line x1="0" y1="0" x2="${S}" y2="${S}"/><line x1="${S}" y1="0" x2="0" y2="${S}"/>`;
  out += `<polygon points="${S / 2},0 ${S},${S / 2} ${S / 2},${S} 0,${S / 2}"/>`;
  out += `<rect x="0" y="0" width="${S}" height="${S}" stroke-width="${lw * 1.8}"/>`;
  out += '</g>';

  HOUSES.forEach((h, i) => {
    const [nx, ny] = numberSpot(h);
    out += text(String(houses[i].sign + 1), +(nx * S).toFixed(1), +(ny * S + numSize * 0.36).toFixed(1), { size: numSize, weight: 600, fill: THEME.gold, anchor: 'middle' });
    for (const p of placeItems(h, houses[i].items, S, fs)) {
      out += text(p.text, +p.x.toFixed(1), +p.y.toFixed(1), { size: p.size, weight: 600, fill: p.color || THEME.ink, anchor: 'middle' });
    }
  });
  return out;
}
