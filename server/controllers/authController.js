function handleGoogleCallback(req, res) {
  const master = req.user;
  if (!master.slug || !master.phone) {
    return res.redirect(process.env.CLIENT_URL + '/onboarding');
  }
  return res.redirect(process.env.CLIENT_URL + '/dashboard');
}

function getMe(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }
  const { google_id, ...safeUser } = req.user;
  return res.json({ user: safeUser });
}

function logout(req, res) {
  req.logout(function(err) {
    if (err) return res.status(500).json({ error: 'Ошибка при выходе' });
    req.session.destroy(function() {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
}

module.exports = { handleGoogleCallback, getMe, logout };
