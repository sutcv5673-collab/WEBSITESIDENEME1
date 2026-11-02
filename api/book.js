const { SLOTS, sb, validDate, today, takenSlots, mail, esc } = require('./_lib');
const SERVICES = ['Pil değişimi', 'Kayış değişimi', 'Genel bakım'];
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  const kind = b.kind, date = b.date, time = b.time;
  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const email = String(b.email || '').trim().slice(0, 150);
  const note = String(b.note || '').trim().slice(0, 500);
  const service = kind === 'servis' ? b.service : null;
  if (!['ziyaret', 'servis'].includes(kind) || (kind === 'servis' && !SERVICES.includes(service)) ||
      !validDate(date) || date < today() || !SLOTS.includes(time) ||
      name.length < 2 || phone.replace(/\D/g, '').length < 10 || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))
    return res.status(400).json({ error: 'Lütfen bilgileri kontrol edin.' });
  try {
    if ((await takenSlots(date)).includes(time)) return res.status(409).json({ error: 'Bu saat dolu, lütfen başka bir saat seçin.' });
    const r = await sb('', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ kind, service, date, time, name, phone, email: email || null, note: note || null }) });
    if (r.status === 409) return res.status(409).json({ error: 'Bu saat dolu, lütfen başka bir saat seçin.' });
    if (!r.ok) throw new Error('db');
    const what = kind === 'ziyaret' ? 'Mağaza ziyareti' : 'Servis: ' + service;
    await Promise.all([
      mail(process.env.ADMIN_EMAIL, `Yeni randevu: ${date} ${time}`, `<p><b>${esc(what)}</b><br>${esc(date)} ${esc(time)}<br>${esc(name)} · ${esc(phone)} ${esc(email)}<br>${esc(note)}</p>`),
      mail(email, 'AUREL randevu talebiniz alındı', `<p>Merhaba ${esc(name)},</p><p>${esc(what)} randevu talebiniz <b>${esc(date)} ${esc(time)}</b> için alındı. Onay için sizinle iletişime geçeceğiz.</p><p>AUREL Otomatik Saat</p>`)
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Sunucu hatası, lütfen tekrar deneyin.' }); }
};
