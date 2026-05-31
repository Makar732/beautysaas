const { Pool } = require('pg');

// Подключаемся к PostgreSQL через DATABASE_URL из .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL нужен только на Railway (в production)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Проверка что подключение работает
pool.on('error', (err) => {
  console.error('Ошибка базы данных:', err.message);
});

module.exports = pool;