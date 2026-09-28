// In-memory implementations of every store the bot needs (tests, local runs).
export function createMemoryStore() {
  const sessions = new Map(); const usage = new Map(); const reports = new Map(); const seen = new Set(); const files = new Map();
  const commentSeen = new Set(); const commentReplies = new Map(); const commentLog = [];
  const day = (d) => d.toISOString().slice(0, 10);
  return {
    sessions: {
      get: async (u) => (sessions.has(u) ? structuredClone(sessions.get(u)) : null),
      set: async (u, s) => { sessions.set(u, structuredClone(s)); },
      delete: async (u) => { sessions.delete(u); },
    },
    usage: {
      count: async (u, now) => usage.get(`${u}|${day(now)}`) || 0,
      add: async (u, now) => { const k = `${u}|${day(now)}`; usage.set(k, (usage.get(k) || 0) + 1); },
    },
    reports: {
      save: async (id, doc) => { reports.set(id, structuredClone(doc)); },
      get: async (id) => (reports.has(id) ? structuredClone(reports.get(id)) : null),
    },
    /** true the first time a message id is seen (webhooks can be delivered twice). */
    claimMessage: async (mid) => { if (seen.has(mid)) return false; seen.add(mid); return true; },
    withUserLock: async (_u, fn) => fn(),
    comments: {
      claim: async (id) => { if (commentSeen.has(id)) return false; commentSeen.add(id); return true; },
      recentReplies: async (u, m) => commentReplies.get(`${u}|${m}`) || 0,
      recordReply: async (u, m) => { const k = `${u}|${m}`; commentReplies.set(k, (commentReplies.get(k) || 0) + 1); },
      log: async (entry) => { commentLog.push(structuredClone(entry)); },
      entries: commentLog,
    },
    uploader: {
      upload: async (path, buf) => { files.set(path, buf); return `memory://${path}`; },
      files,
    },
  };
}
