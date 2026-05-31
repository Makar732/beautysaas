const fs = require('fs');
const path = require('path');

const files = {
  'server/routes/auth.js': [
    "const express = require('express');",
    "const passport = require('passport');",
    "const ctrl = require('../controllers/authController');",
    "const r = express.Router();",
    "r.get('/google', passport.authenticate('google', { scope: ['profile','email'] }));",
    "r.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: true }), ctrl.handleGoogleCallback);",
    "r.get('/me', ctrl.getMe);",
    "r.post('/logout', ctrl.logout);",
    "module.exports = r;"
  ].join('\n'),

  'server/routes/masters.js': [
    "const express = require('express');",
    "const ctrl = require('../controllers/masterController');",
    "const { requireAuth } = require('../middleware/requireAuth');",
    "const r = express.Router();",
    "r.patch('/profile', requireAuth, ctrl.updateProfile);",
    "r.get('/public/:slug', ctrl.getMasterBySlug);",
    "module.exports = r;"
  ].join('\n'),

  'server/routes/services.js': [
    "const express = require('express');",
    "const ctrl = require('../controllers/serviceController');",
    "const { requireAuth } = require('../middleware/requireAuth');",
    "const r = express.Router();",
    "r.use(requireAuth);",
    "r.get('/', ctrl.getServices);",
    "r.post('/', ctrl.createService);",
    "r.put('/:id', ctrl.updateService);",
    "r.delete('/:id', ctrl.deleteService);",
    "module.exports = r;"
  ].join('\n'),

  'server/routes/appointments.js': [
    "const express = require('express');",
    "const ctrl = require('../controllers/appointmentController');",
    "const { requireAuth } = require('../middleware/requireAuth');",
    "const r = express.Router();",
    "r.get('/', requireAuth, ctrl.getAppointments);",
    "r.patch('/:id/status', requireAuth, ctrl.updateAppointmentStatus);",
    "module.exports = r;"
  ].join('\n')
};

Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
  console.log('Создан:', filePath);
  
  // Проверяем
  const loaded = require('./' + filePath);
  console.log('Тип:', typeof loaded, loaded.constructor.name);
});

console.log('\nВсе файлы созданы!');