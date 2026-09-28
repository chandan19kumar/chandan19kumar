import * as A from 'astronomy-engine';
import {
  TITHIS, TITHIS_HI, YOGAS, YOGAS_HI, KARANAS_MOVABLE, KARANAS_MOVABLE_HI, KARANAS_FIXED, VAARS,
} from '../astro/constants.js';
import { localToUtc } from '../astro/time.js';
import { norm360 } from '../astro/positions.js';

/** Sunrise/sunset on the civil date of `local` at the place. Null in polar day/night. */
export function sunTimes(local, place) {
  const midnight = localToUtc({ ...local, hour: 0, minute: 0, second: 0 }, place.timeZone).utc;
  const obs = new A.Observer(place.lat, place.lon, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, midnight, 1);
  const set = A.SearchRiseSet(A.Body.Sun, obs, -1, midnight, 1);
  return { sunrise: rise ? rise.date : null, sunset: set ? set.date : null };
}

export function panchang(sunLon, moonLon, birthUtc, local, place) {
  const diff = norm360(moonLon - sunLon);
  const tithiNum = Math.floor(diff / 12) + 1; // 1..30
  const paksha = tithiNum <= 15 ? 'Shukla' : 'Krishna';
  const inPaksha = ((tithiNum - 1) % 15) + 1; // 1..15
  let tithi; let tithiHi;
  if (inPaksha === 15) {
    [tithi, tithiHi] = paksha === 'Shukla' ? ['Purnima', 'पूर्णिमा'] : ['Amavasya', 'अमावस्या'];
  } else {
    tithi = TITHIS[inPaksha - 1]; tithiHi = TITHIS_HI[inPaksha - 1];
  }

  const yogaIdx = Math.floor(norm360(sunLon + moonLon) / (360 / 27));

  const karanaNum = Math.floor(diff / 6) + 1; // 1..60
  let karana; let karanaHi;
  if (KARANAS_FIXED[karanaNum]) [karana, karanaHi] = KARANAS_FIXED[karanaNum];
  else { const i = (karanaNum - 2) % 7; karana = KARANAS_MOVABLE[i]; karanaHi = KARANAS_MOVABLE_HI[i]; }

  // Vaar: the Hindu day runs sunrise to sunrise.
  const civilWeekday = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  const { sunrise, sunset } = sunTimes(local, place);
  let vaarIdx = civilWeekday;
  let beforeSunrise = false;
  if (sunrise && birthUtc < sunrise) { vaarIdx = (civilWeekday + 6) % 7; beforeSunrise = true; }
  const [vaar, vaarHi, vaarLord] = VAARS[vaarIdx];

  return {
    tithi: { number: tithiNum, name: tithi, hi: tithiHi, paksha, progress: (diff % 12) / 12 },
    yoga: { number: yogaIdx + 1, name: YOGAS[yogaIdx], hi: YOGAS_HI[yogaIdx] },
    karana: { number: karanaNum, name: karana, hi: karanaHi },
    vaar: { name: vaar, hi: vaarHi, lord: vaarLord, beforeSunrise, polar: !sunrise },
    sunrise, sunset,
  };
}
