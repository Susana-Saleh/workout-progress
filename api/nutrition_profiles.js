const { db, verifyToken } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const user = await verifyToken(req);
    const uid = user.uid;

    if (req.method === 'GET') {
      const snap = await db.collection('nutrition_profiles').where('user_id', '==', uid).get();
      if (snap.empty) return res.json({});
      return res.json({id: snap.docs[0].id, ...snap.docs[0].data()});
    }

    if (req.method === 'POST') {
      const body = req.body;
      const snap = await db.collection('nutrition_profiles').where('user_id', '==', uid).get();
      if (snap.empty) {
        const doc = await db.collection('nutrition_profiles').add({...body, user_id: uid});
        return res.json({id: doc.id, ...body});
      } else {
        await snap.docs[0].ref.update(body);
        return res.json({id: snap.docs[0].id, ...body});
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e) {
    if (e.message === 'No token') return res.status(401).json({ error: 'Unauthorized' });
    return res.status(500).json({ error: 'Server error' });
  }
};
