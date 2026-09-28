import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from 'astronomy-engine';
import { NAKSHATRAS, DASHA_ORDER, DASHA_YEARS, SIGNS, nadiOf } from '../src/astro/constants.js';
import { dateFromJd } from '../src/astro/time.js';
import { vimshottari } from '../src/kundli/dasha.js';
import { buildKundli, navamsaSign, dignity } from '../src/kundli/index.js';

const ref = JSON.parse(fs.readFileSync(new URL('./fixtures/swisseph-reference.json', import.meta.url)));

test('sunrise within 30 s of Swiss Ephemeris (60 checks, 12 cities)', () => {
  let worst = 0;
  for (const s of ref.sunrise) {
    const r = A.SearchRiseSet(A.Body.Sun, new A.Observer(s.lat, s.lon, 0), +1, dateFromJd(s.searchFromJdUt), 2);
    const err = Math.abs(r.date.getTime() - dateFromJd(s.riseJdUt).getTime()) / 1000;
    worst = Math.max(worst, err);
  }
  assert.ok(worst < 30, `worst ${worst.toFixed(1)} s`);
});

test('nakshatra table: 27 entries, Vimshottari lords cycle 3 times, 108 unique syllables', () => {
  assert.equal(NAKSHATRAS.length, 27);
  NAKSHATRAS.forEach((n, i) => assert.equal(n.lord, DASHA_ORDER[i % 9], n.en));
  const syl = NAKSHATRAS.flatMap((n) => n.syllables);
  assert.equal(syl.length, 108);
  assert.equal(new Set(syl).size, 108);
});

test('gana 9/9/9 and nadi 9/9/9', () => {
  const count = (arr) => arr.reduce((m, x) => ({ ...m, [x]: (m[x] || 0) + 1 }), {});
  assert.deepEqual(count(NAKSHATRAS.map((n) => n.gana)), { Deva: 9, Manushya: 9, Rakshasa: 9 });
  assert.deepEqual(count(NAKSHATRAS.map((_, i) => nadiOf(i))), { Adi: 9, Madhya: 9, Antya: 9 });
  // Spot checks against the classical lists.
  assert.equal(nadiOf(0), 'Adi'); assert.equal(nadiOf(26), 'Antya'); assert.equal(nadiOf(13), 'Madhya');
});

test('sign lords and elements', () => {
  assert.deepEqual(SIGNS.map((s) => s.lord), ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']);
  assert.deepEqual(SIGNS.map((s) => s.tatva).slice(0, 4), ['Fire', 'Earth', 'Air', 'Water']);
});

test('navamsa follows the classical movable / fixed / dual rule', () => {
  for (let sign = 0; sign < 12; sign++) {
    const startOffset = [0, 8, 4][sign % 3]; // movable: same sign, fixed: 9th, dual: 5th
    for (let part = 0; part < 9; part++) {
      const lon = sign * 30 + part * (30 / 9) + 0.5;
      assert.equal(navamsaSign(lon), (sign + startOffset + part) % 12, `sign ${sign} part ${part}`);
    }
  }
});

test('dignity edge cases (incl. Moon moolatrikona in Taurus from 3°)', () => {
  assert.equal(dignity('Moon', 30 + 2.9), 'Exalted');
  assert.equal(dignity('Moon', 30 + 3.1), 'Moolatrikona');
  assert.equal(dignity('Mercury', 150 + 14), 'Exalted');
  assert.equal(dignity('Mercury', 150 + 17), 'Moolatrikona');
  assert.equal(dignity('Mercury', 150 + 25), 'Own');
  assert.equal(dignity('Sun', 120 + 25), 'Own');
  assert.equal(dignity('Saturn', 5), 'Debilitated');
  assert.equal(dignity('Rahu', 5), null);
});

test('vimshottari: 120 years, contiguous, antardashas fill each mahadasha', () => {
  const birth = new Date('1995-03-12T01:15:00Z');
  const d = vimshottari(83.0, birth);
  const total = d.mahadashas.reduce((s, m) => s + m.years, 0);
  assert.equal(total, 120);
  for (let i = 1; i < 9; i++) assert.equal(d.mahadashas[i].start.getTime(), d.mahadashas[i - 1].end.getTime());
  for (const m of d.mahadashas) {
    assert.equal(m.antardashas[0].lord, m.lord);
    assert.ok(Math.abs(m.antardashas[8].end - m.end) < 5);
  }
  assert.ok(d.mahadashas[0].start < birth && birth < d.mahadashas[0].end);
  // 83° = Punarvasu (lord Jupiter), 3°00' into its 13°20' span.
  assert.equal(d.firstLord, 'Jupiter');
  assert.ok(Math.abs(d.balanceYears - (1 - 3 / (40 / 3)) * DASHA_YEARS.Jupiter) < 1e-9);
});

test('full kundli: Patna 12 Mar 1995 06:45 — hand-checked facts', () => {
  const k = buildKundli({ name: 'Test', birth: { year: 1995, month: 3, day: 12, hour: 6, minute: 45 },
    place: { name: 'Patna', lat: 25.5941, lon: 85.1356, timeZone: 'Asia/Kolkata' } }, { now: new Date('2026-09-28T06:00:00Z') });
  assert.equal(k.birth.utc, '1995-03-12T01:15:00.000Z');
  assert.equal(k.panchang.vaar.name, 'Ravivar'); // 12 Mar 1995 was a Sunday, born after sunrise
  assert.equal(k.panchang.tithi.paksha, 'Shukla'); // full moon was 17 Mar 1995
  const P = Object.fromEntries(k.planets.map((p) => [p.name, p]));
  assert.equal(P.Sun.sign, 10); // Kumbha, before the 14 Mar Meena sankranti
  assert.equal(P.Mars.sign, 3); assert.equal(P.Mars.retrograde, true); assert.equal(P.Mars.dignity, 'Debilitated');
  assert.equal(P.Saturn.dignity, 'Own'); assert.equal(P.Saturn.combust, true);
  assert.equal(k.currentDasha.mahadasha, 'Mercury');
});

test('before-sunrise birth takes the previous vaar', () => {
  const k = buildKundli({ name: 'x', birth: { year: 1995, month: 3, day: 12, hour: 4, minute: 30 },
    place: { name: 'Patna', lat: 25.5941, lon: 85.1356, timeZone: 'Asia/Kolkata' } });
  assert.equal(k.panchang.vaar.name, 'Shanivar');
  assert.equal(k.panchang.vaar.beforeSunrise, true);
});
