const pool = require('../config/db');
const { sendNewAppointmentNotification } = require('../services/telegramService');

async function getAppointments(req, res) {
  const { month } = req.query;
  try {
    let query = 'SELECT a.*,s.title AS service_title,s.price AS service_price,s.duration AS service_duration FROM appointments a LEFT JOIN services s ON a.service_id=s.id WHERE a.master_id=$1';
    const params = [req.user.id];
    if (month) { query += ' AND TO_CHAR(a.date_time,\'YYYY-MM\')=$2'; params.push(month); }
    query += ' ORDER BY a.date_time ASC';
    const result = await pool.query(query, params);
    return res.json({ appointments: result.rows });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

async function updateAppointmentStatus(req, res) {
  const { status } = req.body;
  if (!['pending','confirmed','cancelled'].includes(status)) return res.status(400).json({ error: 'Некорректный статус' });
  try {
    const result = await pool.query('UPDATE appointments SET status=$1 WHERE id=$2 AND master_id=$3 RETURNING *', [status, req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    return res.json({ appointment: result.rows[0] });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

async function createPublicAppointment(req, res) {
  const { slug } = req.params;
  const { serviceId, clientName, clientPhone, dateTime } = req.body;
  if (!clientName || !clientPhone || !dateTime || !serviceId) return res.status(400).json({ error: 'Заполните все поля' });
  if (clientPhone.replace(/\D/g,'').length < 11) return res.status(400).json({ error: 'Некорректный телефон' });
  try {
    const masterResult = await pool.query('SELECT id,name,tg_chat_id FROM masters WHERE slug=$1', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ error: 'Мастер не найден' });
    const master = masterResult.rows[0];
    const serviceResult = await pool.query('SELECT id,title,price FROM services WHERE id=$1 AND master_id=$2', [serviceId, master.id]);
    if (serviceResult.rows.length === 0) return res.status(404).json({ error: 'Услуга не найдена' });
    const service = serviceResult.rows[0];
    const apptResult = await pool.query(
      'INSERT INTO appointments (master_id,service_id,client_name,client_phone,date_time,status) VALUES ($1,$2,$3,$4,$5,\'pending\') RETURNING *',
      [master.id, serviceId, clientName.trim(), clientPhone, new Date(dateTime)]
    );
    sendNewAppointmentNotification(master.tg_chat_id, { clientName: clientName.trim(), clientPhone, serviceTitle: service.title, dateTime }).catch(console.error);
    return res.status(201).json({ success: true, appointment: { id: apptResult.rows[0].id, status: 'pending' } });
  } catch (e) { console.error(e.message); return res.status(500).json({ error: 'Ошибка сервера' }); }
}

module.exports = { getAppointments, updateAppointmentStatus, createPublicAppointment };
