const { SLOTS, validDate, today, takenSlots } = require('./_lib');
module.exports = async (req, res) => {
  const date = req.query.date;
  if (!validDate(date) || date < today()) return res.status(400).json({ error: 'Gecersiz tarih' });
  try {
    const taken = await takenSlots(date);
    const now = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }).format(new Date());
    const free = SLOTS.filter(s => !taken.includes(s) && (date > today() || s > now));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ slots: free });
  } catch (e) { res.status(500).json({ error: 'Sunucu hatasi' }); }
};
