// Free-text DM -> { name, date, time, place } (any subset).
// Understands English, Hinglish and Hindi, labelled ("DOB: 12/3/95") or not
// ("Rahul, 12 March 1995, 6:45 am, Patna").

const HI_DIGITS = '०१२३४५६७८९';
const toAsciiDigits = (s) => s.replace(/[०-९]/g, (d) => String(HI_DIGITS.indexOf(d)));

const MONTHS = {
  jan: 1, january: 1, janvari: 1, 'जनवरी': 1, feb: 2, february: 2, farvari: 2, 'फरवरी': 2, 'फ़रवरी': 2,
  mar: 3, march: 3, 'मार्च': 3, apr: 4, april: 4, 'अप्रैल': 4, may: 5, mai: 5, 'मई': 5,
  jun: 6, june: 6, 'जून': 6, jul: 7, july: 7, 'जुलाई': 7, aug: 8, august: 8, 'अगस्त': 8,
  sep: 9, sept: 9, september: 9, 'सितंबर': 9, 'सितम्बर': 9, oct: 10, october: 10, 'अक्टूबर': 10, 'अक्तूबर': 10,
  nov: 11, november: 11, 'नवंबर': 11, 'नवम्बर': 11, dec: 12, december: 12, 'दिसंबर': 12, 'दिसम्बर': 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

const LABELS = {
  name: ['name', 'naam', 'नाम', 'full name'],
  date: ['dob', 'd.o.b', 'date of birth', 'birth date', 'date', 'janm tithi', 'janam tithi', 'janm tarikh', 'janam tarikh', 'tarikh', 'tareekh', 'जन्म तिथि', 'जन्मतिथि', 'तारीख', 'तिथि'],
  time: ['tob', 'time of birth', 'birth time', 'time', 'janm samay', 'janam samay', 'samay', 'जन्म समय', 'समय'],
  place: ['pob', 'place of birth', 'birth place', 'birthplace', 'place', 'location', 'city', 'janm sthan', 'janam sthan', 'sthan', 'jagah', 'shahar', 'जन्म स्थान', 'स्थान', 'शहर'],
};

// Period-of-day words: which half of the clock they imply.
const DAYPART = [
  [/\b(subah|subha|savere|morning|prातः)\b|सुबह|प्रातः/i, 'am'],
  [/\b(dopahar|dopaher|afternoon|noon)\b|दोपहर/i, 'pm'],
  [/\b(shaam|sham|evening)\b|शाम/i, 'pm'],
  [/\b(raat|rat|night)\b|रात/i, 'night'],
];

function currentYear() { return new Date().getUTCFullYear(); }
function expandYear(y) {
  if (y >= 100) return y;
  const cy = currentYear() % 100;
  return y <= cy ? 2000 + y : 1900 + y;
}
function validDate(d, m, y) {
  if (m < 1 || m > 12 || d < 1 || y < 1800 || y > 2100) return false; // future dates are rejected later, with a clear message
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= dim;
}

/** Find a date. Returns { value:{year,month,day}, raw, ambiguous } or null. */
export function findDate(text) {
  const t = toAsciiDigits(text);
  let m;
  // 12 March 1995 / 12th mar, 95 / 12 मार्च 1995
  m = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-.,/]*(${MONTH_RE})[a-z]*[\\s\\-.,/']*(\\d{2,4})`, 'i').exec(t);
  if (m) {
    const d = +m[1]; const mo = MONTHS[m[2].toLowerCase()] || MONTHS[m[2]]; const y = expandYear(+m[3]);
    if (validDate(d, mo, y)) return { value: { year: y, month: mo, day: d }, raw: m[0], ambiguous: false };
  }
  // March 12, 1995
  m = new RegExp(`(${MONTH_RE})[a-z]*[\\s\\-.,]*(\\d{1,2})(?:st|nd|rd|th)?[\\s,]+(\\d{2,4})`, 'i').exec(t);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()] || MONTHS[m[1]]; const d = +m[2]; const y = expandYear(+m[3]);
    if (validDate(d, mo, y)) return { value: { year: y, month: mo, day: d }, raw: m[0], ambiguous: false };
  }
  // 1995-03-12
  m = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t);
  if (m && validDate(+m[3], +m[2], +m[1])) return { value: { year: +m[1], month: +m[2], day: +m[3] }, raw: m[0], ambiguous: false };
  // 12/03/1995, 12-3-95, 12.03.1995 — Indian order DD/MM unless impossible.
  m = /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})(?!\s*[:.]\d)/.exec(t);
  if (m) {
    const a = +m[1]; const b = +m[2]; const y = expandYear(+m[3]);
    if (validDate(a, b, y)) return { value: { year: y, month: b, day: a }, raw: m[0], ambiguous: a <= 12 && b <= 12 && a !== b };
    if (validDate(b, a, y)) return { value: { year: y, month: a, day: b }, raw: m[0], ambiguous: false };
  }
  return null;
}

