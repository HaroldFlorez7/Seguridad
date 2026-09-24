const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const config = require('../config');

// ============================================
// ACTO I → LOGIN VULNERABLE (SQL Injection)
// ============================================
const loginVulnerable = (req, res) => {
  const { username, password } = req.body;

  // ¡PELIGROSO! Concatenación directa
  const query = `SELECT * FROM users WHERE username = '${username}'`;

  try {
    const user = db.prepare(query).get();

    if (user) {
      return res.json({
        success: true,
        message: '¡Login exitoso con SQL Injection! (versión VULNERABLE)',
        warning: 'Esto no debería ser posible. La aplicación es insegura.',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Usuario o contraseña incorrectos'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ============================================
// ACTO II y III → LOGIN SEGURO
// ============================================
const loginSeguro = (req, res) => {
  const { username, password, totpCode } = req.body;

  try {
    // 1. Buscar usuario (consulta preparada → protege de SQLi)
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // 2. Verificar si la cuenta está bloqueada
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Cuenta bloqueada temporalmente. Intenta después de ${lockedUntil.toLocaleString()}`
        });
      } else {
        // Ya expiró el bloqueo → desbloquear
        db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      }
    }

    // 3. Verificar contraseña
    const passwordOk = bcrypt.compareSync(password, user.password);

    if (!passwordOk) {
      const newAttempts = user.failed_attempts + 1;
      let lockedUntil = null;

      if (newAttempts >= 3) {
        // Bloquear por 2 minutos
        lockedUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      }

      db.prepare(`
        UPDATE users 
        SET failed_attempts = ?, locked_until = ? 
        WHERE id = ?
      `).run(newAttempts, lockedUntil, user.id);

      // Guardar intento fallido
      db.prepare(`
        INSERT INTO login_attempts (user_id, username, success)
        VALUES (?, ?, 0)
      `).run(user.id, username);

      if (newAttempts >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Cuenta bloqueada por múltiples intentos fallidos. Espera 2 minutos.'
        });
      }

      return res.status(401).json({
        success: false,
        message: `Credenciales incorrectas. Intentos restantes: ${3 - newAttempts}`
      });
    }

    // 4. Contraseña correcta → resetear intentos fallidos
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    // 5. ¿El usuario tiene 2FA activado?
    if (user.two_factor_enabled === 1) {
      // Si no enviaron el código TOTP, pedirlo
      if (!totpCode) {
        return res.status(200).json({
          success: false,
          require2FA: true,
          message: 'Se requiere código de autenticación de dos factores'
        });
      }

      // Verificar el código TOTP
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1 // permite 30 segundos de tolerancia
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Código 2FA incorrecto'
        });
      }
    }

    // 6. Todo correcto → generar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // Registrar intento exitoso
    db.prepare(`
      INSERT INTO login_attempts (user_id, username, success)
      VALUES (?, ?, 1)
    `).run(user.id, username);

    return res.json({
      success: true,
      message: 'Login exitoso (versión SEGURA)',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        twoFactorEnabled: user.two_factor_enabled === 1
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ============================================
// ACTIVAR 2FA (generar secreto + QR)
// ============================================
const setup2FA = (req, res) => {
  const { username } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Generar secreto
    const secret = speakeasy.generateSecret({
      name: `AuthGuard (${user.username})`
    });

    // Guardar el secreto (aún no activamos 2FA)
    db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?')
      .run(secret.base32, user.id);

    // Generar código QR
    qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error generando QR' });
      }

      return res.json({
        success: true,
        message: 'Escanea este código QR con Google Authenticator',
        secret: secret.base32,
        qrCode: dataUrl
      });
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ============================================
// CONFIRMAR Y ACTIVAR 2FA
// ============================================
const verify2FA = (req, res) => {
  const { username, totpCode } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        message: 'Primero debes configurar el 2FA'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Código incorrecto. Intenta de nuevo.'
      });
    }

    // Activar 2FA
    db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(user.id);

    return res.json({
      success: true,
      message: '¡2FA activado correctamente!'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ============================================
// VER HISTORIAL DE INTENTOS (útil para la demo)
// ============================================
const getLoginAttempts = (req, res) => {
  try {
    const attempts = db.prepare(`
      SELECT username, success, created_at 
      FROM login_attempts 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();

    return res.json({
      success: true,
      attempts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo intentos'
    });
  }
};

module.exports = {
  loginVulnerable,
  loginSeguro,
  setup2FA,
  verify2FA,
  getLoginAttempts
};