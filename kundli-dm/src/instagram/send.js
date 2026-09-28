// Instagram Send API client.
//   Instagram API with Instagram Login:  apiBase https://graph.instagram.com/<ver>, senderId 'me' (or your IG user id)
//   Messenger Platform (via FB Page):   apiBase https://graph.facebook.com/<ver>,  senderId <PAGE_ID>
export function createSender({ accessToken, apiBase = 'https://graph.instagram.com/v23.0', senderId = 'me', fetchImpl = fetch, log = () => {} }) {
  const url = `${apiBase.replace(/\/$/, '')}/${senderId}/messages`;

  async function post(body, attempt = 1) {
    const r = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    if (r.ok) return r.json().catch(() => ({}));
    const text = await r.text().catch(() => '');
    // Retry rate limits and server errors a couple of times.
    if ((r.status === 429 || r.status >= 500) && attempt < 3) {
      await new Promise((res) => setTimeout(res, 800 * attempt));
      return post(body, attempt + 1);
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
    /** Send a list of conversation replies in order. */
    async replies(userId, replies) {
      for (const r of replies) {
        if (r.imageUrl) await this.image(userId, r.imageUrl);
        else if (r.text) await this.text(userId, r.text, r.quickReplies);
      }
    },
  };
}
