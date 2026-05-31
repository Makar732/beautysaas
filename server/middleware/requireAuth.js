// Этот middleware проверяет что пользователь вошёл в систему
// Если нет — возвращает ошибку 401

function requireAuth(req, res, next) {
  // req.isAuthenticated() — метод от Passport.js
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next(); // всё ок, пропускаем дальше
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Войдите через Google чтобы продолжить',
  });
}

module.exports = { requireAuth };