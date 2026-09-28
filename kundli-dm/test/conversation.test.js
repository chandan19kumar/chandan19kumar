import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../src/dm/conversation.js';

function harness(overrides = {}) {
  const sessions = new Map(); const counts = new Map(); const generated = [];
  const deps = {
    sessions: { get: async (u) => (sessions.has(u) ? structuredClone(sessions.get(u)) : null), set: async (u, s) => sessions.set(u, structuredClone(s)), delete: async (u) => sessions.delete(u) },
    usage: { count: async (u) => counts.get(u) || 0, add: async (u) => counts.set(u, (counts.get(u) || 0) + 1) },
    generate: async (draft) => { generated.push(draft); return { imageUrls: ['https://x/1.png', 'https://x/2.png', 'https://x/3.png', 'https://x/4.png'], reportUrl: 'https://kaylatalk.com/k/abc' }; },
    now: () => new Date('2026-09-28T06:00:00Z'),
    ...overrides,
  };
  const say = async (text, payload) => (await handleMessage({ userId: 'u1', text, payload }, deps)).replies;
  return { say, generated, sessions, deps };
}
const texts = (r) => r.map((x) => x.text || x.imageUrl).join('\n---\n');

test('ordinary DMs are ignored (a human answers those)', async () => {
  const { say } = harness();
  assert.deepEqual(await say('Hi, what are your consultation charges?'), []);
});

test('one-shot message -> confirm -> kundli with 4 images and report link', async () => {
  const { say, generated } = harness();
  const r1 = await say('Rahul Kumar, 12/03/1995, 6:45 am, Patna');
  assert.match(texts(r1), /Rahul Kumar[\s\S]*12 March 1995[\s\S]*06:45 AM[\s\S]*Patna, Bihar, India/);
  assert.equal(r1[0].quickReplies[0].payload, 'CONFIRM_YES');
  const r2 = await say('✅ Haan, sahi hai', 'CONFIRM_YES');
  assert.equal(r2.filter((x) => x.imageUrl).length, 4);
  assert.match(texts(r2), /kaylatalk\.com\/k\/abc/);
  assert.equal(generated[0].place.timeZone, 'Asia/Kolkata');
  assert.deepEqual(generated[0].time, { hour: 6, minute: 45 });
});

test('step by step: asks only for what is missing; bare word is the name', async () => {
  const { say } = harness();
  assert.match(texts(await say('kundli bana do')), /4 details/);
  const r = await say('12 March 1995, 18:45, Varanasi');
  assert.match(texts(r), /Naam/); assert.doesNotMatch(texts(r), /Janm tithi \(/);
  assert.match(texts(await say('Sita')), /Sita[\s\S]*Varanasi/);
});

test('AM/PM is asked, never guessed', async () => {
  const { say, generated } = harness();
  assert.match(texts(await say('kundli: Amit, 25/12/1990, 7:10, Jaipur')), /AM.*PM|subah/);
  const r = await say('PM', 'AMPM_PM');
  assert.match(texts(r), /07:10 PM/);
  await say('haan', 'CONFIRM_YES');
  assert.deepEqual(generated[0].time, { hour: 19, minute: 10 });
});

test('ambiguous place -> numbered choice', async () => {
  const { say, generated } = harness();
  const r = await say('Meri kundli: Neha, 1/1/2000, 10:00 AM, Aurangabad');
  assert.match(texts(r), /1\. Aurangabad[\s\S]*2\. Aurangabad/);
  const pick = r[0].quickReplies.findIndex((q) => /Aurangabad/.test(q.title));
  const r2 = await say('2');
  assert.match(texts(r2), /Maharashtra|Bihar/);
  await say('haan', 'CONFIRM_YES');
  assert.ok(generated[0].place.lat);
  void pick;
});

test('correction after "badlna hai"', async () => {
  const { say } = harness();
  await say('Rahul, 12/03/1995, 6:45 am, Patna');
  assert.match(texts(await say('✏️ Badlna hai', 'CONFIRM_NO')), /galat/);
  assert.match(texts(await say('samay 7:15 PM')), /07:15 PM[\s\S]*Patna/);
});

test('unknown place asks for nearest town; online geocoder used when configured', async () => {
  const h1 = harness();
  assert.match(texts(await h1.say('kundli Ravi 5/5/1990 5:00 am Xyzzyville')), /nahi mila/);
  const h2 = harness({ geocode: async () => ({ status: 'found', place: { name: 'Xyzzyville, Bihar, India', lat: 26, lon: 85, timeZone: 'Asia/Kolkata', country: 'IN' } }) });
  assert.match(texts(await h2.say('kundli Ravi 5/5/1990 5:00 am Xyzzyville')), /Xyzzyville, Bihar/);
});

test('daily limit and cancel', async () => {
  const { say } = harness({ config: { maxPerDay: 1 } });
  await say('Rahul, 12/03/1995, 6:45 am, Patna'); await say('haan', 'CONFIRM_YES');
  await say('kundli Rahul, 12/03/1996, 6:45 am, Patna');
  assert.match(texts(await say('haan', 'CONFIRM_YES')), /Aaj ke liye 1/);
  await say('kundli'); assert.match(texts(await say('cancel')), /dobara/);
});

test('future dates are rejected', async () => {
  const { say } = harness();
  assert.match(texts(await say('kundli Baby, 12/12/2030, 6:00 am, Patna')), /samajh nahi/);
});

test('generator failure -> apology, session kept for retry', async () => {
  const { say, sessions } = harness({ generate: async () => { throw new Error('boom'); } });
  await say('Rahul, 12/03/1995, 6:45 am, Patna');
  assert.match(texts(await say('haan', 'CONFIRM_YES')), /Maaf/);
  assert.equal(sessions.get('u1').stage, 'confirm');
});
