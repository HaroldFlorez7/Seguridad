const express = require('express');
const router = express.Router();

const {
  loginVulnerable,
  loginSeguro,
  setup2FA,
  verify2FA,
  getLoginAttempts
} = require('../controllers/authController');

// Acto I - Versión vulnerable
router.post('/login-vulnerable', loginVulnerable);

// Acto II y III - Versión segura
router.post('/login', loginSeguro);

// Configurar 2FA (genera el QR)
router.post('/setup-2fa', setup2FA);

// Confirmar y activar 2FA
router.post('/verify-2fa', verify2FA);

// Historial de intentos (útil para mostrar en la demo)
router.get('/attempts', getLoginAttempts);

module.exports = router;