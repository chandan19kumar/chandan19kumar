// node scripts/demo.js  -> writes out/card-1..4.png for a sample birth
import fs from 'node:fs';
import { buildKundli } from '../src/kundli/index.js';
import { allCards } from '../src/render/cards.js';
import { svgToPng } from '../src/render/png.js';

const k = buildKundli({
  name: process.argv[2] || 'Rahul Kumar',
  birth: { year: 1995, month: 3, day: 12, hour: 6, minute: 45 },
  place: { name: 'Patna, Bihar, India', lat: 25.5941, lon: 85.1356, timeZone: 'Asia/Kolkata' },
}, { now: new Date('2026-09-28T06:00:00Z') });
fs.mkdirSync('out', { recursive: true });
const t = Date.now();
allCards(k, { reportUrl: 'https://kaylatalk.com/k/7Qm2xR9a' }).forEach((svg, i) => {
  fs.writeFileSync(`out/card-${i + 1}.svg`, svg);
  fs.writeFileSync(`out/card-${i + 1}.png`, svgToPng(svg));
});
console.log('rendered 4 cards in', Date.now() - t, 'ms');
