// Birth place -> { name, lat, lon, timeZone }.
//
// 1. Offline gazetteer: GeoNames (cities.json, CC-BY 4.0; ~171k places with
//    state/district names) + country-state-city (~148k, adds more Indian towns).
// 2. Optional online fallback (Google Geocoding) for anything not found.
// Time zone: the COUNTRY decides it where the country has a single zone (India,
// Nepal, Gulf, UK...). Coordinate lookups (tz-lookup) are coarse at borders:
// Moreh, Manipur comes back as Asia/Yangon (+6:30), an hour wrong.
import { createRequire } from 'node:module';
import tzLookup from 'tz-lookup';
import { romanize, skeleton, loose, levenshtein } from './translit.js';

const require = createRequire(import.meta.url);

export const SINGLE_ZONE = {
  IN: 'Asia/Kolkata', NP: 'Asia/Kathmandu', PK: 'Asia/Karachi', BD: 'Asia/Dhaka', LK: 'Asia/Colombo',
  BT: 'Asia/Thimphu', AE: 'Asia/Dubai', SA: 'Asia/Riyadh', QA: 'Asia/Qatar', KW: 'Asia/Kuwait',
  OM: 'Asia/Muscat', BH: 'Asia/Bahrain', SG: 'Asia/Singapore', GB: 'Europe/London', IE: 'Europe/Dublin',
  FR: 'Europe/Paris', DE: 'Europe/Berlin', NL: 'Europe/Amsterdam', IT: 'Europe/Rome', BE: 'Europe/Brussels',
  CH: 'Europe/Zurich', JP: 'Asia/Tokyo', TH: 'Asia/Bangkok', HK: 'Asia/Hong_Kong', MU: 'Indian/Mauritius',
  FJ: 'Pacific/Fiji', ZA: 'Africa/Johannesburg', KE: 'Africa/Nairobi', TZ: 'Africa/Dar_es_Salaam', UG: 'Africa/Kampala',
};

// Common old/alternate names -> the name the gazetteer uses.
export const ALIASES = {
  bombay: 'mumbai', calcutta: 'kolkata', madras: 'chennai', bangalore: 'bengaluru', banaras: 'varanasi',
  benaras: 'varanasi', benares: 'varanasi', kashi: 'varanasi', allahabad: 'prayagraj', gurgaon: 'gurugram',
  poona: 'pune', baroda: 'vadodara', cawnpore: 'kanpur', trivandrum: 'thiruvananthapuram', cochin: 'kochi',
  simla: 'shimla', pondicherry: 'puducherry', gauhati: 'guwahati', mysore: 'mysuru', mangalore: 'mangaluru',
  belgaum: 'belagavi', hubli: 'hubballi', gulbarga: 'kalaburagi', chhapra: 'chapra', delhi: 'new delhi',
  'bokaro steel city': 'bokaro', calicut: 'kozhikode', vizag: 'visakhapatnam', 'new york': 'new york city',
  nyc: 'new york city', dilli: 'new delhi',
};

// Hindi names whose usual English spelling differs from a plain romanization.
const HINDI_ALIASES = {
  'दिल्ली': 'new delhi', 'देहली': 'new delhi', 'नई दिल्ली': 'new delhi', 'मुंबई': 'mumbai', 'बंबई': 'mumbai',
  'लखनऊ': 'lucknow', 'बनारस': 'varanasi', 'काशी': 'varanasi', 'इलाहाबाद': 'prayagraj', 'गुड़गांव': 'gurugram',
  'गुड़गाँव': 'gurugram', 'गुरुग्राम': 'gurugram', 'कलकत्ता': 'kolkata', 'मद्रास': 'chennai', 'बेंगलुरु': 'bengaluru',
  'बैंगलोर': 'bengaluru', 'बंगलौर': 'bengaluru', 'पूना': 'pune', 'चंडीगढ़': 'chandigarh india',
};

// Country words people type -> text that appears in our country/state names.
const HINT_SYNONYMS = {
  uk: 'united kingdom', britain: 'united kingdom', usa: 'united states', us: 'united states',
  america: 'united states', uae: 'united arab emirates', nz: 'new zealand',
  up: 'uttar pradesh', mp: 'madhya pradesh', hp: 'himachal pradesh', ap: 'andhra pradesh', wb: 'west bengal',
  tn: 'tamil nadu', mh: 'maharashtra', br: 'bihar', jh: 'jharkhand', rj: 'rajasthan', gj: 'gujarat',
  ka: 'karnataka', kl: 'kerala', pb: 'punjab', hr: 'haryana', cg: 'chhattisgarh', od: 'odisha',
  orissa: 'odisha', uttaranchal: 'uttarakhand', jk: 'jammu', ts: 'telangana', as: 'assam',
};
const stripMarks = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim();

