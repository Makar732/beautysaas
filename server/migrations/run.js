// Этот скрипт создаёт все таблицы в базе данных
// Запуск: node server/migrations/run.js

require('dotenv').config({ 
  path: require('path').join(__dirname, '..', '..', '.env') 
});
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Запуск миграций...');
    const sqlPath = path.join(__dirname, '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Таблицы созданы успешно!');
  } catch (error) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();