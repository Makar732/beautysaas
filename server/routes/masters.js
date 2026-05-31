const express = require('express');
const ctrl = require('../controllers/masterController');
const { requireAuth } = require('../middleware/requireAuth');
const r = express.Router();
r.patch('/profile', requireAuth, ctrl.updateProfile);
r.get('/public/:slug', ctrl.getMasterBySlug);
module.exports = r;
