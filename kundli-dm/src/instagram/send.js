// Instagram Send API client.
//   Instagram API with Instagram Login:  apiBase https://graph.instagram.com/<ver>, senderId 'me' (or your IG user id)
//   Messenger Platform (via FB Page):   apiBase https://graph.facebook.com/<ver>,  senderId <PAGE_ID>
export function createSender({ accessToken, apiBase = 'https://graph.instagram.com/v23.0', senderId = 'me', fetchImpl = fetch, log = () => {} }) {
  const base = apiBase.replace(/\/$/, '');
  const url = `${base}/${senderId}/messages`;

  async function post(body, attempt = 1, target = url) {
    const r = await fetchImpl(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (r.ok) return r.json().catch(() => ({}));
    const text = await r.text().catch(() => '');
    // Retry rate limits and server errors a couple of times.
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      await new Promise((res) => setTimeout(res, 800 * attempt));
      return post(body, attempt + 1, target);
    }
    log('send failed', r.status, text.slice(0, 500));
    const err = new Error(`Instagram send failed: ${r.status}`); err.status = r.status; err.body = text; throw err;
  }

  return {
    async text(userId, text, quickReplies) {
      const message = { text: text.slice(0, 1000) };
      if (quickReplies?.length) {
        message.quick_replies = quickReplies.slice(0, 13).map((q) => ({ content_type: 'text', title: q.title.slice(0, 20), payload: q.payload }));
      }
      return post({ recipient: { id: userId }, message });
    },
    async image(userId, imageUrl) {
      return post({ recipient: { id: userId }, message: { attachment: { type: 'image', payload: { url: imageUrl } } } });
    },
    async typing(userId) {
      try { await post({ recipient: { id: userId }, sender_action: 'typing_on' }); } catch { /* optional */ }
    },
    /** Public reply under a comment. */
    async replyToComment(commentId, text) {
      return post({ message: text.slice(0, 300) }, 1, `${base}/${encodeURIComponent(commentId)}/replies`);
    },
    /** Private reply: opens a DM with the commenter (once per comment, within 7 days). */
    async privateReply(commentId, text) {
      return post({ recipient: { comment_id: commentId }, message: { text: text.slice(0, 1000) } });
    },
    /** Caption of a post/reel. */
    async caption(mediaId) {
      const r = await fetchImpl(`${base}/${encodeURIComponent(mediaId)}?fields=caption`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) throw new Error(`caption fetch failed: ${r.status}`);
      return (await r.json()).caption || '';
    },
    /** Send a list of conversation replies in order. */
    async replies(userId, replies) {
      for (const r of replies) {
        if (r.imageUrl) await this.image(userId, r.imageUrl);
        else if (r.text) await this.text(userId, r.text, r.quickReplies);
      }
    },
  };
}
