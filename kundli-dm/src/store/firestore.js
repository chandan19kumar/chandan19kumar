// Firestore + Cloud Storage implementations (production on Firebase).
//   kundliDmSessions/{igUserId}        conversation state
//   kundliDmUsage/{igUserId}_{date}    daily counter
//   kundliReports/{id}                 saved kundli for the report page (expireAt -> Firestore TTL)
//   kundliDmInbox/{mid}                incoming messages (dedupe + async processing)
import crypto from 'node:crypto';

export function createFirestoreStore({ db, bucket, reportTtlDays = 90 }) {
  const day = (d) => d.toISOString().slice(0, 10);
  const sessions = db.collection('kundliDmSessions');
  return {
    sessions: {
      get: async (u) => { const s = await sessions.doc(u).get(); return s.exists ? s.data().state || null : null; },
      set: async (u, state) => { await sessions.doc(u).set({ state, updatedAt: new Date() }, { merge: true }); },
      delete: async (u) => { await sessions.doc(u).set({ state: null, updatedAt: new Date() }, { merge: true }); },
    },
    usage: {
      count: async (u, now) => { const s = await db.collection('kundliDmUsage').doc(`${u}_${day(now)}`).get(); return s.exists ? s.data().n || 0 : 0; },
      add: async (u, now) => {
        const ref = db.collection('kundliDmUsage').doc(`${u}_${day(now)}`);
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          tx.set(ref, { n: (s.exists ? s.data().n || 0 : 0) + 1, expireAt: new Date(now.getTime() + 3 * 86400e3) });
        });
      },
    },
    reports: {
      save: async (id, doc) => {
        await db.collection('kundliReports').doc(id).set({ ...doc, createdAt: new Date(), expireAt: new Date(Date.now() + reportTtlDays * 86400e3) });
      },
      get: async (id) => {
        const s = await db.collection('kundliReports').doc(id).get();
        if (!s.exists) return null;
        const d = s.data();
        if (d.expireAt && d.expireAt.toDate && d.expireAt.toDate() < new Date()) return null;
        return d;
      },
    },
    claimMessage: async (mid, data = {}) => {
      try {
        await db.collection('kundliDmInbox').doc(mid.replace(/\//g, '_')).create({ ...data, receivedAt: new Date(), expireAt: new Date(Date.now() + 7 * 86400e3) });
        return true;
      } catch (e) {
        if (e.code === 6 || /already exists/i.test(e.message)) return false;
        throw e;
      }
    },
    comments: {
      claim: async (id, data = {}) => {
        try {
          await db.collection('kundliCommentInbox').doc(String(id)).create({ ...data, receivedAt: new Date(), expireAt: new Date(Date.now() + 7 * 86400e3) });
          return true;
        } catch (e) { if (e.code === 6 || /already exists/i.test(e.message)) return false; throw e; }
      },
      recentReplies: async (u, m) => { const s = await db.collection('kundliCommentReplies').doc(`${u}_${m}`).get(); return s.exists ? s.data().n || 0 : 0; },
      recordReply: async (u, m) => {
        const ref = db.collection('kundliCommentReplies').doc(`${u}_${m}`);
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          tx.set(ref, { n: (s.exists ? s.data().n || 0 : 0) + 1, expireAt: new Date(Date.now() + 86400e3) });
        });
      },
      log: async (entry) => { await db.collection('kundliCommentLog').add({ ...entry, at: new Date(), expireAt: new Date(Date.now() + 30 * 86400e3) }); },
    },
    // One message at a time per user, so two quick DMs can't race on the session.
    withUserLock: async (u, fn) => {
      const ref = sessions.doc(u);
      const token = crypto.randomUUID();
      for (let attempt = 0; attempt < 20; attempt++) {
        const got = await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          const until = s.exists && s.data().lockUntil ? s.data().lockUntil.toMillis?.() ?? +s.data().lockUntil : 0;
          if (until > Date.now()) return false;
          tx.set(ref, { lockUntil: new Date(Date.now() + 60e3), lockToken: token }, { merge: true });
          return true;
        });
        if (got) {
          try { return await fn(); } finally { await ref.set({ lockUntil: new Date(0) }, { merge: true }); }
        }
        await new Promise((r) => setTimeout(r, 750));
      }
      throw new Error(`could not lock session for ${u}`);
    },
    uploader: {
      // Public-by-token download URL; no signBlob permission needed.
      upload: async (path, buf, contentType) => {
        const token = crypto.randomUUID();
        const file = bucket.file(path);
        await file.save(buf, { contentType, resumable: false, metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } } });
        return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
      },
    },
  };
}
