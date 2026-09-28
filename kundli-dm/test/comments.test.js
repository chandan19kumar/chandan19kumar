import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleComment, extractComments, kundliDm } from '../src/comments/handle.js';
import { createCommentBrain, systemPrompt, CommentDecision } from '../src/comments/brain.js';
import { createSender } from '../src/instagram/send.js';

const base = { id: 'c1', userId: 'U1', username: 'riya_s', mediaId: 'M1' };
const deps = (over = {}) => ({ ownUserIds: ['OWN'], getCaption: async () => 'Shani ka Kumbh me gochar: 12 rashiyon par asar', ...over });

test('birth details in a comment -> public "check DM" + private DM with copy-paste line; details never public', async () => {
  const r = await handleComment({ ...base, text: 'Meri bhi kundli: Riya, 12/03/1995, 6:45 am, Patna' }, deps());
  assert.equal(r.category, 'kundli_request');
  const pub = r.actions.find((a) => a.type === 'publicReply').text;
  const dm = r.actions.find((a) => a.type === 'privateReply').text;
  assert.doesNotMatch(pub, /1995|Patna|6:45/);
  assert.match(dm, /Riya, 12\/03\/1995, 6:45 AM, Patna/);
});

test('"kundli banao" without details -> DM asks for the four details', async () => {
  const r = await handleComment({ ...base, text: 'Meri kundli bhi dekho please' }, deps());
  assert.match(r.actions.find((a) => a.type === 'privateReply').text, /Naam, janm tithi/);
});

test('emoji and one-line blessings get a free thank-you, no model call', async () => {
  let called = 0;
  const brain = async () => { called++; return null; };
  for (const t of ['🙏🙏', '❤️', 'Jai Mata Di 🙏', 'so true']) {
    const r = await handleComment({ ...base, id: t, text: t }, deps({ brain }));
    assert.equal(r.category, 'praise', t);
    assert.equal(r.actions[0].type, 'publicReply');
  }
  assert.equal(called, 0);
  const r = await handleComment({ ...base, id: 'd', text: '12345' }, deps({ brain }));
  assert.notEqual(r.category, 'praise'); // digits are not emoji
});

test('other comments go to the model with the caption; its decision becomes actions', async () => {
  let seen;
  const brain = async (input) => { seen = input; return { category: 'personal_problem', reply: 'Ye aapki kundli par nirbhar hai 🙏 DM kijiye.', invite_dm: true, needs_human: false }; };
  const r = await handleComment({ ...base, text: 'meri shaadi me deri kyu ho rahi hai?' }, deps({ brain }));
  assert.match(seen.caption, /Shani/);
  assert.deepEqual(r.actions.map((a) => a.type), ['publicReply', 'privateReply']);
});

test('spam/abuse: no public reply, flagged', async () => {
  const brain = async () => ({ category: 'abuse', reply: 'x', invite_dm: true, needs_human: true });
  const r = await handleComment({ ...base, text: 'fraud log' }, deps({ brain }));
  assert.deepEqual(r.actions.map((a) => a.type), ['flag']);
});

test('own comments, empty text and per-user throttle are skipped', async () => {
  assert.equal((await handleComment({ ...base, userId: 'OWN', text: 'hi' }, deps())).actions.length, 0);
  assert.equal((await handleComment({ ...base, username: 'KaylaTalkJyotish', text: 'nice' }, deps({ ownUsername: 'kaylatalkjyotish' }))).actions.length, 0);
  assert.equal((await handleComment({ ...base, text: '  ' }, deps())).actions.length, 0);
  assert.equal((await handleComment({ ...base, text: 'nice' }, deps({ recentReplies: async () => 2 }))).category, 'throttled');
});

test('webhook comment extraction', () => {
  const body = { object: 'instagram', entry: [{ id: 'OWN', changes: [{ field: 'comments', value: { id: 'c9', text: 'wow', from: { id: 'U2', username: 'a' }, media: { id: 'M2' } } }, { field: 'mentions', value: {} }] }] };
  assert.deepEqual(extractComments(body), [{ id: 'c9', text: 'wow', userId: 'U2', username: 'a', mediaId: 'M2', parentId: null, accountId: 'OWN' }]);
});

