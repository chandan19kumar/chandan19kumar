// Four 1080x1350 Instagram-portrait cards that together form the kundli.
import { THEME, FONT } from './theme.js';
import { text, rect, line } from './svg.js';
import { northIndianChart } from './chart.js';
import { PLANET_NAMES } from '../astro/constants.js';

const YOGA_HI = { Gajakesari: 'गजकेसरी', Budhaditya: 'बुधादित्य', 'Chandra-Mangal': 'चंद्र-मंगल', 'Guru-Chandal': 'गुरु-चांडाल',
  Ruchaka: 'रुचक', Bhadra: 'भद्र', Hamsa: 'हंस', Malavya: 'मालव्य', Sasa: 'शश' };
const KAAL_SARP_HI = { Anant: 'अनंत', Kulik: 'कुलिक', Vasuki: 'वासुकि', Shankhpal: 'शंखपाल', Padma: 'पद्म', Mahapadma: 'महापद्म',
  Takshak: 'तक्षक', Karkotak: 'कर्कोटक', Shankhachood: 'शंखचूड़', Ghatak: 'घातक', Vishdhar: 'विषधर', Sheshnag: 'शेषनाग' };
import {
  dms, birthDateLong, birthTime12, offsetLabel, shortDate, clockTime, signHi, signEn, nakHi, nakEn,
  planetHi, planetEn, hi, latLon,
} from './format.js';
import { splitYears } from '../kundli/dasha.js';

const W = 1080; const H = 1350; const M = 56;
const TOTAL = 4;

function frame(inner, page, { title, titleEn }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${rect(0, 0, W, H, { fill: THEME.paper })}
  ${rect(18, 18, W - 36, H - 36, { stroke: THEME.gold, sw: 2 })}
  ${rect(26, 26, W - 52, H - 52, { stroke: THEME.gold, sw: 0.8 })}
  ${rect(26, 26, W - 52, 132, { fill: THEME.maroon })}
  ${text(THEME.brand, M + 4, 104, { size: 58, weight: 700, fill: THEME.goldLight, family: FONT.display, letterSpacing: 1 })}
  ${text(THEME.tagline.toUpperCase(), M + 6, 134, { size: 17, weight: 600, fill: THEME.goldLight, letterSpacing: 4, opacity: 0.85 })}
  ${text(title, W - M, 94, { size: 40, weight: 600, fill: '#FFF6E3', anchor: 'end', family: FONT.serifDeva })}
  ${text(titleEn, W - M, 132, { size: 20, weight: 400, fill: THEME.goldLight, anchor: 'end', letterSpacing: 1 })}
  ${inner}
  ${line(M, H - 86, W - M, H - 86, THEME.rule, 1)}
  ${text('Lahiri ayanamsa · Whole-sign houses · Positions checked against Swiss Ephemeris (NASA JPL DE431 based)', M, H - 56, { size: 16, fill: THEME.muted, maxWidth: W - 2 * M - 120 })}
  ${text(`${page} / ${TOTAL}`, W - M, H - 56, { size: 18, weight: 600, fill: THEME.maroon, anchor: 'end' })}
</svg>`;
}

function sectionTitle(hiText, enText, x, y, width) {
  return `${text(hiText, x, y, { size: 30, weight: 600, fill: THEME.maroon, family: FONT.serifDeva })}
  ${text(enText.toUpperCase(), x + width, y, { size: 16, weight: 600, fill: THEME.gold, anchor: 'end', letterSpacing: 3 })}
  ${line(x, y + 14, x + width, y + 14, THEME.gold, 1.2)}`;
}

function chip(x, y, w, h, label, value, sub) {
  return `${rect(x, y, w, h, { fill: THEME.panel, stroke: THEME.rule, sw: 1.2, rx: 10 })}
  ${text(label, x + w / 2, y + 30, { size: 17, weight: 600, fill: THEME.muted, anchor: 'middle', letterSpacing: 1, maxWidth: w - 16 })}
  ${text(value, x + w / 2, y + 68, { size: 30, weight: 700, fill: THEME.maroon, anchor: 'middle', maxWidth: w - 16 })}
  ${sub ? text(sub, x + w / 2, y + 96, { size: 17, fill: THEME.ink, anchor: 'middle', maxWidth: w - 16 }) : ''}`;
}

// Grahas of a chart, grouped by house (1..12), with the lagna marker in house 1.
function chartHouses(k, houseSignOf, placeOf, { lagnaLabel } = {}) {
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: houseSignOf(i + 1), items: [] }));
  if (lagnaLabel) houses[0].items.push({ text: lagnaLabel, color: THEME.maroonSoft });
  for (const p of k.planets) {
    const flags = `${p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' ? '(व)' : ''}${p.combust ? '(अ)' : ''}`;
    const deg = placeOf.showDeg ? ` ${Math.floor(p.degreeInSign)}°` : '';
    houses[placeOf(p) - 1].items.push({ text: `${PLANET_NAMES[p.name].short}${flags}${deg}`,
      color: p.dignity === 'Exalted' ? THEME.good : p.dignity === 'Debilitated' ? THEME.warn : THEME.ink });
  }
  return houses;
}

