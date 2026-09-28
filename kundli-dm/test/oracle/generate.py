"""
Reference ("oracle") values from Swiss Ephemeris 2.10 — the ephemeris used by
professional astrology software, itself fitted to NASA JPL's DE431 ephemeris.

Run only when you want to regenerate test/fixtures/swisseph-reference.json:
    pip install pyswisseph
    python3 test/oracle/generate.py <path-to-folder-with-sepl_18.se1-semo_18.se1>

The fixture is committed, so `npm test` needs neither Python nor Swiss
Ephemeris. Swiss Ephemeris is AGPL/commercial; it is used here only to CHECK
our numbers, never shipped in the product.
"""
import json, random, sys
import swisseph as swe

ephe = sys.argv[1]
swe.set_ephe_path(ephe)
swe.set_sid_mode(swe.SIDM_LAHIRI)

PLACES = [
    ("Delhi", 28.6139, 77.2090), ("Mumbai", 19.0760, 72.8777), ("Patna", 25.5941, 85.1356),
    ("Chennai", 13.0827, 80.2707), ("Kolkata", 22.5726, 88.3639), ("Kathmandu", 27.7172, 85.3240),
    ("London", 51.5074, -0.1278), ("New York", 40.7128, -74.0060), ("Toronto", 43.6532, -79.3832),
    ("Sydney", -33.8688, 151.2093), ("Singapore", 1.3521, 103.8198), ("Dubai", 25.2048, 55.2708),
    ("Cape Town", -33.9249, 18.4241), ("Anchorage", 61.2181, -149.9003), ("Reykjavik", 64.1466, -21.9426),
    ("Tromso", 69.6492, 18.9553), ("Murmansk", 68.9585, 33.0827), ("Ushuaia", -54.8019, -68.3030),
]
BODIES = [("Sun", swe.SUN), ("Moon", swe.MOON), ("Mars", swe.MARS), ("Mercury", swe.MERCURY),
          ("Jupiter", swe.JUPITER), ("Venus", swe.VENUS), ("Saturn", swe.SATURN),
          ("MeanNode", swe.MEAN_NODE), ("TrueNode", swe.TRUE_NODE)]

rng = random.Random(20260928)
cases = []
jd_lo, jd_hi = swe.julday(1900, 1, 1, 0), swe.julday(2050, 12, 31, 24)
for i in range(500):
    name, lat, lon = PLACES[i % len(PLACES)]
    jd_ut = rng.uniform(jd_lo, jd_hi)
    base = swe.FLG_SWIEPH | swe.FLG_SPEED
    sid = base | swe.FLG_SIDEREAL
    c = {"place": name, "lat": lat, "lon": lon, "jdUt": jd_ut,
         "deltaTSec": swe.deltat(jd_ut) * 86400.0,
         "ayanamsaMean": swe.get_ayanamsa_ut(jd_ut),
         "ayanamsaTrue": swe.get_ayanamsa_ex_ut(jd_ut, swe.FLG_SWIEPH)[1],
         "bodies": {}}
    for bname, b in BODIES:
        xs, fl = swe.calc_ut(jd_ut, b, sid)
        if not (fl & swe.FLG_SWIEPH) and b not in (swe.MEAN_NODE,):
            raise SystemExit(f"Swiss Ephemeris files not used for {bname}; check ephe path")
        xt, _ = swe.calc_ut(jd_ut, b, base)
        c["bodies"][bname] = {"sid": xs[0], "speed": xs[3], "trop": xt[0]}
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b"W", swe.FLG_SIDEREAL)
    c["ascendantSid"] = ascmc[0]
    c["armc"] = ascmc[2]
    cases.append(c)

# Sunrise (upper limb + standard refraction, as almanacs print it) — the Hindu
# weekday (vaar) turns at sunrise, not midnight.
sunrise = []
for name, lat, lon in PLACES[:12]:
    for k in range(5):
        jd0 = swe.julday(1950 + 17 * k, 1 + (k * 5) % 12, 10, 0) - lon / 360.0  # ~local midnight
        res, tret = swe.rise_trans(jd0, swe.SUN, swe.CALC_RISE, (lon, lat, 0), 0, 0, swe.FLG_SWIEPH)
        sunrise.append({"place": name, "lat": lat, "lon": lon, "searchFromJdUt": jd0, "riseJdUt": tret[0]})

out = {"generator": f"Swiss Ephemeris {swe.version} (sepl_18/semo_18 files), Lahiri ayanamsa",
       "cases": cases, "sunrise": sunrise}
json.dump(out, open("test/fixtures/swisseph-reference.json", "w"), indent=0)
print(len(cases), "cases,", len(sunrise), "sunrise checks written")
