const express = require('express');
const router = express.Router();
const { loginVulnerable, loginSeguro } = require('../controllers/authController');

// Ruta vulnerable (Acto I)
router.post('/login-vulnerable', loginVulnerable);

// Ruta segura (Acto II y III)
router.post('/login', loginSeguro);

module.exports = router;