export function card1(k) {
  const b = k.birth; const pl = k.place;
  const moonNak = k.avakhada;
  let s = '';
  s += text(k.name, W / 2, 238, { size: 54, weight: 700, fill: THEME.ink, anchor: 'middle', family: FONT.display, maxWidth: W - 2 * M });
  const when = `${birthDateLong(b)}  ·  ${birthTime12(b)} (${offsetLabel(b.offsetMinutes)})`;
  s += text(when, W / 2, 284, { size: 25, fill: THEME.ink, anchor: 'middle', maxWidth: W - 2 * M });
  s += text(`${pl.name}  ·  ${latLon(pl.lat, pl.lon)}`, W / 2, 320, { size: 21, fill: THEME.muted, anchor: 'middle', maxWidth: W - 2 * M });

  const cw = (W - 2 * M - 3 * 16) / 4; const cy = 348;
  s += chip(M, cy, cw, 112, 'लग्न · LAGNA', signHi(k.lagna.sign), `${signEn(k.lagna.sign)} ${dms(k.lagna.degreeInSign)}`);
  s += chip(M + (cw + 16), cy, cw, 112, 'राशि · MOON SIGN', signHi(moonNak.rashi), signEn(moonNak.rashi));
  s += chip(M + 2 * (cw + 16), cy, cw, 112, 'नक्षत्र · NAKSHATRA', `${nakHi(moonNak.nakshatra)}-${moonNak.pada}`, `${nakEn(moonNak.nakshatra)}, pada ${moonNak.pada}`);
  s += chip(M + 3 * (cw + 16), cy, cw, 112, 'नामाक्षर · NAME SOUND', moonNak.naamakshar, `Sun sign: ${signEn(moonNak.sunSign)}`);

  const S = 690; const cx = (W - S) / 2; const top = 520;
  s += sectionTitle('लग्न कुंडली', 'Lagna chart · D1', cx, top - 22, S);
  const houses = chartHouses(k, (h) => (k.lagna.sign + h - 1) % 12, Object.assign((p) => p.house, { showDeg: true }),
    { lagnaLabel: `ल ${Math.floor(k.lagna.degreeInSign)}°` });
  s += `<g transform="translate(${cx},${top + 10})">${northIndianChart(S, houses)}</g>`;
  s += text('ल = लग्न  ·  (व) = वक्री / retrograde  ·  (अ) = अस्त / combust  ·  green = उच्च  ·  red = नीच', W / 2, top + S + 46, { size: 17, fill: THEME.muted, anchor: 'middle', maxWidth: W - 2 * M });
  return frame(s, 1, { title: 'जन्म कुंडली', titleEn: 'Janm Kundli · Birth Chart' });
}

