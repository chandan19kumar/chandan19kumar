import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKundli } from '../src/kundli/index.js';
import { allCards } from '../src/render/cards.js';
import { svgToPng } from '../src/render/png.js';
import { measure } from '../src/render/shaper.js';
import { withTextMode } from '../src/render/svg.js';

const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

test('HarfBuzz keeps the AA-matra: "राशि" is wider than "रशि"', () => {
  assert.ok(measure('राशि', 20) > measure('रशि', 20) + 3);
});

for (const [label, input] of [
  ['India', { name: 'Rahul Kumar', birth: { year: 1995, month: 3, day: 12, hour: 6, minute: 45 }, place: { name: 'Patna, Bihar, India', lat: 25.5941, lon: 85.1356, timeZone: 'Asia/Kolkata' } }],
  ['Hindi name, crowded house', { name: 'प्रियंका शर्मा', birth: { year: 1962, month: 2, day: 4, hour: 17, minute: 30 }, place: { name: 'New Delhi, Delhi, India', lat: 28.6139, lon: 77.209, timeZone: 'Asia/Kolkata' } }],
  ['Arctic, long place name', { name: 'A Very Long Name That Should Shrink To Fit The Card Width', birth: { year: 1988, month: 12, day: 21, hour: 12, minute: 0 }, place: { name: 'Tromsø, Troms og Finnmark, Norway', lat: 69.6492, lon: 18.9553, timeZone: 'Europe/Oslo' } }],
]) {
  test(`renders 4 PNG cards at 1080x1350 — ${label}`, () => {
    const k = buildKundli(input, { now: new Date('2026-09-28T06:00:00Z') });
    const svgs = allCards(k, { reportUrl: 'https://kaylatalk.com/k/abc' });
    assert.equal(svgs.length, 4);
    for (const svg of svgs) {
      assert.ok(!svg.includes('<text'), 'PNG cards must use shaped outlines, not <text>');
      const png = svgToPng(svg);
      assert.deepEqual(pngSize(png), { w: 1080, h: 1350 });
    }
  });
}

test('text mode emits <text> for the browser report', () => {
  const k = buildKundli({ name: 'x', birth: { year: 2000, month: 1, day: 1, hour: 0, minute: 0 }, place: { name: 'x', lat: 0, lon: 0, timeZone: 'UTC' } });
  const svg = withTextMode('text', () => allCards(k)[0]);
  assert.ok(svg.includes('<text'));
});
