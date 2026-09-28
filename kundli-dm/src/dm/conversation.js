// The DM conversation as a pure state machine: (session, message) -> (session, replies).
// No network or storage here — everything comes in through `deps`, so the
// whole flow is unit-tested with plain objects.
import { parseBirthDetails, isYes, isNo, isCancel, wantsKundli, amPmReply } from './parse.js';
import { lookupPlace } from './places.js';
import { M } from './messages.js';

export const DEFAULTS = {
  sessionTtlMs: 24 * 3600e3,
  maxPerDay: 3,
  countryBias: 'IN',
  consultText: '🙏 Dhanyavaad! Hamare jyotishacharya jald hi aapse yahin DM me baat karenge.',
};

const FIELDS = ['name', 'date', 'time', 'place'];

function missingFields(d) {
  return FIELDS.filter((f) => (f === 'place' ? !d.place && !d.placeQuery : !d[f]));
}

async function resolvePlace(draft, deps, cfg) {
  let r = lookupPlace(draft.placeQuery, { countryBias: cfg.countryBias });
  if (r.status === 'not_found' && deps.geocode) {
    try { r = await deps.geocode(draft.placeQuery); } catch (e) { deps.log?.('geocode failed', e); }
  }
  return r;
}

function sane(date, now) {
  const t = Date.UTC(date.year, date.month - 1, date.day);
  return date.year >= 1900 && t <= now.getTime() + 86400e3;
}

/**
 * @param {{userId:string, text?:string, payload?:string}} msg
 * @param {object} deps { sessions:{get,set,delete}, usage:{count,add}, generate(draft)->{imageUrls,reportUrl},
 *                        now()->Date, geocode?(q), log?(...) , config? }
 * @returns {Promise<{replies:object[], handoff?:boolean}>}
 */
export async function handleMessage(msg, deps) {
  const cfg = { ...DEFAULTS, ...(deps.config || {}) };
  const now = deps.now ? deps.now() : new Date();
  const text = (msg.payload || msg.text || '').trim();
  let s = await deps.sessions.get(msg.userId);
  if (s && now.getTime() - s.updatedAt > cfg.sessionTtlMs) { await deps.sessions.delete(msg.userId); s = null; }

  const save = async (next) => { next.updatedAt = now.getTime(); await deps.sessions.set(msg.userId, next); };
  const reply = (...r) => ({ replies: r });

  if (/^\s*(consult|consultation|paramarsh|परामर्श)\s*$/i.test(text)) {
    return { replies: [M.consult(cfg.consultText)], handoff: true };
  }
  if (!text) return reply();
  if (isCancel(text)) {
    if (!s) return reply();
    await deps.sessions.delete(msg.userId);
    return reply(M.cancelled());
  }

  const parsed = parseBirthDetails(text);
  if (!s || s.stage === 'done') {
    const looksLikeDetails = parsed.date && (parsed.time || parsed.place);
    if (!wantsKundli(text) && !looksLikeDetails) return reply(); // ordinary DM: leave it to a human
    s = { stage: 'collecting', draft: {} };
    if (!looksLikeDetails && !parsed.date && !parsed.time) { await save(s); return reply(M.askAll()); }
  }
  const d = s.draft;

  // Stage-specific answers first.
  if (s.stage === 'choosePlace') {
    const m = /^(?:PLACE_)?(\d)\b/.exec(text);
    const i = m ? +m[1] - (text.startsWith('PLACE_') ? 0 : 1) : -1;
    if (i >= 0 && i < s.options.length) {
      d.place = s.options[i]; s.options = null; s.stage = 'collecting';
    } else if (!parsed.date && !parsed.time) {
      d.placeQuery = text; d.place = null; s.stage = 'collecting';
    }
  } else if (s.stage === 'askAmPm') {
    const ap = msg.payload === 'AMPM_AM' ? 'am' : msg.payload === 'AMPM_PM' ? 'pm' : amPmReply(text);
    if (ap && !parsed.time) {
      d.time = { hour: ap === 'am' ? d.time.hour % 12 : (d.time.hour % 12) + 12, minute: d.time.minute };
      d.needsAmPm = false; s.stage = 'collecting';
    }
  } else if (s.stage === 'confirm') {
    if (msg.payload === 'CONFIRM_YES' || (isYes(text) && !parsed.date && !parsed.time)) {
      return generate(s, d);
    }
    if (msg.payload === 'CONFIRM_NO' || (isNo(text) && !parsed.date && !parsed.time && !parsed.place)) {
      s.stage = 'collecting'; await save(s);
      return reply(M.askCorrection());
    }
    s.stage = 'collecting';
  }

  // Merge whatever this message carried.
  if (s.stage === 'collecting' && !(msg.payload || '').startsWith('PLACE_') && !(msg.payload || '').startsWith('AMPM_')) {
    // A bare word while we wait for just the name is the name, not a place.
    if (s.expect?.length === 1 && s.expect[0] === 'name' && parsed.place && !parsed.name && !parsed.date && !parsed.time) {
      parsed.name = parsed.place; delete parsed.place;
    }
    if (parsed.name) d.name = parsed.name;
    if (parsed.date) { d.date = parsed.date; d.dateAmbiguous = !!parsed.dateAmbiguous; }
    if (parsed.time) { d.time = parsed.time; d.needsAmPm = !!parsed.needsAmPm; }
    if (parsed.place && (!d.place || parsed.place !== d.placeQuery)) { d.placeQuery = parsed.place; d.place = null; }
  }

  if (d.date && !sane(d.date, now)) { d.date = null; await save(s); return reply(M.badDate()); }

  if (d.placeQuery && !d.place) {
    const r = await resolvePlace(d, deps, cfg);
    if (r.status === 'found') d.place = r.place;
    else if (r.status === 'ambiguous') {
      s.stage = 'choosePlace'; s.options = r.options.slice(0, 9); await save(s);
      return reply(M.choosePlace(s.options));
    } else {
      const q = d.placeQuery; d.placeQuery = null; s.expect = ['place']; await save(s);
      return reply(M.placeNotFound(q));
    }
  }

  if (d.time && d.needsAmPm) { s.stage = 'askAmPm'; await save(s); return reply(M.askAmPm(d.time)); }

  const missing = missingFields(d);
  if (missing.length) { s.expect = missing; s.stage = 'collecting'; await save(s); return reply(M.askMissing(missing)); }

  s.stage = 'confirm'; s.expect = null; await save(s);
  return reply(M.confirm(d));

  async function generate(sess, draft) {
    const used = deps.usage ? await deps.usage.count(msg.userId, now) : 0;
    if (used >= cfg.maxPerDay) { sess.stage = 'done'; await save(sess); return reply(M.limit(cfg.maxPerDay)); }
    await deps.onWorking?.(M.working(draft.name));
    try {
      const out = await deps.generate(draft);
      await deps.usage?.add(msg.userId, now);
      sess.stage = 'done'; sess.lastReport = out.reportUrl; await save(sess);
      return reply(M.ready(draft.name), ...out.imageUrls.map((url) => ({ imageUrl: url })), M.report(out.reportUrl));
    } catch (e) {
      deps.log?.('generate failed', e);
      await save(sess);
      return reply(M.error());
    }
  }
}
