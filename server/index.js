require('dotenv').config({ 
  path: require('path').join(__dirname, '..', '.env') 
});

// ОТЛАДКА — видим какие переменные загрузились
console.log('=== ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Найдена' : '❌ НЕ НАЙДЕНА');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Найден' : '❌ НЕ НАЙДЕН');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Найден' : '❌ НЕ НАЙДЕН');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Найден' : '❌ НЕ НАЙДЕН');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Найден' : '❌ НЕ НАЙДЕН');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('SERVER_URL:', process.env.SERVER_URL);
console.log('============================\n');

const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

let pool;
try {
  pool = require('./config/db');
  console.log('✅ Пул БД инициализирован');
} catch (error) {
  console.error('❌ ОШИБКА инициализации пула БД:', error.message);
  process.exit(1);
}

// ============================================================
// НАСТРОЙКА GOOGLE OAUTH
// ============================================================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) {
          return done(new Error('Google аккаунт без email'), null);
        }

        // Ищем мастера в базе данных
        let result = await pool.query(
          'SELECT * FROM masters WHERE google_id = $1',
          [googleId]
        );

        if (result.rows.length === 0) {
          // Новый пользователь — создаём запись
          result = await pool.query(
            `INSERT INTO masters (google_id, name, email)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [googleId, name, email]
          );
          console.log('✅ Новый мастер зарегистрирован:', email);
        } else {
          console.log('✅ Мастер найден:', email);
        }

        return done(null, result.rows[0]);
      } catch (error) {
        console.error('❌ Ошибка OAuth:', error.message);
        return done(error, null);
      }
    }
  )
);

// Что сохранять в сессии — только id мастера
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Как восстановить пользователя из сессии
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT * FROM masters WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return done(null, false);
    done(null, result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка deserializeUser:', error.message);
    done(error, null);
  }
});

// ============================================================
// СОЗДАНИЕ ПРИЛОЖЕНИЯ
// ============================================================
const app = express();

// ВАЖНО для Railway: без этого сессии не будут работать!
app.set('trust proxy', 1);

// ============================================================
// MIDDLEWARE
// ============================================================

// Разрешаем запросы с фронтенда
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Читаем JSON из тела запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// СЕССИИ — храним в PostgreSQL
// ============================================================
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// Запускаем Passport
app.use(passport.initialize());
app.use(passport.session());

console.log('✅ Сессии и Passport инициализированы\n');

// ============================================================
// API МАРШРУТЫ
// ============================================================
const appointmentController = require('./controllers/appointmentController');
const masterController = require('./controllers/masterController');

const authRouter = require('./routes/auth');
const mastersRouter = require('./routes/masters');
const servicesRouter = require('./routes/services');
const appointmentsRouter = require('./routes/appointments');

app.use('/auth', authRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);

// Публичные маршруты для клиентов (без авторизации)
app.post('/api/public/book/:slug', appointmentController.createPublicAppointment);
app.get('/api/public/master/:slug', masterController.getMasterBySlug);

// Проверка что сервер работает
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// ============================================================
// ФРОНТЕНД — раздаём собранные файлы React
// ============================================================
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  console.log('📦 Production режим');
  console.log('Раздаём статику из:', distPath, '\n');
  
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: false
  }));

  // Все остальные URL отдаём React (он сам разберётся с роутингом)
  app.get('*', (req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('❌ ОШИБКА: Файл index.html не найден!');
      res.status(500).send('Идёт сборка сайта... Пожалуйста, обновите страницу через минуту.');
    }
  });
}

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Необработанная ошибка:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// ============================================================
// ЗАПУСК
// ============================================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   🚀 BEAUTY SAAS СЕРВЕР ЗАПУЩЕН 🚀    ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  🔗 Порт: ${PORT.toString().padEnd(31)}║`);
  console.log(`║  🌍 Режим: ${(process.env.NODE_ENV || 'development').padEnd(28)}║`);
  console.log(`║  📍 URL: http://localhost:${PORT}${' '.repeat(18 - PORT.toString().length)}║`);
  console.log('╚════════════════════════════════════════╝\n');
});

module.exports = app;