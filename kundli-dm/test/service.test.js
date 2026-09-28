import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createMemoryStore } from '../src/store/memory.js';
import { createBot } from '../src/service.js';
import { createSender } from '../src/instagram/send.js';
import { extractMessages, verifySignature, verifyChallenge } from '../src/instagram/webhook.js';
import { renderReportHtml } from '../src/report/html.js';

const webhookBody = (text, payload, mid = 'm1') => ({ object: 'instagram', entry: [{ id: 'IGACCOUNT', time: 1, messaging: [
  { sender: { id: 'USER1' }, recipient: { id: 'IGACCOUNT' }, timestamp: 1, message: { mid, text, ...(payload ? { quick_reply: { payload } } : {}) } },
  { sender: { id: 'IGACCOUNT' }, recipient: { id: 'USER1' }, timestamp: 2, message: { mid: 'echo', text: 'our reply', is_echo: true } },
] }] });

test('webhook: challenge, signature, echo filtering', () => {
  assert.equal(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 't', 'hub.challenge': '42' }, 't'), '42');
  assert.equal(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'x', 'hub.challenge': '42' }, 't'), null);
  const raw = Buffer.from(JSON.stringify(webhookBody('hi')));
  const sig = `sha256=${crypto.createHmac('sha256', 'secret').update(raw).digest('hex')}`;
  assert.ok(verifySignature(raw, sig, 'secret'));
  assert.ok(!verifySignature(raw, sig, 'wrong'));
  assert.ok(!verifySignature(raw, 'sha256=00', 'secret'));
  const msgs = extractMessages(webhookBody('hi'));
  assert.equal(msgs.length, 1); assert.equal(msgs[0].userId, 'USER1');
});

test('end to end: DM -> confirm -> 4 PNGs uploaded, report saved, Send API calls in order', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization }); return { ok: true, json: async () => ({}) }; };
  const store = createMemoryStore();
  const sender = createSender({ accessToken: 'TOKEN', fetchImpl });
  const bot = createBot({ store, sender, config: { reportBaseUrl: 'https://kaylatalk.com/k' } });

  const [m1] = extractMessages(webhookBody('Rahul Kumar, 12/03/1995, 6:45 am, Patna'));
  await bot.onMessage(m1);
  assert.match(calls[0].body.message.text, /Patna, Bihar, India/);
  assert.equal(calls[0].body.message.quick_replies[0].payload, 'CONFIRM_YES');
  assert.equal(calls[0].auth, 'Bearer TOKEN');
  assert.match(calls[0].url, /graph\.instagram\.com\/v\d+\.0\/me\/messages$/);

  const [m2] = extractMessages(webhookBody('✅ Haan, sahi hai', 'CONFIRM_YES', 'm2'));
  const out = await bot.onMessage(m2);
  const images = calls.filter((c) => c.body.message?.attachment);
  assert.equal(images.length, 4);
  assert.equal(store.uploader.files.size, 4);
  for (const buf of store.uploader.files.values()) assert.equal(buf.subarray(1, 4).toString(), 'PNG');
  const last = calls[calls.length - 1].body.message.text;
  const id = /kaylatalk\.com\/k\/([A-Za-z0-9]{12})/.exec(last)[1];
  const saved = await store.reports.get(id);
  assert.equal(saved.kundli.name, 'Rahul Kumar');
  assert.ok(out.replies.length >= 6);

  const html = renderReportHtml(saved.kundli);
  assert.match(html, /<title>Rahul Kumar/);
  assert.match(html, /noindex/);
  assert.match(html, /विंशोत्तरी/);
  assert.equal((html.match(/<svg /g) || []).length, 3);
});

test('duplicate webhook deliveries are processed once', async () => {
  const store = createMemoryStore();
  assert.equal(await store.claimMessage('m1'), true);
  assert.equal(await store.claimMessage('m1'), false);
});
