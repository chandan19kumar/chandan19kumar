// One Instagram comment -> the actions to take. Pure: all I/O comes via `deps`.
import { parseBirthDetails, wantsKundli } from '../dm/parse.js';

const pick = (arr, seed) => arr[Math.abs([...String(seed)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % arr.length];

// Varied wording: identical replies on every comment look like a bot to Instagram.
const THANKS = [
  'Bahut dhanyavaad 🙏✨', 'Aapka pyaar yun hi bana rahe 🙏', 'Dil se shukriya ✨', 'Dhanyavaad ji 🙏 Judte rahiye!',
  'Aapka aashirwaad bana rahe 🙏', 'Shukriya! Aise hi saath rahiye ✨',
];
const KUNDLI_PUBLIC = [
  'Aapko DM kiya hai 🙏 Inbox check kijiye, wahin free kundli milegi ✨',
  'Details ke liye DM check kijiye 🙏 Kundli wahin banegi ✨',
  'Inbox me message bheja hai 🙏 Wahin aapki kundli taiyaar hogi ✨',
];

// Pictographs, skin tones, joiners, variation selectors, flags. Not \p{Emoji_Component}: that includes digits.
const EMOJI_ONLY = /^(?=.*\p{Extended_Pictographic})[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\s‍️⃣!.]+$/u;
const PRAISE_SHORT = /^\s*(nice|wow|great|super|amazing|awesome|true|right|sahi|sach|bilkul|jai mata di|jai shree ram|jai shri ram|har har mahadev|radhe radhe|om namah shivay|thanks|thank you|thank u|dhanyavaad|shukriya|very nice|so true|🙏)[\s!.🙏❤️✨]*$/i;

function birthLine(p) {
  const bits = [];
  if (p.name) bits.push(p.name);
  if (p.date) bits.push(`${String(p.date.day).padStart(2, '0')}/${String(p.date.month).padStart(2, '0')}/${p.date.year}`);
  if (p.time) bits.push(`${p.time.hour % 12 === 0 ? 12 : p.time.hour % 12}:${String(p.time.minute).padStart(2, '0')}${p.needsAmPm ? '' : p.time.hour < 12 ? ' AM' : ' PM'}`);
  if (p.place) bits.push(p.place);
  return bits.join(', ');
}

export function kundliDm(parsed, username) {
  const line = parsed && (parsed.date || parsed.time) ? birthLine(parsed) : '';
  return `Namaste${username ? ` ${username}` : ''} 🙏 Aapki FREE janm kundli yahin DM me banegi.\n\n`
    + (line
      ? `Bas ye line copy karke yahin bhej dijiye (kuch galat ho to sahi kar dijiye):\n\n${line}\n\n`
      : 'Ek message me bhejiye: Naam, janm tithi, janm samay (AM/PM), janm sthan.\nJaise: Rahul Kumar, 12/03/1995, 6:45 AM, Patna Bihar\n\n')
    + '🔒 Aapki details sirf kundli ke liye use hongi.';
}

/**
 * @param {{id, text, userId, username, mediaId, parentId?}} c
 * @param {{ownUserIds:string[], ownUsername?:string, getCaption(mediaId)->Promise<string>, brain?(input)->Promise<decision|null>,
 *          recentReplies?(userId, mediaId)->Promise<number>, maxRepliesPerUserPerPost?: number}} deps
 * @returns {Promise<{actions: {type:'publicReply'|'privateReply'|'flag', text?:string, reason?:string}[], category:string}>}
 */
export async function handleComment(c, deps) {
  const text = (c.text || '').trim();
  const actions = [];
  const own = (deps.ownUserIds || []).includes(c.userId)
    || (deps.ownUsername && String(c.username || '').toLowerCase() === deps.ownUsername.toLowerCase());
  if (own || !text) return { actions, category: 'skip' };

  if (deps.recentReplies) {
    const n = await deps.recentReplies(c.userId, c.mediaId);
    if (n >= (deps.maxRepliesPerUserPerPost ?? 2)) return { actions, category: 'throttled' };
  }

  // Birth details or a kundli request: DM them, never echo details publicly.
  const parsed = parseBirthDetails(text);
  const hasDetails = !!(parsed.date && (parsed.time || parsed.place));
  if (hasDetails || wantsKundli(text)) {
    actions.push({ type: 'publicReply', text: pick(KUNDLI_PUBLIC, c.id) });
    actions.push({ type: 'privateReply', text: kundliDm(hasDetails ? parsed : null, c.username) });
    return { actions, category: 'kundli_request' };
  }

  // Emoji-only or a one-line blessing: thank them, no model call.
  if (EMOJI_ONLY.test(text) || PRAISE_SHORT.test(text)) {
    actions.push({ type: 'publicReply', text: pick(THANKS, c.id) });
    return { actions, category: 'praise' };
  }

  if (!deps.brain) return { actions, category: 'unhandled' };
  const caption = deps.getCaption ? await deps.getCaption(c.mediaId).catch(() => '') : '';
  const d = await deps.brain({ caption, text, username: c.username });
  if (!d) return { actions: [{ type: 'flag', reason: 'no decision' }], category: 'error' };
  const reply = (d.reply || '').trim().slice(0, 300);
  if (reply && !['spam', 'abuse'].includes(d.category)) actions.push({ type: 'publicReply', text: reply });
  if (d.invite_dm && !['spam', 'abuse'].includes(d.category)) actions.push({ type: 'privateReply', text: kundliDm(null, c.username) });
  if (d.needs_human) actions.push({ type: 'flag', reason: d.category });
  return { actions, category: d.category };
}

/** Pull comment events out of an Instagram webhook body. */
export function extractComments(body) {
  const out = [];
  if (!body || body.object !== 'instagram') return out;
  for (const entry of body.entry || []) {
    for (const ch of entry.changes || []) {
      if (ch.field !== 'comments' || !ch.value?.id) continue;
      const v = ch.value;
      out.push({ id: v.id, text: v.text || '', userId: v.from?.id, username: v.from?.username, mediaId: v.media?.id,
        parentId: v.parent_id || null, accountId: entry.id });
    }
  }
  return out;
}