/** Find a time. Returns { value:{hour,minute}, raw, needsAmPm } or null. */
export function findTime(text, { excludeRaw } = {}) {
  let t = toAsciiDigits(text);
  if (excludeRaw) t = t.replace(toAsciiDigits(excludeRaw), ' ');
  let m = /(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|बजे)?/i.exec(t);
  let hour; let minute; let ap; let raw;
  if (m) { hour = +m[1]; minute = +m[2]; ap = m[4]; raw = m[0]; }
  else {
    m = /\b(\d{1,2})\s*(a\.?\s?m\.?|p\.?\s?m\.?|baje|बजे)(?![a-z])/i.exec(t);
    if (!m) return null;
    hour = +m[1]; minute = 0; ap = m[2]; raw = m[0];
  }
  if (hour > 23 || minute > 59) return null;
  const apNorm = ap && /a/i.test(ap) ? 'am' : ap && /p/i.test(ap) ? 'pm' : null;
  let part = null;
  for (const [re, p] of DAYPART) if (re.test(text)) { part = p; break; }
  let needsAmPm = false;
  if (apNorm) {
    if (hour > 12 || hour === 0) return { value: { hour: hour % 24, minute }, raw, needsAmPm: false };
    hour = apNorm === 'am' ? hour % 12 : (hour % 12) + 12;
  } else if (part && hour >= 1 && hour <= 12) {
    if (part === 'am') hour %= 12;
    else if (part === 'pm') hour = (hour % 12) + 12;
    else if (part === 'night') hour = hour >= 7 ? (hour % 12) + 12 : hour % 12; // raat 11 = 23:00, raat 2 = 02:00
  } else if (hour >= 1 && hour <= 12) {
    needsAmPm = true;
  }
  return { value: { hour, minute }, raw, needsAmPm };
}

function labelled(text) {
  const out = {};
  for (const lineRaw of text.split(/\n|;/)) {
    const line = lineRaw.trim();
    const m = /^([^:=\-–]+?)\s*[:=\-–]\s*(.+)$/.exec(line);
    if (!m) continue;
    const label = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
    for (const [field, names] of Object.entries(LABELS)) {
      if (names.includes(label) && !out[field]) out[field] = m[2].trim();
    }
  }
  return out;
}

const cleanName = (s) => s.replace(/^(mera naam|my name is|name is|i am|main|मेरा नाम)\s+/i, '').replace(/\s+(hai|है)$/i, '').trim();
const looksLikeWords = (s) => /[a-zऀ-ॿ]/i.test(s) && !/\d/.test(s);

/**
 * @returns {{name?, date?, time?, place?, dateAmbiguous?, needsAmPm?}}
 */
