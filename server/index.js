// Загружаем переменные из .env ПЕРВЫМ ДЕЛОМ
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

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
          console.log('Новый мастер зарегистрирован:', email);
        }

        return done(null, result.rows[0]);
      } catch (error) {
        console.error('Ошибка OAuth:', error.message);
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
    done(error, null);
  }
});

// ============================================================
// СОЗДАНИЕ ПРИЛОЖЕНИЯ
// ============================================================
const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// Разрешаем запросы с фронтенда
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // важно для передачи cookies!
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
  secret: process.env.SESSION_SECRET || 'dev-secret',
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

// ============================================================
// API МАРШРУТЫ
// ============================================================
const appointmentController = require('./controllers/appointmentController');
const masterController = require('./controllers/masterController');

const authRouter = require('./routes/auth');
const mastersRouter = require('./routes/masters');
const servicesRouter = require('./routes/services');
const appointmentsRouter = require('./routes/appointments');

// Проверяем что каждый роутер это функция
console.log('auth тип:', typeof authRouter);
console.log('masters тип:', typeof mastersRouter);
console.log('services тип:', typeof servicesRouter);
console.log('appointments тип:', typeof appointmentsRouter);

app.use('/auth', authRouter);
app.use('/api/masters', mastersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);

// Публичные маршруты для клиентов (без авторизации)
app.post('/api/public/book/:slug', appointmentController.createPublicAppointment);
app.get('/api/public/master/:slug', masterController.getMasterBySlug);

// Проверка что сервер работает
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// ФРОНТЕНД — раздаём собранные файлы React
// ============================================================
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Все остальные URL отдаём React (он сам разберётся с роутингом)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ============================================================
// ЗАПУСК
// ============================================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n Сервер запущен на порту ${PORT}`);
  console.log(` Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Открыть: http://localhost:${PORT}\n`);
});

module.exports = app;