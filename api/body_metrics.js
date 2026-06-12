const { db, verifyToken } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = await verifyToken(req);
    const uid = user.uid;

    if (req.method === 'GET') {
      const snap = await db.collection('body_metrics').where('user_id', '==', uid).get();
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return res.json(data);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const doc = await db.collection('body_metrics').add({ ...body, user_id: uid });
      return res.json({ id: doc.id, ...body, user_id: uid });
    }

    if (req.method === 'PUT') {
      const { id, ...body } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const ref = db.collection('body_metrics').doc(id);
      const doc = await ref.get();
      if (!doc.exists || doc.data().user_id !== uid) return res.status(403).json({ error: 'Forbidden' });
      await ref.update(body);
      return res.json({ id, ...body });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const ref = db.collection('body_metrics').doc(id);
      const doc = await ref.get();
      if (!doc.exists || doc.data().user_id !== uid) return res.status(403).json({ error: 'Forbidden' });
      await ref.delete();
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    if (e.message === 'No token') return res.status(401).json({ error: 'Unauthorized' });
    console.error('body_metrics error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
};
