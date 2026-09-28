import { SIGNS, NAKSHATRAS, PLANET_NAMES, HI } from '../astro/constants.js';
import { formatOffset } from '../astro/time.js';

export function dms(deg, { seconds = false } = {}) {
  let total = Math.round(deg * (seconds ? 3600 : 60));
  const unit = seconds ? 3600 : 60;
  const d = Math.floor(total / unit); total -= d * unit;
  if (!seconds) return `${d}°${String(total).padStart(2, '0')}'`;
  const m = Math.floor(total / 60); const s = total - m * 60;
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const birthDateLong = (b) => `${b.day} ${MONTHS_FULL[b.month - 1]} ${b.year}`;
export function birthTime12(b) {
  const h = b.hour % 12 === 0 ? 12 : b.hour % 12;
  return `${String(h).padStart(2, '0')}:${String(b.minute).padStart(2, '0')} ${b.hour < 12 ? 'AM' : 'PM'}`;
}
export const offsetLabel = (min) => formatOffset(min);

// Date in the birth place's zone, e.g. "14 Sep 2039".
export function shortDate(date, timeZone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.day} ${MONTHS[+p.month - 1]} ${p.year}`;
}
export function clockTime(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

export const signHi = (i) => SIGNS[i].hi;
export const signEn = (i) => SIGNS[i].en;
export const nakHi = (i) => NAKSHATRAS[i].hi;
export const nakEn = (i) => NAKSHATRAS[i].en;
export const planetHi = (p) => PLANET_NAMES[p].hi;
export const planetEn = (p) => PLANET_NAMES[p].en;
export const hi = (w) => HI[w] || w;

export function latLon(lat, lon) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
