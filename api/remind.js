const { sb, today, mail, esc } = require('./_lib');
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'Yetkisiz' });
  try {
    const t = new Date(today() + 'T00:00:00Z');
    t.setUTCDate(t.getUTCDate() + 1);
    const tomorrow = t.toISOString().slice(0, 10);
    const r = await sb(`?select=*&date=eq.${tomorrow}&status=eq.onaylandi&email=not.is.null&reminded_at=is.null`);
    if (!r.ok) throw new Error('db');
    let sent = 0;
    for (const a of await r.json()) {
      const what = a.kind === 'ziyaret' ? 'Mağaza ziyareti' : 'Servis: ' + a.service;
      const ok = await mail(a.email, 'AUREL randevu hatırlatması',
        `<p>Merhaba ${esc(a.name)},</p><p>Yarın <b>${esc(a.time.slice(0, 5))}</b> saatinde ${esc(what)} randevunuzu hatırlatmak isteriz.</p><p>Gelemeyecekseniz lütfen bize haber verin.</p><p>AUREL Otomatik Saat</p>`);
      if (!ok) continue;
      await sb('?id=eq.' + a.id, { method: 'PATCH', body: JSON.stringify({ reminded_at: new Date().toISOString() }) });
      sent++;
    }
    res.json({ sent });
  } catch (e) { res.status(500).json({ error: 'Sunucu hatası' }); }
};
