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
      const snap = await db.collection('custom_exercises').where('user_id', '==', uid).get();
      return res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    if (req.method === 'POST') {
      const { name, muscle } = req.body;
      // Upsert — check if exists first
      const existing = await db.collection('custom_exercises')
        .where('user_id', '==', uid).where('name', '==', name).get();
      if (!existing.empty) {
        await existing.docs[0].ref.update({ muscle });
        return res.json({ id: existing.docs[0].id, name, muscle, user_id: uid });
      }
      const doc = await db.collection('custom_exercises').add({ name, muscle, user_id: uid });
      return res.json({ id: doc.id, name, muscle, user_id: uid });
    }

    if (req.method === 'DELETE') {
      const { name } = req.query;
      if (!name) return res.status(400).json({ error: 'Missing name' });
      const snap = await db.collection('custom_exercises')
        .where('user_id', '==', uid).where('name', '==', name).get();
      snap.docs.forEach(d => d.ref.delete());
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    if (e.message === 'No token') return res.status(401).json({ error: 'Unauthorized' });
    console.error('custom_exercises error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
};
