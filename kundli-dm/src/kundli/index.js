// buildKundli(): birth data in, complete Vedic chart out (plain JSON-able object).
import {
  SIGNS, NAKSHATRAS, PLANETS, DIGNITY, EXALT_UPTO, RELATIONS, COMBUST_ORB, nadiOf,
} from '../astro/constants.js';
import { siderealPositions, norm360 } from '../astro/positions.js';
import { localToUtc } from '../astro/time.js';
import { vimshottari, dashaAt } from './dasha.js';
import { panchang } from './panchang.js';

const NAK = 360 / 27;
const PADA = NAK / 4;

export const DEFAULT_OPTIONS = {
  node: 'mean', // 'mean' | 'true' — must match what the website uses
  dashaYearDays: 365.25,
  manglikHouses: [1, 2, 4, 7, 8, 12],
};

export function signOf(lon) { return Math.floor(norm360(lon) / 30); }
export function navamsaSign(lon) { return Math.floor(norm360(lon) / (30 / 9)) % 12; }

export function nakshatraOf(lon) {
  const l = norm360(lon);
  const i = Math.floor(l / NAK);
  return { index: i, pada: Math.floor((l - i * NAK) / PADA) + 1, ...NAKSHATRAS[i] };
}

export function dignity(planet, lon) {
  const d = DIGNITY[planet];
  if (!d) return null; // Rahu/Ketu: no classical consensus, not labelled
  const s = signOf(lon);
  const deg = norm360(lon) - s * 30;
  if (s === d.exalt && (EXALT_UPTO[planet] === undefined || deg < EXALT_UPTO[planet])) return 'Exalted';
  if (s === d.debil) return 'Debilitated';
  if (s === d.mt.sign && deg >= d.mt.from && deg < d.mt.to) return 'Moolatrikona';
  if (d.own.includes(s)) return 'Own';
  const lord = SIGNS[s].lord;
  if (RELATIONS[planet].friends.includes(lord)) return 'Friend';
  if (RELATIONS[planet].enemies.includes(lord)) return 'Enemy';
  return 'Neutral';
}

// Vashya of the Moon sign. Sagittarius and Capricorn change nature at 15°.
function vashyaOf(lon) {
  const s = signOf(lon); const deg = norm360(lon) - s * 30;
  const table = ['Chatushpad', 'Chatushpad', 'Manav', 'Jalchar', 'Vanchar', 'Manav', 'Manav', 'Keet',
    deg < 15 ? 'Manav' : 'Chatushpad', deg < 15 ? 'Chatushpad' : 'Jalchar', 'Manav', 'Jalchar'];
  return table[s];
}

const KAAL_SARP_NAMES = ['Anant', 'Kulik', 'Vasuki', 'Shankhpal', 'Padma', 'Mahapadma', 'Takshak',
  'Karkotak', 'Shankhachood', 'Ghatak', 'Vishdhar', 'Sheshnag'];

function kaalSarp(grahas, houseOf) {
  const r = grahas.Rahu.longitude;
  const seven = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map((p) => norm360(grahas[p].longitude - r));
  const allOneSide = seven.every((d) => d > 0 && d < 180) || seven.every((d) => d > 180 && d < 360);
  if (!allOneSide) return { present: false };
  const house = houseOf(r);
  return { present: true, type: KAAL_SARP_NAMES[house - 1], rahuHouse: house };
}

/**
 * @param {object} input
 *   name: string
 *   birth: { year, month, day, hour, minute, second? }   local wall-clock time
 *   place: { name, lat, lon, timeZone }                  IANA zone, e.g. 'Asia/Kolkata'
 * @param {object} [opts] DEFAULT_OPTIONS overrides, plus `now` (Date) for current dasha/transits
 */