test('brain: request shape (model, fallbacks, low effort, cache, structured output) and refusal handling', async () => {
  const calls = [];
  const fake = { beta: { messages: { parse: async (req) => { calls.push(req); return { stop_reason: 'end_turn', parsed_output: { category: 'praise', reply: 'Dhanyavaad 🙏', invite_dm: false, needs_human: false } }; } } } };
  const brain = createCommentBrain({ client: fake });
  const d = await brain({ caption: 'cap', text: 'bahut badhiya jaankari', username: 'x<y' });
  assert.equal(d.reply, 'Dhanyavaad 🙏');
  const req = calls[0];
  assert.equal(req.model, 'claude-opus-5');
  assert.equal(req.fallbacks, 'default');
  assert.deepEqual(req.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(req.output_config.effort, 'low');
  assert.ok(req.output_config.format);
  assert.equal(req.system, systemPrompt());
  assert.match(req.messages[0].content, /<comment author="xy">/);

  const refused = createCommentBrain({ client: { beta: { messages: { parse: async () => ({ stop_reason: 'refusal', stop_details: { category: null } }) } } } });
  assert.equal(await refused({ caption: '', text: 't' }), null);
  const broken = createCommentBrain({ client: { beta: { messages: { parse: async () => { throw new Error('net'); } } } } });
  assert.equal(await broken({ caption: '', text: 't' }), null);
});

test('decision schema rejects unknown categories', () => {
  assert.equal(CommentDecision.safeParse({ category: 'hack', reply: '', invite_dm: false, needs_human: false }).success, false);
});

test('sender: comment reply and private reply hit the right Graph endpoints', async () => {
  const calls = [];
  const s = createSender({ accessToken: 'T', fetchImpl: async (url, init) => { calls.push({ url, body: init.body && JSON.parse(init.body) }); return { ok: true, json: async () => ({ caption: 'hello' }) }; } });
  await s.replyToComment('c1', 'thanks');
  await s.privateReply('c1', kundliDm(null, 'riya'));
  assert.match(calls[0].url, /\/c1\/replies$/); assert.deepEqual(calls[0].body, { message: 'thanks' });
  assert.match(calls[1].url, /\/me\/messages$/); assert.deepEqual(calls[1].body.recipient, { comment_id: 'c1' });
  assert.equal(await s.caption('M1'), 'hello');
});

import { createMemoryStore } from '../src/store/memory.js';
import { createCommentBot } from '../src/comments/service.js';

test('comment bot: auto mode posts and logs; draft mode only logs', async () => {
  const calls = [];
  const sender = { replyToComment: async (id, t) => calls.push(['reply', id, t]), privateReply: async (id, t) => calls.push(['dm', id, t]), caption: async () => 'cap' };
  const store = createMemoryStore();
  const bot = createCommentBot({ store, sender });
  await bot.onComment({ id: 'c1', text: 'Riya 12/03/1995 6:45 am Patna', userId: 'U1', username: 'riya', mediaId: 'M1', accountId: 'OWN' });
  assert.deepEqual(calls.map((c) => c[0]), ['reply', 'dm']);
  assert.equal(store.comments.entries[0].category, 'kundli_request');
  assert.equal(await store.comments.recentReplies('U1', 'M1'), 1);

  const draftStore = createMemoryStore(); const draftCalls = [];
  const draft = createCommentBot({ store: draftStore, sender: { ...sender, replyToComment: async () => draftCalls.push(1) }, config: { mode: 'draft' } });
  await draft.onComment({ id: 'c2', text: '🙏', userId: 'U1', mediaId: 'M1', accountId: 'OWN' });
  assert.equal(draftCalls.length, 0);
  assert.equal(draftStore.comments.entries[0].actions[0].posted, false);
});

test('comment bot: a failed private reply is logged, public reply still counts', async () => {
  const store = createMemoryStore();
  const bot = createCommentBot({ store, log: () => {}, sender: { replyToComment: async () => {}, privateReply: async () => { const e = new Error('x'); e.status = 400; throw e; }, caption: async () => '' } });
  const r = await bot.onComment({ id: 'c3', text: 'kundli please', userId: 'U9', mediaId: 'M1', accountId: 'OWN' });
  assert.deepEqual(r.actions.map((a) => [a.type, a.posted]), [['publicReply', true], ['privateReply', false]]);
});
