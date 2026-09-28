// Full kundli report as a standalone, mobile-first web page (the link sent in DM).
import { THEME } from '../render/theme.js';
import { withTextMode, esc } from '../render/svg.js';
import { northIndianChart } from '../render/chart.js';
import { PLANET_NAMES } from '../astro/constants.js';
import {
  dms, birthDateLong, birthTime12, offsetLabel, shortDate, clockTime, signHi, signEn, nakHi, nakEn, planetHi, planetEn, hi, latLon,
} from '../render/format.js';
import { splitYears } from '../kundli/dasha.js';

function chartSvg(k, houseSignOf, placeOf, lagnaLabel, extra) {
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: houseSignOf(i + 1), items: [] }));
  if (lagnaLabel) houses[0].items.push({ text: lagnaLabel, color: THEME.maroonSoft });
  if (extra) extra(houses);
  for (const p of k.planets) {
    const flags = `${p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' ? '(व)' : ''}${p.combust ? '(अ)' : ''}`;
    const deg = placeOf.showDeg ? ` ${Math.floor(p.degreeInSign)}°` : '';
    houses[placeOf(p) - 1].items.push({ text: `${PLANET_NAMES[p.name].short}${flags}${deg}`,
      color: p.dignity === 'Exalted' ? THEME.good : p.dignity === 'Debilitated' ? THEME.warn : THEME.ink });
  }
  const S = 600;
  const inner = withTextMode('text', () => northIndianChart(S, houses, { fontSize: placeOf.showDeg ? 21 : 22 }));
  return `<svg viewBox="-2 -2 ${S + 4} ${S + 4}" role="img" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export function renderReportHtml(k, { siteUrl = `https://${THEME.site}`, brand = THEME.brand } = {}) {
  const b = k.birth; const tz = k.place.timeZone; const a = k.avakhada; const pan = k.panchang;
  const now = new Date(k.generatedAt).getTime();
  const d1 = chartSvg(k, (h) => (k.lagna.sign + h - 1) % 12, Object.assign((p) => p.house, { showDeg: true }), `ल ${Math.floor(k.lagna.degreeInSign)}°`);
  const d9 = chartSvg(k, (h) => (k.lagna.navamsa + h - 1) % 12, (p) => ((p.navamsa - k.lagna.navamsa + 12) % 12) + 1, 'ल');
  const moon = chartSvg(k, (h) => (a.rashi + h - 1) % 12, (p) => p.houseFromMoon, null,
    (houses) => houses[(k.lagna.sign - a.rashi + 12) % 12].items.push({ text: 'ल', color: THEME.maroonSoft }));

  const rows = [{ lagna: true }, ...k.planets].map((r) => {
    const sign = r.lagna ? k.lagna.sign : r.sign; const deg = r.lagna ? k.lagna.degreeInSign : r.degreeInSign;
    const nak = r.lagna ? k.lagna.nakshatra : r.nakshatra; const pada = r.lagna ? k.lagna.nakshatraPada : r.nakshatraPada;
    const flags = r.lagna ? '' : `${r.retrograde && !['Rahu', 'Ketu'].includes(r.name) ? '<span class="pill" title="Retrograde">व</span>' : ''}${r.combust ? '<span class="pill" title="Combust">अ</span>' : ''}`;
    const dig = r.lagna || !r.dignity ? '—' : `<span class="dig ${r.dignity.toLowerCase()}">${hi(r.dignity)}</span><small>${r.dignity}</small>`;
    return `<tr><td><b>${r.lagna ? 'लग्न' : planetHi(r.name)}</b>${flags}<small>${r.lagna ? 'Ascendant' : planetEn(r.name)}</small></td>
      <td><b>${signHi(sign)}</b><small>${signEn(sign)}</small></td><td class="num">${dms(deg)}</td>
      <td><b>${nakHi(nak)} ${pada}</b><small>${nakEn(nak)}${r.lagna ? '' : ` · ${r.nakshatraLord}`}</small></td>
      <td class="num"><b>${r.lagna ? 1 : r.house}</b></td><td>${dig}</td></tr>`;
  }).join('');

  const bal = splitYears(k.dasha.balanceYears, k.dasha.yearDays);
  const dashaHtml = k.dasha.mahadashas.map((md) => {
    const st = new Date(md.start).getTime(); const en = new Date(md.end).getTime();
    const cur = st <= now && now < en;
    const ads = md.antardashas.map((ad) => {
      const s2 = new Date(ad.start).getTime(); const e2 = new Date(ad.end).getTime();
      return `<li class="${s2 <= now && now < e2 ? 'now' : ''}"><b>${planetHi(ad.lord)}</b> <span>${shortDate(new Date(ad.start), tz)} – ${shortDate(new Date(ad.end), tz)}</span></li>`;
    }).join('');
    return `<details${cur ? ' open' : ''} class="${cur ? 'now' : en <= now ? 'past' : ''}"><summary><b>${planetHi(md.lord)}</b> ${planetEn(md.lord)} · ${md.years} वर्ष <span>${shortDate(new Date(md.start), tz)} – ${shortDate(new Date(md.end), tz)}</span></summary><ul>${ads}</ul></details>`;
  }).join('');

  const m = k.manglik;
  const manglik = m.fromLagna && m.fromMoon ? 'हाँ' : m.fromLagna ? 'हाँ (लग्न से)' : m.fromMoon ? 'आंशिक — केवल चंद्र से' : 'नहीं';
  const kv = (rowsKv) => rowsKv.map(([k1, v]) => `<div><dt>${k1}</dt><dd>${v}</dd></div>`).join('');

  return `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(k.name)} · जन्म कुंडली · ${esc(brand)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Serif+Devanagari:wght@600&display=swap" rel="stylesheet">
<style>
:root{--paper:${THEME.paper};--deep:${THEME.paperDeep};--panel:${THEME.panel};--ink:${THEME.ink};--muted:${THEME.muted};--maroon:${THEME.maroon};--gold:${THEME.gold};--goldl:${THEME.goldLight};--rule:${THEME.rule};--good:${THEME.good};--warn:${THEME.warn}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 "Noto Sans Devanagari",system-ui,sans-serif}
header{background:var(--maroon);color:#FFF6E3;padding:22px 16px}header .in{max-width:980px;margin:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.brand{font:700 34px/1 "Cormorant Garamond",serif;color:var(--goldl)}.brand small{display:block;font:600 11px/1.8 "Noto Sans Devanagari";letter-spacing:.3em;opacity:.85}
header h1{margin:0;font:600 26px "Noto Serif Devanagari",serif}
main{max-width:980px;margin:auto;padding:20px 16px 40px}
.who{text-align:center;margin:10px 0 18px}.who h2{font:700 38px/1.15 "Cormorant Garamond","Noto Serif Devanagari",serif;margin:0 0 6px}.who p{margin:2px 0;color:var(--muted)}
.chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 26px}.chip{background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:10px;text-align:center}
.chip span{display:block;font-size:12px;color:var(--muted);font-weight:600}.chip b{display:block;font-size:24px;color:var(--maroon)}.chip small{color:var(--ink)}
h3{font:600 22px "Noto Serif Devanagari",serif;color:var(--maroon);border-bottom:1.5px solid var(--gold);padding-bottom:6px;margin:30px 0 14px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
h3 small{font:600 11px "Noto Sans Devanagari";letter-spacing:.2em;color:var(--gold);text-transform:uppercase}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.charts figure{margin:0}.charts figcaption{font-weight:600;color:var(--maroon);margin-bottom:6px}
svg{width:100%;height:auto;display:block}
.tbl{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:620px}th{background:var(--maroon);color:#FFF6E3;text-align:left;font-weight:600;padding:8px 10px}
td{padding:8px 10px;border-bottom:1px solid var(--rule);vertical-align:top}tr:nth-child(odd) td{background:rgba(243,232,210,.45)}td small{display:block;color:var(--muted);font-size:13px}td.num{font-weight:600;white-space:nowrap}
.pill{display:inline-block;margin-left:6px;background:#8A3348;color:#FFF6E3;border-radius:99px;font-size:12px;padding:0 7px;vertical-align:2px}
.dig.exalted,.dig.moolatrikona,.dig.own{color:var(--good);font-weight:600}.dig.debilitated,.dig.enemy{color:var(--warn);font-weight:600}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}dl{margin:0}dl div{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--rule)}dt{color:var(--muted)}dd{margin:0;font-weight:600;text-align:right}
details{border:1px solid var(--rule);border-radius:8px;margin:6px 0;background:var(--panel)}details.now{border-color:var(--maroon);box-shadow:0 0 0 2px var(--goldl)}details.past{opacity:.7}
summary{cursor:pointer;padding:10px 12px}summary span{float:right;color:var(--muted);font-size:14px}ul{list-style:none;margin:0;padding:0 12px 10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 16px}
li{padding:4px 6px;border-radius:6px}li span{color:var(--muted);font-size:14px;float:right}li.now{background:var(--maroon);color:#FFF6E3}li.now span{color:var(--goldl)}
.note{color:var(--muted);font-size:14px}.cta{margin-top:30px;background:var(--maroon);color:#FFF6E3;border-radius:12px;padding:18px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}.cta a{color:var(--goldl);font-weight:700}
footer{max-width:980px;margin:auto;padding:0 16px 30px;color:var(--muted);font-size:13px}
</style>
</head>
<body>
<header><div class="in"><div class="brand">${esc(brand)}<small>VEDIC JYOTISH</small></div><h1>जन्म कुंडली</h1></div></header>
<main>
<section class="who"><h2>${esc(k.name)}</h2>
<p>${birthDateLong(b)} · ${birthTime12(b)} (${offsetLabel(b.offsetMinutes)})</p>
<p>${esc(k.place.name)} · ${latLon(k.place.lat, k.place.lon)} · ${esc(tz)}</p></section>
<div class="chips">
<div class="chip"><span>लग्न · Lagna</span><b>${signHi(k.lagna.sign)}</b><small>${signEn(k.lagna.sign)} ${dms(k.lagna.degreeInSign)}</small></div>
<div class="chip"><span>राशि · Moon sign</span><b>${signHi(a.rashi)}</b><small>${signEn(a.rashi)}</small></div>
<div class="chip"><span>नक्षत्र · Nakshatra</span><b>${nakHi(a.nakshatra)}-${a.pada}</b><small>${nakEn(a.nakshatra)}</small></div>
<div class="chip"><span>नामाक्षर · Name sound</span><b>${a.naamakshar}</b><small>Sun sign ${signEn(a.sunSign)}</small></div>
</div>

<h3>कुंडली <small>Charts</small></h3>
<div class="charts">
<figure><figcaption>लग्न कुंडली · D1</figcaption>${d1}</figure>
<figure><figcaption>नवांश · D9</figcaption>${d9}</figure>
<figure><figcaption>चंद्र कुंडली · Moon chart</figcaption>${moon}</figure>
</div>
<p class="note">ल = लग्न · (व) = वक्री / retrograde · (अ) = अस्त / combust · हरा = उच्च · लाल = नीच</p>

<h3>ग्रह स्पष्ट <small>Planet details</small></h3>
<div class="tbl"><table><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र · पद</th><th>भाव</th><th>स्थिति</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">अयनांश (लाहिड़ी): ${dms(k.ayanamsa, { seconds: true })} · राहु/केतु: ${k.settings.node === 'true' ? 'true node' : 'mean node'} · भाव: whole sign</p>

<div class="cols">
<section><h3>पंचांग <small>At birth</small></h3><dl>${kv([
    ['तिथि · Tithi', `${pan.tithi.hi} (${hi(pan.tithi.paksha)})`], ['वार · Day', `${pan.vaar.hi}${pan.vaar.beforeSunrise ? ' *' : ''}`],
    ['नक्षत्र · Nakshatra', `${nakHi(a.nakshatra)} ${a.pada}`], ['योग · Yoga', pan.yoga.hi], ['करण · Karana', pan.karana.hi],
    ['सूर्योदय · Sunrise', pan.sunrise ? clockTime(new Date(pan.sunrise), tz) : '—'], ['सूर्यास्त · Sunset', pan.sunset ? clockTime(new Date(pan.sunset), tz) : '—'],
  ])}</dl>${pan.vaar.beforeSunrise ? '<p class="note">* जन्म सूर्योदय से पहले हुआ, इसलिए हिंदू वार पिछले दिन का है।</p>' : ''}</section>
<section><h3>अवकहड़ा चक्र <small>Avakhada</small></h3><dl>${kv([
    ['वर्ण · Varna', hi(a.varna)], ['वश्य · Vashya', hi(a.vashya)], ['योनि · Yoni', hi(a.yoni)], ['गण · Gana', hi(a.gana)],
    ['नाड़ी · Nadi', hi(a.nadi)], ['तत्व · Tatva', hi(a.tatva)], ['राशि स्वामी · Rashi lord', planetHi(a.rashiLord)], ['नक्षत्र स्वामी · Nakshatra lord', planetHi(a.nakshatraLord)],
  ])}</dl></section>
</div>

<h3>विंशोत्तरी दशा <small>Mahadasha · Antardasha</small></h3>
<p>जन्म के समय <b>${planetHi(k.dasha.firstLord)}</b> महादशा शेष: ${bal.years} वर्ष ${bal.months} माह ${bal.days} दिन</p>
${dashaHtml}

<h3>दोष और योग <small>Dosha &amp; yoga</small></h3>
<dl>${kv([
    ['मांगलिक दोष', `${manglik} <small>(मंगल लग्न से ${m.marsHouse}, चंद्र से ${m.marsHouseFromMoon} भाव)</small>`],
    ['कालसर्प योग', k.kaalSarp.present ? `हाँ — ${k.kaalSarp.type}` : 'नहीं'],
    ['साढ़ेसाती / ढैय्या', k.sadeSati.running ? `साढ़ेसाती चल रही है (चरण ${k.sadeSati.phase})` : k.sadeSati.dhaiya ? 'ढैय्या चल रही है' : `अभी नहीं (शनि ${signHi(k.sadeSati.saturnSignNow)} में)`],
    ['प्रमुख योग', k.yogas.length ? k.yogas.join(', ') : '—'],
  ])}</dl>

<div class="cta"><div><b>कुंडली का विस्तृत फलादेश चाहिए?</b><br>हमारे ज्योतिषाचार्य से परामर्श करें।</div><a href="${esc(siteUrl)}">${esc(siteUrl.replace(/^https?:\/\//, ''))} →</a></div>
</main>
<footer>
<p>गणना: लाहिड़ी अयनांश, सायन-से-निरयन, whole-sign भाव, विंशोत्तरी वर्ष ${k.dasha.yearDays} दिन। ग्रह स्थिति Astronomy Engine से, और Swiss Ephemeris (NASA JPL DE431 आधारित) से 500 जन्म-तिथियों पर मिलान करके जाँची गई है — अधिकतम अंतर 30 विकला (arc-second) से कम।</p>
<p>स्थान डेटा: GeoNames (CC BY 4.0)। यह रिपोर्ट ${shortDate(new Date(k.generatedAt), tz)} को बनी। ज्योतिष मार्गदर्शन है, चिकित्सा/कानूनी/वित्तीय सलाह नहीं।</p>
</footer>
</body>
</html>`;
}