export function card2(k) {
  let s = '';
  const x0 = M; const width = W - 2 * M;
  s += sectionTitle('ग्रह स्थिति', 'Planetary positions', x0, 222, width);
  const cols = [
    { hi: 'ग्रह', en: 'Planet', w: 190 },
    { hi: 'राशि', en: 'Sign', w: 165 },
    { hi: 'अंश', en: 'Degree', w: 120 },
    { hi: 'नक्षत्र', en: 'Nakshatra · pada', w: 250 },
    { hi: 'भाव', en: 'House', w: 85 },
    { hi: 'स्थिति', en: 'Dignity', w: 158 },
  ];
  let y = 262; const rowH = 82;
  s += rect(x0, y, width, 66, { fill: THEME.maroon, rx: 8 });
  let cx = x0;
  for (const c of cols) {
    s += text(c.hi, cx + 16, y + 32, { size: 23, weight: 600, fill: '#FFF6E3' });
    s += text(c.en.toUpperCase(), cx + 16, y + 55, { size: 13, weight: 600, fill: THEME.goldLight, letterSpacing: 1.5 });
    cx += c.w;
  }
  y += 66;
  const rows = [{ lagna: true }, ...k.planets];
  rows.forEach((r, i) => {
    if (i % 2 === 0) s += rect(x0, y, width, rowH, { fill: THEME.paperDeep, opacity: 0.55 });
    let c = x0; const y1 = y + 36; const y2 = y + 64;
    const sign = r.lagna ? k.lagna.sign : r.sign;
    const deg = r.lagna ? k.lagna.degreeInSign : r.degreeInSign;
    const nak = r.lagna ? k.lagna.nakshatra : r.nakshatra;
    const pada = r.lagna ? k.lagna.nakshatraPada : r.nakshatraPada;
    // Planet
    s += text(r.lagna ? 'लग्न' : planetHi(r.name), c + 16, y1, { size: 27, weight: 700, fill: r.lagna ? THEME.maroonSoft : THEME.ink });
    s += text(r.lagna ? 'Ascendant' : planetEn(r.name), c + 16, y2, { size: 17, fill: THEME.muted });
    if (!r.lagna) {
      let fx = c + 118;
      const flags = [];
      if (r.retrograde && r.name !== 'Rahu' && r.name !== 'Ketu') flags.push(['व', 'R']);
      if (r.combust) flags.push(['अ', 'C']);
      for (const [f] of flags) {
        s += rect(fx, y + 14, 30, 30, { fill: THEME.maroonSoft, rx: 15 });
        s += text(f, fx + 15, y + 36, { size: 18, weight: 700, fill: '#FFF6E3', anchor: 'middle' });
        fx += 36;
      }
    }
    c += cols[0].w;
    s += text(signHi(sign), c + 16, y1, { size: 26, weight: 600, fill: THEME.ink });
    s += text(signEn(sign), c + 16, y2, { size: 17, fill: THEME.muted }); c += cols[1].w;
    s += text(dms(deg), c + 16, y1 + 12, { size: 25, weight: 600, fill: THEME.ink }); c += cols[2].w;
    s += text(`${nakHi(nak)} ${pada}`, c + 16, y1, { size: 25, weight: 600, fill: THEME.ink, maxWidth: cols[3].w - 20 });
    s += text(`${nakEn(nak)} · ${r.lagna ? '' : `lord ${r.nakshatraLord}`}`.replace(/ · $/, ''), c + 16, y2, { size: 17, fill: THEME.muted, maxWidth: cols[3].w - 20 }); c += cols[3].w;
    s += text(r.lagna ? '1' : String(r.house), c + 40, y1 + 12, { size: 28, weight: 700, fill: THEME.maroon, anchor: 'middle' }); c += cols[4].w;
    if (!r.lagna && r.dignity) {
      const col = r.dignity === 'Exalted' || r.dignity === 'Moolatrikona' || r.dignity === 'Own' ? THEME.good : r.dignity === 'Debilitated' || r.dignity === 'Enemy' ? THEME.warn : THEME.ink;
      s += text(hi(r.dignity), c + 16, y1, { size: 24, weight: 600, fill: col });
      s += text(r.dignity, c + 16, y2, { size: 17, fill: THEME.muted });
    } else if (!r.lagna) {
      s += text('—', c + 16, y1 + 12, { size: 24, fill: THEME.muted });
    }
    y += rowH;
  });
  s += line(x0, y, x0 + width, y, THEME.rule, 1);
  s += text(`अयनांश (लाहिड़ी) · Ayanamsa: ${dms(k.ayanamsa, { seconds: true })}    ·    राहु/केतु: ${k.settings.node === 'true' ? 'True node' : 'Mean node'}`, x0, y + 40, { size: 19, fill: THEME.ink, maxWidth: width });
  s += text('व = वक्री (retrograde)   ·   अ = अस्त (combust, too close to the Sun)', x0, y + 72, { size: 18, fill: THEME.muted, maxWidth: width });
  return frame(s, 2, { title: 'ग्रह स्पष्ट', titleEn: 'Graha Spasht · Planet Details' });
}

