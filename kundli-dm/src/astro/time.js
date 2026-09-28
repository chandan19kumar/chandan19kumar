// Local civil time -> UTC using the IANA time-zone database built into Node
// (Intl). This carries historical rules, e.g. India's +6:30 war time of
// 1942-45 and every DST change abroad, which a fixed "+5:30" would get wrong.

const J1970 = 2440587.5;

export const jdFromDate = (date) => date.getTime() / 86400000 + J1970;
export const dateFromJd = (jd) => new Date(Math.round((jd - J1970) * 86400000));

const partsCache = new Map();
function formatter(timeZone) {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', era: 'short',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

// Offset (milliseconds east of UTC) that `timeZone` had at the instant `ms`.
function zoneOffsetMs(timeZone, ms) {
  const p = Object.fromEntries(formatter(timeZone).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  let year = +p.year;
  if (p.era === 'BC' || p.era === 'B') year = 1 - year;
  const asUtc = Date.UTC(year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const wholeSecondsMs = ms - (((ms % 1000) + 1000) % 1000);
  return asUtc - wholeSecondsMs;
}

export const zoneOffsetMinutes = (timeZone, ms) => zoneOffsetMs(timeZone, ms) / 60000;

export function isValidTimeZone(timeZone) {
  try { formatter(timeZone); return true; } catch { return false; }
}

/**
 * Convert a wall-clock birth time in `timeZone` to a UTC instant.
 * Returns { utc: Date, offsetMinutes, status } where status is
 *   'ok'          – unique local time
 *   'ambiguous'   – clocks went back, time occurred twice (earlier one used)
 *   'nonexistent' – clocks jumped forward over it (shifted like a watch would be)
 */
export function localToUtc({ year, month, day, hour, minute, second = 0 }, timeZone) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  if (year < 100) {
    // Date.UTC maps 0-99 to 1900-1999; not a real birth year for this service.
    throw new RangeError('year out of range');
  }
  const candidates = new Set();
  for (const probe of [wall - 36 * 3600e3, wall, wall + 36 * 3600e3]) {
    candidates.add(zoneOffsetMs(timeZone, probe));
  }
  const matches = [];
  for (const off of candidates) {
    const utcMs = wall - off;
    if (zoneOffsetMs(timeZone, utcMs) === off) matches.push({ utcMs, off: off / 60000 });
  }
  matches.sort((a, b) => a.utcMs - b.utcMs);
  if (matches.length >= 1) {
    const m = matches[0];
    return { utc: new Date(m.utcMs), offsetMinutes: m.off, status: matches.length > 1 ? 'ambiguous' : 'ok' };
  }
  // Nonexistent (spring-forward gap): interpret with the offset in force just before.
  const before = zoneOffsetMs(timeZone, wall - 12 * 3600e3);
  const utcMs = wall - before;
  return { utc: new Date(utcMs), offsetMinutes: zoneOffsetMinutes(timeZone, utcMs), status: 'nonexistent' };
}

export function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const m = Math.abs(minutes);
  const h = Math.floor(m / 60);
  const mm = Math.round(m - h * 60);
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
