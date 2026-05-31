const express = require('express');
const ctrl = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/requireAuth');
const r = express.Router();
r.get('/', requireAuth, ctrl.getAppointments);
r.patch('/:id/status', requireAuth, ctrl.updateAppointmentStatus);
module.exports = r;
