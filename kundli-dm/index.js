// Firebase Cloud Functions (2nd gen) entry point.
//
//   instagramWebhook        Meta calls this. Verifies the signature, queues each
//                           message in Firestore, answers 200 in well under a second.
//   processInstagramMessage Firestore trigger: runs the conversation and replies.
//   kundliReport            GET /k/<id> -> full report page (map kaylatalk.com/k/** to it).
//
//   processInstagramComment Firestore trigger: reads the post caption + comment, replies
//                           publicly and/or privately (DM) — see src/comments/.
//
// Secrets (firebase functions:secrets:set NAME):
//   IG_APP_SECRET, IG_VERIFY_TOKEN, IG_ACCESS_TOKEN, ANTHROPIC_API_KEY, GOOGLE_GEOCODING_KEY (optional)
// Params (.env): IG_API_BASE, IG_SENDER_ID, REPORT_BASE_URL, KUNDLI_NODE, BOT_MAX_PER_DAY,
//                COMMENT_MODE (auto|draft), BRAND_NOTES
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString, defineInt } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { verifyChallenge, verifySignature, extractMessages } from './src/instagram/webhook.js';
import { createSender } from './src/instagram/send.js';
import { createFirestoreStore } from './src/store/firestore.js';
import { createBot } from './src/service.js';
import { renderReportHtml } from './src/report/html.js';
import { extractComments } from './src/comments/handle.js';
import { createCommentBrain } from './src/comments/brain.js';
import { createCommentBot } from './src/comments/service.js';

initializeApp();

const IG_APP_SECRET = defineSecret('IG_APP_SECRET');
const IG_VERIFY_TOKEN = defineSecret('IG_VERIFY_TOKEN');
const IG_ACCESS_TOKEN = defineSecret('IG_ACCESS_TOKEN');
const GOOGLE_GEOCODING_KEY = defineSecret('GOOGLE_GEOCODING_KEY');
const IG_API_BASE = defineString('IG_API_BASE', { default: 'https://graph.instagram.com/v23.0' });
const IG_SENDER_ID = defineString('IG_SENDER_ID', { default: 'me' });
const REPORT_BASE_URL = defineString('REPORT_BASE_URL', { default: 'https://www.kaylatalk.com/k' });
const KUNDLI_NODE = defineString('KUNDLI_NODE', { default: 'mean' });
const BOT_MAX_PER_DAY = defineInt('BOT_MAX_PER_DAY', { default: 3 });
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const COMMENT_MODE = defineString('COMMENT_MODE', { default: 'auto' });
const BRAND_NOTES = defineString('BRAND_NOTES', { default: '' });
const IG_USERNAME = defineString('IG_USERNAME', { default: 'kaylatalkjyotish' });

const REGION = 'asia-south1'; // Mumbai: closest to most users

let store;
const getStore = () => (store ||= createFirestoreStore({ db: getFirestore(), bucket: getStorage().bucket() }));

export const instagramWebhook = onRequest({ region: REGION, secrets: [IG_APP_SECRET, IG_VERIFY_TOKEN], memory: '256MiB' }, async (req, res) => {
  if (req.method === 'GET') {
    const challenge = verifyChallenge(req.query, IG_VERIFY_TOKEN.value());
    if (challenge === null) { res.sendStatus(403); return; }
    res.status(200).send(challenge);
    return;
  }
  if (req.method !== 'POST') { res.sendStatus(405); return; }
  if (!verifySignature(req.rawBody, req.get('x-hub-signature-256'), IG_APP_SECRET.value())) {
    logger.warn('bad webhook signature');
    res.sendStatus(401);
    return;
  }
  const s = getStore();
  for (const m of extractMessages(req.body)) {
    // create() fails on a duplicate id: Meta's retries are dropped here.
    await s.claimMessage(m.mid, { message: m });
  }
  for (const c of extractComments(req.body)) {
    await s.comments.claim(c.id, { comment: c });
  }
  res.sendStatus(200);
});

export const processInstagramMessage = onDocumentCreated({
  document: 'kundliDmInbox/{mid}', region: REGION, memory: '1GiB', timeoutSeconds: 120,
  secrets: [IG_ACCESS_TOKEN, GOOGLE_GEOCODING_KEY], retry: false,
}, async (event) => {
  const m = event.data?.data()?.message;
  if (!m) return;
  const sender = createSender({ accessToken: IG_ACCESS_TOKEN.value(), apiBase: IG_API_BASE.value(), senderId: IG_SENDER_ID.value(), log: (...a) => logger.error(...a) });
  const bot = createBot({
    store: getStore(), sender, log: (...a) => logger.error(...a),
    config: {
      reportBaseUrl: REPORT_BASE_URL.value(),
      googleGeocodingKey: GOOGLE_GEOCODING_KEY.value() || undefined,
      kundli: { node: KUNDLI_NODE.value() },
      conversation: { maxPerDay: BOT_MAX_PER_DAY.value() },
    },
  });
  try {
    const out = await bot.onMessage(m);
    if (out.handoff) logger.info('consult requested', { userId: m.userId });
  } catch (e) {
    logger.error('message failed', { mid: m.mid, error: e.message, stack: e.stack });
  }
});

export const kundliReport = onRequest({ region: REGION, memory: '512MiB' }, async (req, res) => {
  const id = (req.path.match(/([A-Za-z0-9]{12})\/?$/) || [])[1];
  const doc = id && await getStore().reports.get(id);
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (!doc) { res.status(404).send('<!doctype html><meta charset="utf-8"><title>Not found</title><p style="font-family:sans-serif;padding:24px">यह रिपोर्ट उपलब्ध नहीं है (link expired). कृपया Instagram पर दोबारा "kundli" लिखें।</p>'); return; }
  res.set('Cache-Control', 'private, max-age=3600');
  res.status(200).send(renderReportHtml(doc.kundli));
});

export const processInstagramComment = onDocumentCreated({
  document: 'kundliCommentInbox/{commentId}', region: REGION, memory: '512MiB', timeoutSeconds: 60,
  secrets: [IG_ACCESS_TOKEN, ANTHROPIC_API_KEY], retry: false,
}, async (event) => {
  const c = event.data?.data()?.comment;
  if (!c) return;
  const log = (...a) => logger.error(...a);
  const sender = createSender({ accessToken: IG_ACCESS_TOKEN.value(), apiBase: IG_API_BASE.value(), senderId: IG_SENDER_ID.value(), log });
  const bot = createCommentBot({
    store: getStore(), sender, log,
    brain: createCommentBrain({ brandNotes: BRAND_NOTES.value(), log }),
    config: { mode: COMMENT_MODE.value(), ownUsername: IG_USERNAME.value() },
  });
  try {
    const out = await bot.onComment(c);
    logger.info('comment handled', { id: c.id, category: out.category, actions: out.actions.map((a) => `${a.type}:${a.posted}`) });
  } catch (e) {
    logger.error('comment failed', { id: c.id, error: e.message, stack: e.stack });
  }
});
