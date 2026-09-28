import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupPlace, timeZoneFor } from '../src/dm/places.js';
import { romanize } from '../src/dm/translit.js';

const found = (q) => { const r = lookupPlace(q); assert.equal(r.status, 'found', `${q}: ${JSON.stringify(r).slice(0, 200)}`); return r.place; };
const ambiguous = (q) => { const r = lookupPlace(q); assert.equal(r.status, 'ambiguous', q); return r.options; };

test('major Indian cities, old names and aliases', () => {
  assert.match(found('Patna').name, /Bihar/);
  assert.equal(found('Bombay').city, 'Mumbai');
  assert.equal(found('Banaras').city, 'Varanasi');
  assert.equal(found('Allahabad').city, 'Prayagraj');
  assert.equal(found('Gurgaon').city, 'Gurugram');
  assert.equal(found('Delhi').city, 'New Delhi');
});

test('state hints and short forms disambiguate', () => {
  assert.match(found('Aurangabad Bihar').name, /Bihar/);
  assert.match(found('Aurangabad, Maharashtra').name, /Maharashtra/);
  assert.match(found('Hajipur Bihar').name, /Bihar/);
  assert.equal(ambiguous('Aurangabad').length, 2);
});

test('abroad: country words, and notable city beats same-name villages', () => {
  assert.equal(found('London UK').timeZone, 'Europe/London');
  assert.equal(found('New York').timeZone, 'America/New_York');
  assert.equal(found('Dubai').country, 'AE');
  assert.ok(ambiguous('London').some((o) => o.country === 'GB'));
});

test('Hindi script input', () => {
  assert.equal(romanize('पटना'), 'patna');
  assert.equal(romanize('गोरखपुर'), 'gorakhpur');
  assert.equal(romanize('मुंबई'), 'mumbai');
  for (const [hi, en] of [['पटना', 'Patna'], ['वाराणसी', 'Varanasi'], ['मुज़फ़्फ़रपुर', 'Muzaffarpur'], ['दिल्ली', 'New Delhi'], ['लखनऊ', 'Lucknow'], ['जयपुर', 'Jaipur'], ['बेगूसराय', 'Begusarai']]) {
    assert.equal(found(hi).city, en, hi);
  }
});

test('typos', () => {
  assert.equal(found('Muzzafarpur').city, 'Muzaffarpur');
  assert.equal(found('Varansi').city, 'Varanasi');
  assert.equal(found('Bhagalpoor').city, 'Bhagalpur');
});

test('border towns take the country zone, not the coordinate guess', () => {
  // tz-lookup alone says Asia/Yangon (+6:30) for Moreh, Manipur.
  assert.equal(found('Moreh').timeZone, 'Asia/Kolkata');
  assert.equal(found('Raxaul').timeZone, 'Asia/Kolkata');
  assert.equal(found('Kathmandu').timeZone, 'Asia/Kathmandu');
  assert.equal(timeZoneFor({ country: 'US', lat: 34.05, lon: -118.24 }), 'America/Los_Angeles');
});
