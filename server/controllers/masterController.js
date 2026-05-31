const pool = require('../config/db');

async function updateProfile(req, res) {
  const masterId = req.user.id;
  const { name, phone, slug, tg_chat_id } = req.body;
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ message: 'Slug: только латиница, цифры, дефис' });
  }
  if (slug && slug.length < 3) {
    return res.status(400).json({ message: 'Slug минимум 3 символа' });
  }
  try {
    if (slug) {
      const check = await pool.query('SELECT id FROM masters WHERE slug = $1 AND id != $2', [slug, masterId]);
      if (check.rows.length > 0) return res.status(409).json({ message: 'Slug уже занят' });
    }
    const result = await pool.query(
      'UPDATE masters SET name=COALESCE($1,name), phone=COALESCE($2,phone), slug=COALESCE($3,slug), tg_chat_id=COALESCE($4,tg_chat_id) WHERE id=$5 RETURNING id,name,phone,email,slug,tg_chat_id,created_at',
      [name||null, phone||null, slug||null, tg_chat_id||null, masterId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Мастер не найден' });
    req.user = result.rows[0];
    return res.json({ success: true, master: result.rows[0] });
  } catch (error) {
    console.error('Ошибка профиля:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

async function getMasterBySlug(req, res) {
  const { slug } = req.params;
  try {
    const masterResult = await pool.query('SELECT id,name,email,slug FROM masters WHERE slug=$1', [slug]);
    if (masterResult.rows.length === 0) return res.status(404).json({ message: 'Мастер не найден' });
    const master = masterResult.rows[0];
    const servicesResult = await pool.query('SELECT id,title,price,duration FROM services WHERE master_id=$1 ORDER BY title ASC', [master.id]);
    return res.json({ master, services: servicesResult.rows });
  } catch (error) {
    console.error('Ошибка getMasterBySlug:', error.message);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = { updateProfile, getMasterBySlug };
