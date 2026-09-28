// Sidereal (Lahiri) positions of the nine grahas and the ascendant.
//
// Planet/Moon positions come from Astronomy Engine (MIT licence), whose models
// are validated by its authors against NASA JPL Horizons. We then apply:
//   light-time + aberration (apparent place), IAU 2000B nutation,
//   true obliquity, and apparent sidereal time for the ascendant.
// Every number is cross-checked in test/accuracy.test.js against Swiss
// Ephemeris (fitted to NASA JPL DE431) over 500 births, 1900-2050.

import * as A from 'astronomy-engine';
import { jdFromDate } from './time.js';

const DEG = Math.PI / 180;
export const norm360 = (x) => ((x % 360) + 360) % 360;

const J2000 = 2451545.0;

// Lahiri (Chitrapaksha) ayanamsa as defined by the Indian Calendar Reform
// Committee: 23°15'00.658" at 1956-03-21 0h TT (after the standard nutation
// correction), carried forward by IAU 2006 general precession in longitude.
const LAHIRI_T0 = (2435553.5 - J2000) / 36525;
const LAHIRI_AT_T0 = 23.245524743;
const precessionLongitudeDeg = (T) =>
  (5028.796195 * T + 1.1054348 * T ** 2 + 0.00007964 * T ** 3 - 0.000023857 * T ** 4 - 0.0000000383 * T ** 5) / 3600;

export function lahiriMeanAyanamsa(time) {
  const T = time.tt / 36525; // astronomy-engine: tt = days since J2000 (TT)
  return LAHIRI_AT_T0 + precessionLongitudeDeg(T) - precessionLongitudeDeg(LAHIRI_T0);
}

const BODY = {
  Sun: A.Body.Sun, Moon: A.Body.Moon, Mars: A.Body.Mars, Mercury: A.Body.Mercury,
  Jupiter: A.Body.Jupiter, Venus: A.Body.Venus, Saturn: A.Body.Saturn,
};

// Apparent geocentric ecliptic longitude, true equinox of date (tropical).
function tropicalLongitude(name, time) {
  const vec = A.GeoVector(BODY[name], time, true);
  return A.Ecliptic(vec).elon;
}

// Mean lunar node (Meeus, Astronomical Algorithms 2nd ed., 47.7), mean equinox of date.
function meanNodeTropical(time) {
  const T = time.tt / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000);
}

// Osculating ("true") node from the Moon's geocentric state vector, true equinox of date.
function trueNodeTropical(time) {
  const s = A.GeoMoonState(time);
  const rot = A.Rotation_EQJ_ECT(time);
  const r = A.RotateVector(rot, new A.Vector(s.x, s.y, s.z, time));
  const v = A.RotateVector(rot, new A.Vector(s.vx, s.vy, s.vz, time));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return norm360(Math.atan2(hx, -hy) / DEG);
}

// Ascendant from local apparent sidereal time. Tropical, true equinox of date.
// Formula valid at every latitude; above the polar circles the ecliptic can
// sit wholly above or below the horizon, where the classical rule "take the
// eastern intersection" is what we (and Swiss Ephemeris) return.
function ascendantTropical(time, latDeg, lonDeg) {
  const eps = A.e_tilt(time).tobl * DEG;
  const armc = norm360(A.SiderealTime(time) * 15 + lonDeg) * DEG;
  const phi = latDeg * DEG;
  let asc = Math.atan2(Math.cos(armc), -(Math.sin(armc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / DEG;
  asc = norm360(asc);
  // Swiss Ephemeris convention above the polar circle: if the computed point is
  // on the western half (the descendant), flip to keep the ascendant eastern.
  if (Math.abs(latDeg) > 90 - eps / DEG) {
    const mc = norm360(Math.atan2(Math.sin(armc), Math.cos(armc) * Math.cos(eps)) / DEG);
    const d = norm360(asc - mc);
    if (d > 180) asc = norm360(asc + 180);
  }
  return { asc, armc: armc / DEG };
}

export const NODE_TYPES = ['mean', 'true'];

/**
 * All sidereal positions for an instant and place.
 * @param {Date} utc
 * @param {{lat:number, lon:number}} place   degrees, east/north positive
 * @param {{node?: 'mean'|'true'}} opts
 */
export function siderealPositions(utc, place, { node = 'mean' } = {}) {
  const time = A.MakeTime(utc);
  const tilt = A.e_tilt(time);
  const ayanMean = lahiriMeanAyanamsa(time);
  const ayanTrue = ayanMean + tilt.dpsi / 3600; // what gets subtracted from true-equinox longitudes

  const H = 1 / 24; // 1 hour step for speeds (central difference), in days
  const tPrev = A.MakeTime(new Date(utc.getTime() - H * 86400000));
  const tNext = A.MakeTime(new Date(utc.getTime() + H * 86400000));
  const ayanPrev = lahiriMeanAyanamsa(tPrev) + A.e_tilt(tPrev).dpsi / 3600;
  const ayanNext = lahiriMeanAyanamsa(tNext) + A.e_tilt(tNext).dpsi / 3600;
  const speedOf = (f) => {
    const a = norm360(f(tPrev) - ayanPrev);
    const b = norm360(f(tNext) - ayanNext);
    let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360;
    return d / (2 * H);
  };

  const out = {};
  for (const name of Object.keys(BODY)) {
    const f = (t) => tropicalLongitude(name, t);
    out[name] = { longitude: norm360(f(time) - ayanTrue), speed: speedOf(f) };
  }
  let rahu;
  if (node === 'true') {
    rahu = { longitude: norm360(trueNodeTropical(time) - ayanTrue), speed: speedOf(trueNodeTropical) };
  } else {
    // Mean node is referred to the mean equinox: subtract mean ayanamsa only.
    const f = (t) => meanNodeTropical(t) + A.e_tilt(t).dpsi / 3600; // express on true equinox, then remove true ayanamsa
    rahu = { longitude: norm360(meanNodeTropical(time) - ayanMean), speed: speedOf(f) };
  }
  out.Rahu = rahu;
  out.Ketu = { longitude: norm360(rahu.longitude + 180), speed: rahu.speed };

  const { asc, armc } = ascendantTropical(time, place.lat, place.lon);
  return {
    jdUt: jdFromDate(utc),
    deltaTSeconds: (time.tt - time.ut) * 86400,
    ayanamsa: ayanTrue,
    ayanamsaMean: ayanMean,
    armc,
    ascendant: norm360(asc - ayanTrue),
    grahas: out,
  };
}