export function buildKundli(input, opts = {}) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const now = o.now || new Date();
  const { utc, offsetMinutes, status: timeStatus } = localToUtc(input.birth, input.place.timeZone);
  const pos = siderealPositions(utc, input.place, { node: o.node });
  const g = pos.grahas;

  const lagnaSign = signOf(pos.ascendant);
  const houseOf = (lon) => ((signOf(lon) - lagnaSign + 12) % 12) + 1;
  const moonSign = signOf(g.Moon.longitude);

  const planets = PLANETS.map((name) => {
    const { longitude, speed } = g[name];
    const sign = signOf(longitude);
    const nak = nakshatraOf(longitude);
    const node = name === 'Rahu' || name === 'Ketu';
    let combust = false;
    if (COMBUST_ORB[name]) {
      const sep = Math.abs(((longitude - g.Sun.longitude + 540) % 360) - 180);
      combust = sep <= COMBUST_ORB[name][speed < 0 ? 1 : 0];
    }
    return {
      name,
      longitude,
      sign,
      degreeInSign: longitude - sign * 30,
      nakshatra: nak.index, nakshatraPada: nak.pada, nakshatraLord: nak.lord,
      house: houseOf(longitude),
      houseFromMoon: ((sign - moonSign + 12) % 12) + 1,
      retrograde: node ? true : speed < 0,
      combust,
      dignity: dignity(name, longitude),
      navamsa: navamsaSign(longitude),
      speed,
    };
  });
  const P = Object.fromEntries(planets.map((p) => [p.name, p]));

  const lagnaNak = nakshatraOf(pos.ascendant);
  const moonNak = nakshatraOf(g.Moon.longitude);
  const dasha = vimshottari(g.Moon.longitude, utc, { yearDays: o.dashaYearDays });
  const current = dashaAt(dasha, now);
  const pan = panchang(g.Sun.longitude, g.Moon.longitude, utc, input.birth, input.place);

  // Transit Saturn today for Sade Sati (12th, 1st, 2nd from natal Moon sign).
  const satNow = signOf(siderealPositions(now, input.place, { node: o.node }).grahas.Saturn.longitude);
  const fromMoon = ((satNow - moonSign + 12) % 12) + 1;
  const sadeSati = { saturnSignNow: satNow, running: [12, 1, 2].includes(fromMoon), phase: { 12: 1, 1: 2, 2: 3 }[fromMoon] || null,
    dhaiya: [4, 8].includes(fromMoon) };

  const kendra = [1, 4, 7, 10];
  const yogas = [];
  if (kendra.includes(((P.Jupiter.sign - moonSign + 12) % 12) + 1)) yogas.push('Gajakesari');
  if (P.Sun.sign === P.Mercury.sign) yogas.push('Budhaditya');
  if (P.Moon.sign === P.Mars.sign) yogas.push('Chandra-Mangal');
  if (P.Jupiter.sign === P.Rahu.sign) yogas.push('Guru-Chandal');
  const mahapurusha = { Mars: 'Ruchaka', Mercury: 'Bhadra', Jupiter: 'Hamsa', Venus: 'Malavya', Saturn: 'Sasa' };
  for (const [pl, yoga] of Object.entries(mahapurusha)) {
    const p = P[pl];
    if (kendra.includes(p.house) && ['Exalted', 'Own', 'Moolatrikona'].includes(p.dignity)) yogas.push(yoga);
  }

  const mars = P.Mars;
  const manglik = {
    fromLagna: o.manglikHouses.includes(mars.house),
    fromMoon: o.manglikHouses.includes(mars.houseFromMoon),
    marsHouse: mars.house, marsHouseFromMoon: mars.houseFromMoon, houses: o.manglikHouses,
  };

  return {
    version: 1,
    name: input.name,
    birth: { ...input.birth, utc: utc.toISOString(), offsetMinutes, timeStatus },
    place: input.place,
    settings: { ayanamsa: 'Lahiri (Chitrapaksha)', node: o.node, houses: 'Whole sign', dashaYearDays: o.dashaYearDays },
    ayanamsa: pos.ayanamsa,
    lagna: {
      longitude: pos.ascendant, sign: lagnaSign, degreeInSign: pos.ascendant - lagnaSign * 30,
      nakshatra: lagnaNak.index, nakshatraPada: lagnaNak.pada, navamsa: navamsaSign(pos.ascendant),
    },
    planets,
    avakhada: {
      rashi: moonSign, rashiLord: SIGNS[moonSign].lord,
      nakshatra: moonNak.index, pada: moonNak.pada, nakshatraLord: moonNak.lord,
      naamakshar: moonNak.syllables[moonNak.pada - 1],
      varna: SIGNS[moonSign].varna, vashya: vashyaOf(g.Moon.longitude), yoni: moonNak.yoni,
      gana: moonNak.gana, nadi: nadiOf(moonNak.index), tatva: SIGNS[moonSign].tatva,
      sunSign: P.Sun.sign,
    },
    panchang: pan,
    dasha,
    currentDasha: current && { mahadasha: current.mahadasha.lord, antardasha: current.antardasha.lord,
      mahadashaEnd: current.mahadasha.end, antardashaEnd: current.antardasha.end },
    manglik,
    kaalSarp: kaalSarp(g, houseOf),
    sadeSati,
    yogas,
    generatedAt: now.toISOString(),
  };
}
