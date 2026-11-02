const crypto = require('crypto');
const { sb } = require('./_lib');
const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a || '')).digest();
  const y = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(x, y);
};
module.exports = async (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !same(req.headers['x-admin-password'], pw)) {
    await new Promise(r => setTimeout(r, 800)); // kaba kuvveti yavaslat
    return res.status(401).json({ error: 'Yetkisiz' });
  }
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const r = await sb('?select=*&order=date.asc,time.asc&date=gte.' + new Date(Date.now() - 864e5).toISOString().slice(0, 10));
      if (!r.ok) return res.status(502).json({ error: 'Veritabanı bağlantısı başarısız (SUPABASE_SERVICE_KEY kontrol edin)' });
      return res.json(await r.json());
    }
    if (req.method === 'PATCH') {
      const { id, status } = req.body || {};
      if (!/^[0-9a-f-]{36}$/.test(id) || !['beklemede', 'onaylandi', 'iptal'].includes(status)) return res.status(400).end();
      await sb('?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
      return res.json({ ok: true });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
};
