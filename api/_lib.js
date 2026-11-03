const nodemailer = require('nodemailer');
const SB = () => process.env.SUPABASE_URL + '/rest/v1/appointments';
const H = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' });

const SLOTS = [];
for (let h = 10; h < 20; h++) for (const m of ['00', '30']) SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);

const sb = (qs = '', opt = {}) => fetch(SB() + qs, { ...opt, headers: { ...H(), ...(opt.headers || {}) } });

const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T00:00:00Z'));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

async function takenSlots(date) {
  const r = await sb(`?select=time&date=eq.${date}&status=neq.iptal`);
  if (!r.ok) throw new Error('db');
  return (await r.json()).map(x => x.time.slice(0, 5));
}

let tx;
const transport = () => tx || (tx = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
}));

// basarili gonderimde true doner
async function mail(to, subject, html, replyTo) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !to) return false;
  try {
    await transport().sendMail({ from: `"AUREL Otomatik Saat" <${process.env.GMAIL_USER}>`, to, subject, html, replyTo: replyTo || undefined });
    return true;
  } catch (e) { return false; /* e-posta hatasi randevuyu engellemez */ }
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = { SLOTS, sb, validDate, today, takenSlots, mail, esc };