let INDEX = null; // Map<normName, Place[]>
let SKEL = null; // Map<skeleton, normName[]>

function haversineKm(a, b) {
  const R = 6371; const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r; const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function build() {
  const idx = new Map();
  const add = (p) => {
    const k = norm(p.city);
    if (!k) return;
    let arr = idx.get(k);
    if (!arr) { arr = []; idx.set(k, arr); }
    // Same place from the second dataset: keep one entry, fill gaps.
    const dup = arr.find((q) => q.country === p.country && haversineKm(q, p) < 25);
    // A place listed by both sources is almost always a notable town: that
    // "seen" count is our stand-in for population when ranking same-name places.
    if (dup) { dup.state ||= p.state; dup.district ||= p.district; dup.seen += 1; return; }
    arr.push({ ...p, seen: 1 });
  };

  const cities = require('cities.json/cities.json');
  const admin1 = new Map(require('cities.json/admin1.json').map((a) => [a.code, a.name]));
  const admin2 = new Map(require('cities.json/admin2.json').map((a) => [a.code, a.name]));
  for (const c of cities) {
    add({
      city: c.name, lat: +c.lat, lon: +c.lng, country: c.country,
      state: admin1.get(`${c.country}.${c.admin1}`) || '', district: admin2.get(`${c.country}.${c.admin1}.${c.admin2}`) || '',
      src: 'geonames',
    });
  }
  const { City, State } = require('country-state-city');
  const stateName = new Map(State.getAllStates().map((s) => [`${s.countryCode}.${s.isoCode}`, s.name]));
  for (const c of City.getAllCities()) {
    add({ city: c.name, lat: +c.latitude, lon: +c.longitude, country: c.countryCode,
      state: stateName.get(`${c.countryCode}.${c.stateCode}`) || '', district: '', src: 'csc' });
  }
  return idx;
}

export function timeZoneFor(place) {
  return SINGLE_ZONE[place.country] || tzLookup(place.lat, place.lon);
}

export function displayName(p, { district = false } = {}) {
  const parts = [p.city];
  if (district && p.district && norm(p.district) !== norm(p.city)) parts.push(p.district);
  if (p.state && norm(p.state) !== norm(p.city)) parts.push(p.state);
  parts.push(COUNTRY_NAMES.of(p.country) || p.country);
  return stripMarks(parts.join(', '));
}

function finish(p) {
  return { name: displayName(p), longName: displayName(p, { district: true }), city: stripMarks(p.city),
    state: stripMarks(p.state), district: stripMarks(p.district), country: p.country,
    lat: p.lat, lon: p.lon, timeZone: timeZoneFor(p), source: p.src };
}

/**
 * Look a place up offline.
 * @param {string} query e.g. "Patna", "Aurangabad, Bihar", "London UK"
 * @param {{countryBias?: string}} opts  preferred country when a name is ambiguous
 * @returns {{status:'found'|'ambiguous'|'not_found', place?, options?}}
 */
export function lookupPlace(query, opts = {}) {
  INDEX ||= build();
  const trimmed = String(query).trim();
  // Hindi input: known names first, then romanize (preferring India/Nepal).
  if (/[\u0900-\u097f]/.test(trimmed)) {
    const words = trimmed.split(/[\s,]+/);
    for (let n = Math.min(2, words.length); n >= 1; n--) {
      const alias = HINDI_ALIASES[words.slice(0, n).join(' ')];
      if (alias) return lookupPlace([alias, ...words.slice(n).map(romanize)].join(' '), opts);
    }
    const latin = romanize(trimmed);
    const exact = exactLookup(latin, opts);
    if (exact.status === 'found' && ['IN', 'NP'].includes(exact.place.country)) return exact;
    return fuzzyLookup(latin, { ...opts, homeOnly: true });
  }
  const exact = exactLookup(trimmed, opts);
  if (exact.status !== 'not_found') return exact;
  return fuzzyLookup(trimmed, opts);
}

function buildSkeletons() {
  const m = new Map();
  for (const k of INDEX.keys()) {
    const sk = skeleton(k.split(' ')[0] === k ? k : k);
    if (!sk) continue;
    let arr = m.get(sk); if (!arr) { arr = []; m.set(sk, arr); } arr.push(k);
  }
  return m;
}

// Spelling-tolerant lookup of the city word(s); remaining words stay as hints.
// Score = edit distance, +1 outside the preferred country (so "Dilli" is not Dili, Timor-Leste).
function fuzzyLookup(latinQuery, opts) {
  SKEL ||= buildSkeletons();
  const bias = opts.countryBias || 'IN';
  const words = norm(latinQuery).split(' ').filter(Boolean);
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    const city = words.slice(0, n).join(' ');
    const keys = SKEL.get(skeleton(city)) || [];
    const maxD = Math.max(2, Math.floor(city.length / 4));
    const rest = words.slice(n).join(' ');
    const scored = [];
    for (const k of keys) {
      const d = levenshtein(loose(city), loose(k));
      if (d > maxD) continue;
      const r = exactLookup(`${k} ${rest}`.trim(), opts);
      const places = r.status === 'found' ? [r.place] : r.status === 'ambiguous' ? r.options : [];
      for (const p of places) {
        if (opts.homeOnly && !['IN', 'NP'].includes(p.country)) continue;
        scored.push({ p, s: d + (p.country === bias ? 0 : 1), single: r.status === 'found' });
      }
    }
    if (!scored.length) continue;
    scored.sort((a, b) => a.s - b.s);
    const best = scored.filter((x) => x.s === scored[0].s);
    if (best.length === 1 && best[0].single) return { status: 'found', place: best[0].p };
    return { status: 'ambiguous', options: scored.slice(0, 9).map((x) => x.p) };
  }
  return { status: 'not_found' };
}

