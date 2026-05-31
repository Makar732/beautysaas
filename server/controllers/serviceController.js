const pool = require('../config/db');

async function getServices(req, res) {
  try {
    const result = await pool.query('SELECT * FROM services WHERE master_id=$1 ORDER BY title ASC', [req.user.id]);
    return res.json({ services: result.rows });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

async function createService(req, res) {
  const { title, price, duration } = req.body;
  if (!title || price === undefined || !duration) return res.status(400).json({ error: 'Заполните все поля' });
  try {
    const result = await pool.query(
      'INSERT INTO services (master_id,title,price,duration) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, title.trim(), parseInt(price), parseInt(duration)]
    );
    return res.status(201).json({ service: result.rows[0] });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

async function updateService(req, res) {
  const { title, price, duration } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET title=$1,price=$2,duration=$3 WHERE id=$4 AND master_id=$5 RETURNING *',
      [title, parseInt(price), parseInt(duration), req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    return res.json({ service: result.rows[0] });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

async function deleteService(req, res) {
  try {
    const result = await pool.query('DELETE FROM services WHERE id=$1 AND master_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    return res.json({ success: true });
  } catch (e) { return res.status(500).json({ error: 'Ошибка сервера' }); }
}

module.exports = { getServices, createService, updateService, deleteService };