function kvPanel(x, y, w, titleHi, titleEn, rows) {
  const rowH = 52;
  let s = sectionTitle(titleHi, titleEn, x, y, w);
  let yy = y + 56;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) s += rect(x, yy - 34, w, rowH, { fill: THEME.paperDeep, opacity: 0.5, rx: 4 });
    s += text(k, x + 12, yy, { size: 21, fill: THEME.muted, maxWidth: w * 0.42 });
    s += text(v, x + w - 12, yy, { size: 22, weight: 600, fill: THEME.ink, anchor: 'end', maxWidth: w * 0.56 });
    yy += rowH;
  });
  return s;
}

export function card3(k) {
  let s = '';
  const S = 460; const gap = W - 2 * M - 2 * S;
  const top = 236;
  s += sectionTitle('नवांश', 'Navamsa · D9', M, top - 22, S);
  s += sectionTitle('चंद्र कुंडली', 'Moon chart', M + S + gap, top - 22, S);
  const d9Lagna = k.lagna.navamsa;
  const d9 = chartHouses(k, (h) => (d9Lagna + h - 1) % 12, (p) => ((p.navamsa - d9Lagna + 12) % 12) + 1, { lagnaLabel: 'ल' });
  s += `<g transform="translate(${M},${top + 8})">${northIndianChart(S, d9, { fontSize: 21 })}</g>`;
  const moonSign = k.avakhada.rashi;
  const ch = chartHouses(k, (h) => (moonSign + h - 1) % 12, (p) => p.houseFromMoon);
  ch[(k.lagna.sign - moonSign + 12) % 12].items.unshift({ text: 'ल', color: THEME.maroonSoft });
  s += `<g transform="translate(${M + S + gap},${top + 8})">${northIndianChart(S, ch, { fontSize: 21 })}</g>`;

  const pY = top + S + 76; const pw = (W - 2 * M - 40) / 2;
  const pan = k.panchang; const tz = k.place.timeZone;
  s += kvPanel(M, pY, pw, 'पंचांग', 'Panchang at birth', [
    ['तिथि · Tithi', `${pan.tithi.hi} (${hi(pan.tithi.paksha)})`],
    ['वार · Day', `${pan.vaar.hi}${pan.vaar.beforeSunrise ? '*' : ''}`],
    ['नक्षत्र · Nakshatra', `${nakHi(k.avakhada.nakshatra)} ${k.avakhada.pada}`],
    ['योग · Yoga', pan.yoga.hi],
    ['करण · Karana', pan.karana.hi],
    ['सूर्योदय · Sunrise', pan.sunrise ? clockTime(new Date(pan.sunrise), tz) : '—'],
    ['सूर्यास्त · Sunset', pan.sunset ? clockTime(new Date(pan.sunset), tz) : '—'],
    ['अयनांश · Ayanamsa', dms(k.ayanamsa)],
  ]);
  const a = k.avakhada;
  s += kvPanel(M + pw + 40, pY, pw, 'अवकहड़ा चक्र', 'Avakhada', [
    ['वर्ण · Varna', hi(a.varna)],
    ['वश्य · Vashya', hi(a.vashya)],
    ['योनि · Yoni', hi(a.yoni)],
    ['गण · Gana', hi(a.gana)],
    ['नाड़ी · Nadi', hi(a.nadi)],
    ['तत्व · Tatva', hi(a.tatva)],
    ['राशि स्वामी · Rashi lord', planetHi(a.rashiLord)],
    ['नामाक्षर · Name sound', a.naamakshar],
  ]);
  if (pan.vaar.beforeSunrise) s += text('* जन्म सूर्योदय से पहले: हिंदू वार पिछले दिन का गिना जाता है (vaar changes at sunrise)', M, H - 108, { size: 16, fill: THEME.muted, maxWidth: W - 2 * M });
  return frame(s, 3, { title: 'नवांश · पंचांग', titleEn: 'Navamsa · Panchang · Avakhada' });
}