function exactLookup(query, { countryBias = 'IN' } = {}) {
  const q = norm(query);
  if (!q) return { status: 'not_found' };
  const words = q.split(' ');
  // Try the longest leading run of words as the city name; the rest are hints.
  for (let n = words.length; n >= 1; n--) {
    let cityKey = words.slice(0, n).join(' ');
    cityKey = ALIASES[cityKey] || cityKey;
    const hits = INDEX.get(cityKey);
    if (!hits || !hits.length) continue;
    const hints = words.slice(n).filter((w) => !['india', 'district', 'dist', 'zila', 'state'].includes(w))
      .map((w) => HINT_SYNONYMS[w] || w);
    const countryHint = words.includes('india') ? 'IN' : null;
    let cands = hits;
    if (countryHint) cands = cands.filter((p) => p.country === countryHint);
    if (hints.length) {
      const hinted = cands.filter((p) => {
        const hay = norm(`${p.state} ${p.district} ${COUNTRY_NAMES.of(p.country)} ${p.country}`);
        return hints.every((h) => hay.includes(h));
      });
      if (hinted.length) cands = hinted;
    }
    if (!cands.length) continue;
    // Same town listed twice (coarse coordinates in one source): keep the GeoNames entry.
    const byLabel = new Map();
    for (const p of cands) {
      const label = displayName(p, { district: true });
      const have = byLabel.get(label);
      if (!have || (have.src !== 'geonames' && p.src === 'geonames')) byLabel.set(label, have ? { ...p, seen: Math.max(p.seen, have.seen) + 1 } : p);
      else if (have) have.seen = Math.max(have.seen, p.seen) + 1;
    }
    cands = [...byLabel.values()];
    if (cands.length === 1) return { status: 'found', place: finish(cands[0]) };
    const ranked = [...cands].sort((a, b) => (b.seen - a.seen)
      || ((b.country === countryBias) - (a.country === countryBias)));
    const maxSeen = ranked[0].seen;
    // Rule 1: exactly one match in the preferred country, and it is as notable
    // as any foreign match (Patna -> Bihar, not Patna, Scotland).
    const home = cands.filter((p) => p.country === countryBias);
    if (!hints.length && home.length === 1 && home[0].seen >= maxSeen) return { status: 'found', place: finish(home[0]) };
    // Rule 2: one clearly notable match, and no same-name place in its own
    // country (Dubai -> UAE; but two Pratapgarhs in India -> ask).
    const top = ranked.filter((p) => p.seen === maxSeen);
    if (maxSeen >= 2 && top.length === 1 && !cands.some((p) => p !== top[0] && p.country === top[0].country)) {
      return { status: 'found', place: finish(top[0]) };
    }
    return { status: 'ambiguous', options: ranked.slice(0, 9).map(finish) };
  }
  return { status: 'not_found' };
}

/** Optional online fallback. Returns the same shape as lookupPlace. */
export async function geocodeGoogle(query, apiKey, { fetchImpl = fetch } = {}) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;
  const r = await fetchImpl(url);
  const j = await r.json();
  if (j.status !== 'OK' || !j.results?.length) return { status: 'not_found' };
  const toPlace = (res) => {
    const comp = (type) => res.address_components.find((c) => c.types.includes(type));
    const p = { city: comp('locality')?.long_name || comp('administrative_area_level_3')?.long_name || res.formatted_address.split(',')[0],
      district: comp('administrative_area_level_2')?.long_name || '', state: comp('administrative_area_level_1')?.long_name || '',
      country: comp('country')?.short_name || '', lat: res.geometry.location.lat, lon: res.geometry.location.lng, src: 'google' };
    return finish(p);
  };
  if (j.results.length === 1) return { status: 'found', place: toPlace(j.results[0]) };
  return { status: 'ambiguous', options: j.results.slice(0, 9).map(toPlace) };
}
