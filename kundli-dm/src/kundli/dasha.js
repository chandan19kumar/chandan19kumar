import { DASHA_ORDER, DASHA_YEARS, NAKSHATRAS } from '../astro/constants.js';

const NAK = 360 / 27;

/**
 * Vimshottari dasha from the Moon's sidereal longitude.
 * yearDays: length of a dasha year in days. 365.25 (Julian year) is the common
 * software default; 365.2422 (tropical) and 360 (savana) are also used.
 */
export function vimshottari(moonLongitude, birthUtc, { yearDays = 365.25 } = {}) {
  const nakIndex = Math.floor(moonLongitude / NAK);
  const elapsedFrac = (moonLongitude - nakIndex * NAK) / NAK;
  const firstLord = NAKSHATRAS[nakIndex].lord;
  const start = DASHA_ORDER.indexOf(firstLord);
  const yearMs = yearDays * 86400000;

  // The first mahadasha began before birth: only (1 - elapsed) of it remains.
  let cursor = birthUtc.getTime() - elapsedFrac * DASHA_YEARS[firstLord] * yearMs;
  const mahadashas = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(start + i) % 9];
    const years = DASHA_YEARS[lord];
    const mdStart = cursor;
    const mdEnd = mdStart + years * yearMs;
    const antardashas = [];
    let a = mdStart;
    const aStart = DASHA_ORDER.indexOf(lord);
    for (let j = 0; j < 9; j++) {
      const sub = DASHA_ORDER[(aStart + j) % 9];
      const len = (years * DASHA_YEARS[sub] / 120) * yearMs;
      antardashas.push({ lord: sub, start: new Date(a), end: new Date(a + len) });
      a += len;
    }
    mahadashas.push({ lord, years, start: new Date(mdStart), end: new Date(mdEnd), antardashas });
    cursor = mdEnd;
  }
  const balance = (1 - elapsedFrac) * DASHA_YEARS[firstLord];
  return { firstLord, balanceYears: balance, yearDays, mahadashas };
}

export function dashaAt(dasha, when) {
  const t = when.getTime();
  const md = dasha.mahadashas.find((m) => m.start.getTime() <= t && t < m.end.getTime());
  if (!md) return null;
  const ad = md.antardashas.find((x) => x.start.getTime() <= t && t < x.end.getTime());
  return { mahadasha: md, antardasha: ad };
}

// "7y 3m 12d" style balance.
export function splitYears(years, yearDays = 365.25) {
  const y = Math.floor(years);
  const monthsF = (years - y) * 12;
  const m = Math.floor(monthsF);
  const d = Math.floor((monthsF - m) * (yearDays / 12));
  return { years: y, months: m, days: d };
}