export function card4(k, { reportUrl } = {}) {
  let s = '';
  const tz = k.place.timeZone; const width = W - 2 * M;
  const now = new Date(k.generatedAt).getTime();
  const bal = splitYears(k.dasha.balanceYears, k.dasha.yearDays);
  s += sectionTitle('विंशोत्तरी महादशा', 'Vimshottari dasha', M, 222, width);
  s += text(`जन्म के समय ${planetHi(k.dasha.firstLord)} महादशा शेष: ${bal.years} वर्ष ${bal.months} माह ${bal.days} दिन`, M, 266, { size: 21, fill: THEME.ink, maxWidth: width });

  // Mahadasha rows with a proportional life-timeline bar.
  let y = 290; const rowH = 40;
  const t0 = k.dasha.mahadashas[0].start.getTime ? k.dasha.mahadashas[0].start.getTime() : new Date(k.dasha.mahadashas[0].start).getTime();
  const tEnd = new Date(k.dasha.mahadashas[8].end).getTime();
  const barX = M + 520; const barW = width - 520;
  for (const md of k.dasha.mahadashas) {
    const st = new Date(md.start).getTime(); const en = new Date(md.end).getTime();
    const current = st <= now && now < en;
    const past = en <= now;
    if (current) s += rect(M, y, width, rowH - 4, { fill: THEME.goldLight, opacity: 0.45, rx: 6 });
    s += text(`${planetHi(md.lord)}`, M + 14, y + 27, { size: 22, weight: 700, fill: past ? THEME.muted : THEME.ink });
    s += text(`${planetEn(md.lord)} · ${md.years}y`, M + 100, y + 27, { size: 17, fill: THEME.muted });
    s += text(`${shortDate(new Date(md.start), tz)}  –  ${shortDate(new Date(md.end), tz)}`, M + 250, y + 27, { size: 18, weight: current ? 700 : 400, fill: past ? THEME.muted : THEME.ink });
    const bx = barX + ((st - t0) / (tEnd - t0)) * barW; const bw = Math.max(3, ((en - st) / (tEnd - t0)) * barW);
    s += rect(bx, y + 11, bw, 15, { fill: current ? THEME.maroon : past ? THEME.rule : THEME.gold, rx: 4, opacity: past ? 0.8 : 1 });
    y += rowH;
  }
  // "Today" marker on the timeline.
  if (now > t0 && now < tEnd) {
    const nx = barX + ((now - t0) / (tEnd - t0)) * barW;
    s += line(nx, 290, nx, y - 4, THEME.maroon, 2);
    s += text('आज · today', nx, 286, { size: 14, weight: 600, fill: THEME.maroon, anchor: 'middle' });
  }

  // Antardashas of the current mahadasha.
  const cur = k.currentDasha;
  y += 52;
  if (cur) {
    const md = k.dasha.mahadashas.find((m) => m.lord === cur.mahadasha && new Date(m.start).getTime() <= now && now < new Date(m.end).getTime());
    s += sectionTitle(`${planetHi(md.lord)} महादशा में अंतर्दशा`, 'Antardasha now', M, y, width);
    y += 30;
    const cw = (width - 2 * 12) / 3; const chH = 56;
    md.antardashas.forEach((ad, i) => {
      const st = new Date(ad.start).getTime(); const en = new Date(ad.end).getTime();
      const isCur = st <= now && now < en; const past = en <= now;
      const x = M + (i % 3) * (cw + 12); const yy = y + Math.floor(i / 3) * (chH + 8);
      s += rect(x, yy, cw, chH, { fill: isCur ? THEME.maroon : THEME.panel, stroke: isCur ? THEME.maroon : THEME.rule, sw: 1.2, rx: 8 });
      s += text(planetHi(ad.lord), x + 14, yy + 37, { size: 22, weight: 700, fill: isCur ? '#FFF6E3' : past ? THEME.muted : THEME.ink });
      s += text(`to ${shortDate(new Date(ad.end), tz)}`, x + cw - 12, yy + 36, { size: 17, fill: isCur ? THEME.goldLight : THEME.muted, anchor: 'end' });
    });
    y += 3 * (chH + 8) + 50;
  }

  // Dosha & yoga summary.
  s += sectionTitle('दोष और योग', 'Dosha & yoga', M, y, width);
  y += 50;
  const m = k.manglik;
  const where = `मंगल लग्न से ${m.marsHouse}वें, चंद्र से ${m.marsHouseFromMoon}वें भाव में`;
  const manglikTxt = m.fromLagna && m.fromMoon ? `मांगलिक दोष: हाँ — ${where}`
    : m.fromLagna ? `मांगलिक दोष: हाँ (लग्न से) — ${where}`
      : m.fromMoon ? `मांगलिक दोष: आंशिक, केवल चंद्र से — ${where}`
        : `मांगलिक दोष: नहीं — ${where}`;
  const ks = k.kaalSarp.present ? `कालसर्प योग: हाँ — ${KAAL_SARP_HI[k.kaalSarp.type]} (राहु ${k.kaalSarp.rahuHouse}वें भाव में)` : 'कालसर्प योग: नहीं';
  const satNow = `शनि अभी ${signHi(k.sadeSati.saturnSignNow)} में`;
  const ss = k.sadeSati.running ? `साढ़ेसाती: चल रही है, चरण ${k.sadeSati.phase} (${satNow})`
    : k.sadeSati.dhaiya ? `शनि ढैय्या: चल रही है (${satNow})` : `साढ़ेसाती / ढैय्या: अभी नहीं (${satNow})`;
  const yogas = k.yogas.length ? k.yogas.map((yg) => `${YOGA_HI[yg] || yg}`).join(' · ') : 'कोई प्रमुख योग नहीं';
  for (const [i, line_] of [manglikTxt, ks, ss, `योग: ${yogas}`].entries()) {
    const yy = y + i * 36;
    s += `<circle cx="${M + 12}" cy="${yy - 7}" r="5" fill="${THEME.gold}"/>`;
    s += text(line_, M + 30, yy, { size: 21, fill: THEME.ink, maxWidth: width - 30 });
  }

  // Call to action.
  const cy = H - 176;
  s += rect(M, cy, width, 76, { fill: THEME.maroon, rx: 12 });
  s += text(reportUrl ? 'पूरी रिपोर्ट · Full report' : 'विस्तृत परामर्श · Detailed consultation', M + 26, cy + 32, { size: 19, fill: THEME.goldLight });
  s += text(reportUrl ? reportUrl.replace(/^https?:\/\//, '') : THEME.site, M + 26, cy + 63, { size: 25, weight: 700, fill: '#FFF6E3', maxWidth: width - 300 });
  s += text('DM "consult" for a reading', W - M - 26, cy + 48, { size: 19, weight: 600, fill: THEME.goldLight, anchor: 'end' });
  return frame(s, 4, { title: 'दशा · दोष · योग', titleEn: 'Dasha · Dosha · Yoga' });
}

export function allCards(k, opts = {}) {
  return [card1(k), card2(k), card3(k), card4(k, opts)];
}
