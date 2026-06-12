const { db, verifyToken, admin } = require('./_auth');

const ADMIN_EMAIL = 'susanasaleh@gmail.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = await verifyToken(req);
    const uid = user.uid;
    const { action } = req.query;

    // ── USER PREFS ────────────────────────────────
    if (action === 'prefs') {
      if (req.method === 'GET') {
        const snap = await db.collection('user_prefs').where('user_id', '==', uid).get();
        if (snap.empty) return res.json({});
        return res.json(snap.docs[0].data());
      }
      if (req.method === 'POST') {
        const snap = await db.collection('user_prefs').where('user_id', '==', uid).get();
        if (snap.empty) {
          await db.collection('user_prefs').add({ user_id: uid, ...req.body });
        } else {
          await snap.docs[0].ref.update(req.body);
        }
        return res.json({ success: true });
      }
    }

    // ── USER STATUS (admin only for GET all) ──────
    if (action === 'status') {
      if (req.method === 'GET') {
        // Check own status
        if (user.email === ADMIN_EMAIL) {
          const [pending, approved] = await Promise.all([
            db.collection('user_status').where('status', '==', 'pending').get(),
            db.collection('user_status').where('status', '==', 'approved').get(),
          ]);
          return res.json({
            pending: pending.docs.map(d => ({ id: d.id, ...d.data() })),
            approved: approved.docs.map(d => ({ id: d.id, ...d.data() })),
          });
        }
        // Regular user — check own status
        const snap = await db.collection('user_status').where('uid', '==', uid).get();
        if (snap.empty) {
          // New user — create pending
          await db.collection('user_status').add({
            uid, email: user.email, status: 'pending', created_at: new Date().toISOString()
          });
          return res.json({ status: 'pending' });
        }
        return res.json({ status: snap.docs[0].data().status, id: snap.docs[0].id });
      }

      if (req.method === 'PUT') {
        // Admin only
        if (user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: 'Missing id or status' });
        await db.collection('user_status').doc(id).update({ status });
        return res.json({ success: true });
      }

      if (req.method === 'DELETE') {
        if (user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });
        const { id } = req.query;
        await db.collection('user_status').doc(id).delete();
        return res.json({ success: true });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    if (e.message === 'No token') return res.status(401).json({ error: 'Unauthorized' });
    console.error('users error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
};