export function parseBirthDetails(text) {
  const res = {};
  const lab = labelled(text);
  const dateSrc = lab.date || text;
  const d = findDate(dateSrc);
  if (d) { res.date = d.value; if (d.ambiguous) res.dateAmbiguous = true; }
  const timeSrc = lab.time || text;
  const t = findTime(timeSrc, { excludeRaw: lab.time ? undefined : d?.raw });
  if (t) { res.time = t.value; if (t.needsAmPm) res.needsAmPm = true; }
  if (lab.name && looksLikeWords(lab.name)) res.name = cleanName(lab.name);
  if (lab.place) res.place = lab.place;

  if (!res.name || !res.place) {
    // Unlabelled: remove date/time fragments, split the rest into segments.
    let rest = toAsciiDigits(text);
    if (d) rest = rest.replace(toAsciiDigits(d.raw), ' | ');
    if (t) rest = rest.replace(toAsciiDigits(t.raw), ' | ');
    rest = rest.replace(/\b(dob|tob|pob|date of birth|time of birth|place of birth|born|birth|janm|janam|kundli|kundali|horoscope|chart|please|pls|plz|sir|mam|ji|bana do|banao|bana dijiye|chahiye|chaiye|hai|mera|meri|my|in|at|on|को|की|का|में|कुंडली|जन्म)\b/gi, ' ')
      .replace(/\b(subah|subha|savere|morning|dopahar|afternoon|shaam|sham|evening|raat|night|सुबह|दोपहर|शाम|रात)\b/gi, ' ');
    const segs = rest.split(/[\n,|;]+/).map((x) => x.replace(/\s+/g, ' ').replace(/^[\s\-–—:.]+|[\s\-–—:.]+$/g, '').trim())
      .filter((x) => x && looksLikeWords(x) && x.length >= 2)
      .map((x) => {
        // "naam Sita", "sthan Gaya Bihar": a leading label says which field this is.
        const low = x.toLowerCase();
        for (const [field, names] of Object.entries(LABELS)) {
          for (const n of names) {
            if (low === n) return { text: '', field };
            if (low.startsWith(`${n} `)) return { text: x.slice(n.length).trim(), field };
          }
        }
        return { text: x, field: null };
      })
      .filter((x) => x.text && x.text !== lab.name && x.text !== lab.place);
    for (const sg of segs) {
      if (sg.field === 'name' && !res.name) res.name = cleanName(sg.text);
      if (sg.field === 'place' && !res.place) res.place = sg.text;
    }
    const free = segs.filter((x) => !x.field).map((x) => x.text);
    if (!res.name && free.length >= 2) res.name = cleanName(free[0]);
    if (!res.place && free.length >= 1 && free[free.length - 1] !== res.name) res.place = free[free.length - 1];
    if (!res.name && free.length === 1 && res.place !== free[0]) res.name = cleanName(free[0]);
  }
  return res;
}

// Short intents.
export const isYes = (s) => /^\s*(y|yes|yeah|haan|han|ha|haa|haanji|ji|ji haan|sahi|sahi hai|correct|ok|okay|theek|thik|हाँ|हां|जी|सही|ठीक)\b/i.test(s) || /✅/.test(s);
export const isNo = (s) => /^\s*(n|no|nahi|nahin|galat|wrong|badlo|change|edit|नहीं|गलत|बदलें)\b/i.test(s) || /✏️/.test(s);
export const isCancel = (s) => /^\s*(cancel|stop|band karo|rehne do|रद्द|बंद)\s*$/i.test(s);
export const wantsKundli = (s) => /\b(kundli|kundali|kundalee|janam patri|janampatri|janmpatri|birth ?chart|horoscope|kp chart)\b|कुंडली|कुण्डली|जन्मपत्री|जन्म पत्री/i.test(s);
export function amPmReply(s) {
  if (/\b(am|a\.m|subah|morning)\b|सुबह/i.test(s)) return 'am';
  if (/\b(pm|p\.m|shaam|sham|evening|dopahar|raat|night)\b|शाम|दोपहर|रात/i.test(s)) return 'pm';
  return null;
}
