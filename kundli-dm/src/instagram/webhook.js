// Meta webhook plumbing for Instagram messaging.
import crypto from 'node:crypto';

/** GET verification handshake. Returns the challenge string, or null to reject. */
export function verifyChallenge(query, verifyToken) {
  if (query['hub.mode'] === 'subscribe' && verifyToken && query['hub.verify_token'] === verifyToken) return String(query['hub.challenge'] ?? '');
  return null;
}

/** X-Hub-Signature-256 check over the raw request body. */
export function verifySignature(rawBody, header, appSecret) {
  if (!header || !appSecret || !rawBody) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected); const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Flatten a webhook body into incoming user messages.
 * Skips echoes of our own sends, reads, reactions and edits.
 * @returns {{mid, userId, accountId, text, payload, hasAttachment, timestamp}[]}
 */
export function extractMessages(body) {
  const out = [];
  if (!body || (body.object !== 'instagram' && body.object !== 'page')) return out;
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const m = ev.message;
      if (!m || m.is_echo || m.is_deleted || m.is_unsupported) continue;
      if (ev.sender?.id && ev.sender.id === entry.id) continue; // our own account
      out.push({
        mid: m.mid, userId: ev.sender?.id, accountId: entry.id,
        text: typeof m.text === 'string' ? m.text : '',
        payload: m.quick_reply?.payload || null,
        hasAttachment: Array.isArray(m.attachments) && m.attachments.length > 0,
        timestamp: ev.timestamp,
      });
    }
    // Postback buttons (if you add them later) behave like quick replies.
    for (const ev of entry.messaging || []) {
      if (ev.postback?.payload && ev.sender?.id !== entry.id) {
        out.push({ mid: ev.postback.mid || `pb-${ev.timestamp}-${ev.sender?.id}`, userId: ev.sender?.id, accountId: entry.id,
          text: ev.postback.title || '', payload: ev.postback.payload, hasAttachment: false, timestamp: ev.timestamp });
      }
    }
  }
  return out.filter((x) => x.userId && x.mid);
}
