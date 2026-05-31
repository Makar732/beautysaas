const express = require('express');
const passport = require('passport');
const ctrl = require('../controllers/authController');
const r = express.Router();
r.get('/google', passport.authenticate('google', { scope: ['profile','email'] }));
r.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: true }), ctrl.handleGoogleCallback);
r.get('/me', ctrl.getMe);
r.post('/logout', ctrl.logout);
module.exports = r;
