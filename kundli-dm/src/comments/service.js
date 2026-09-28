// Runs one comment end to end: decide, then post (mode 'auto') or only log (mode 'draft').
import { handleComment } from './handle.js';

export function createCommentBot({ store, sender, brain, config = {}, log = console.error }) {
  const mode = config.mode || 'auto';
  const captions = new Map(); // mediaId -> { caption, at }
  async function getCaption(mediaId) {
    const hit = captions.get(mediaId);
    if (hit && Date.now() - hit.at < 3600e3) return hit.caption;
    const caption = sender ? await sender.caption(mediaId) : '';
    captions.set(mediaId, { caption, at: Date.now() });
    return caption;
  }

  async function onComment(c) {
    const decision = await handleComment(c, {
      ownUserIds: [c.accountId, ...(config.ownUserIds || [])].filter(Boolean),
      ownUsername: config.ownUsername,
      getCaption, brain,
      recentReplies: store.comments.recentReplies,
      maxRepliesPerUserPerPost: config.maxRepliesPerUserPerPost,
    });
    const done = [];
    for (const a of decision.actions) {
      if (a.type === 'flag' || mode !== 'auto') { done.push({ ...a, posted: false }); continue; }
      try {
        if (a.type === 'publicReply') await sender.replyToComment(c.id, a.text);
        if (a.type === 'privateReply') await sender.privateReply(c.id, a.text);
        done.push({ ...a, posted: true });
      } catch (e) {
        log('comment action failed', a.type, e.status, e.body || e.message);
        done.push({ ...a, posted: false, error: String(e.status || e.message) });
      }
    }
    if (done.some((a) => a.posted && a.type === 'publicReply')) await store.comments.recordReply(c.userId, c.mediaId);
    await store.comments.log({ commentId: c.id, mediaId: c.mediaId, username: c.username || null, text: c.text, category: decision.category, mode, actions: done });
    return { ...decision, actions: done };
  }

  return { onComment };
}
