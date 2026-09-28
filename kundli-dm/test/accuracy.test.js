// Every planet, both nodes, the ayanamsa and the ascendant, for 500 births
// (1900-2050, 18 places incl. Arctic/Antarctic latitudes), against Swiss
// Ephemeris 2.10 — the reference ephemeris fitted to NASA JPL DE431.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { siderealPositions } from '../src/astro/positions.js';
import { dateFromJd } from '../src/astro/time.js';

const ref = JSON.parse(fs.readFileSync(new URL('./fixtures/swisseph-reference.json', import.meta.url)));
const arcsec = (a, b) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return Math.abs(d) * 3600; };

// Tolerances in arcseconds. 60" = 1 arc-minute. A nakshatra pada is 12000".
export const TOLERANCE = { Sun: 5, Moon: 20, Mercury: 20, Venus: 30, Mars: 20, Jupiter: 20, Saturn: 20, Rahu: 1, TrueRahu: 30, Ascendant: 10, Ayanamsa: 1 };

function run() {
  const worst = {};
  const bump = (k, v, c) => { if (!worst[k] || v > worst[k].v) worst[k] = { v, place: c.place, jd: c.jdUt }; };
  for (const c of ref.cases) {
    const utc = dateFromJd(c.jdUt);
    const m = siderealPositions(utc, { lat: c.lat, lon: c.lon }, { node: 'mean' });
    const t = siderealPositions(utc, { lat: c.lat, lon: c.lon }, { node: 'true' });
    bump('Ayanamsa', arcsec(m.ayanamsa, c.ayanamsaTrue), c);
    for (const p of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      bump(p, arcsec(m.grahas[p].longitude, c.bodies[p].sid), c);
      bump(p + 'Speed', Math.abs(m.grahas[p].speed - c.bodies[p].speed) * 3600, c);
    }
    bump('Rahu', arcsec(m.grahas.Rahu.longitude, c.bodies.MeanNode.sid), c);
    bump('TrueRahu', arcsec(t.grahas.Rahu.longitude, c.bodies.TrueNode.sid), c);
    bump('Ascendant', arcsec(m.ascendant, c.ascendantSid), c);
  }
  return worst;
}

const worst = run();

test('report: worst error per quantity (arcseconds)', () => {
  const rows = Object.entries(worst).map(([k, w]) => `${k.padEnd(14)} ${w.v.toFixed(2).padStart(8)}"  (${w.place})`);
  console.log('\n  Worst-case deviation from Swiss Ephemeris over', ref.cases.length, 'births:\n  ' + rows.join('\n  '));
});

for (const [k, tol] of Object.entries(TOLERANCE)) {
  test(`${k} within ${tol}" of Swiss Ephemeris in all ${ref.cases.length} births`, () => {
    assert.ok(worst[k].v <= tol, `${k}: worst ${worst[k].v.toFixed(2)}" at ${worst[k].place} jd ${worst[k].jd}`);
  });
}

test('retrograde flag agrees with Swiss Ephemeris everywhere', () => {
  for (const c of ref.cases) {
    const m = siderealPositions(dateFromJd(c.jdUt), { lat: c.lat, lon: c.lon });
    for (const p of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const sw = c.bodies[p].speed;
      if (Math.abs(sw) < 0.002) continue; // stationary: sign of a near-zero speed is not meaningful
      assert.equal(m.grahas[p].speed < 0, sw < 0, `${p} at ${c.place} jd ${c.jdUt}`);
    }
  }
});
