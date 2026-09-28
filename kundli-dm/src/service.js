// Wires the pieces together: conversation + kundli + cards + storage + Instagram send.
import crypto from 'node:crypto';
import { handleMessage } from './dm/conversation.js';
import { geocodeGoogle } from './dm/places.js';
import { buildKundli } from './kundli/index.js';
import { allCards } from './render/cards.js';
import { svgToPng } from './render/png.js';

// 12 chars of base62 ≈ 71 bits: report links can't be guessed.
export function reportId() {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.randomBytes(12);
  return [...bytes].map((b) => alphabet[b % 62]).join('');
}

/**
 * @param {object} o
 *   store     createMemoryStore() / createFirestoreStore()
 *   sender    createSender()  (optional for tests: replies are also returned)
 *   config    { reportBaseUrl, googleGeocodingKey?, kundli?: {node, dashaYearDays, manglikHouses}, conversation?: {...} }
 */
export function createBot({ store, sender, config = {}, log = console.error }) {
  const reportBase = (config.reportBaseUrl || 'https://kaylatalk.com/k').replace(/\/$/, '');

  async function generate(draft) {
    const id = reportId();
    const reportUrl = `${reportBase}/${id}`;
    const k = buildKundli({
      name: draft.name,
      birth: { ...draft.date, ...draft.time, second: 0 },
      place: { name: draft.place.name, lat: draft.place.lat, lon: draft.place.lon, timeZone: draft.place.timeZone },
    }, { ...(config.kundli || {}), now: new Date() });
    const svgs = allCards(k, { reportUrl });
    const imageUrls = [];
    for (let i = 0; i < svgs.length; i++) {
      imageUrls.push(await store.uploader.upload(`kundli/${id}/card-${i + 1}.png`, svgToPng(svgs[i]), 'image/png'));
    }
    await store.reports.save(id, { kundli: JSON.parse(JSON.stringify(k)), imageUrls });
    return { imageUrls, reportUrl, id };
  }

  /** Handle one incoming Instagram message end to end. Returns the replies sent. */
  async function onMessage(m) {
    return store.withUserLock(m.userId, async () => {
      if (m.hasAttachment && !m.text && !m.payload) return { replies: [] }; // photos/voice: leave for a human
      const deps = {
        sessions: store.sessions, usage: store.usage, generate, log,
        config: config.conversation,
        geocode: config.googleGeocodingKey ? (q) => geocodeGoogle(q, config.googleGeocodingKey) : undefined,
        onWorking: sender ? async (msg) => { await sender.text(m.userId, msg.text); await sender.typing(m.userId); } : undefined,
      };
      const out = await handleMessage({ userId: m.userId, text: m.text, payload: m.payload }, deps);
      if (sender && out.replies.length) await sender.replies(m.userId, out.replies);
      return out;
    });
  }

  return { onMessage, generate };
}
