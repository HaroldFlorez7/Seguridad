const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

// ============================================
// VERSIÓN VULNERABLE (Acto I) - SOLO PARA DEMO
// ============================================
const loginVulnerable = (req, res) => {
  const { username, password } = req.body;

  // ¡PELIGROSO! Concatenación directa → permite SQL Injection
  // En esta versión solo validamos el username para que el ataque se vea claro
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
    } else {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
};

// ============================================
// VERSIÓN SEGURA (Acto III)
// ============================================
const loginSeguro = (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Buscar usuario con consulta preparada (protege de SQLi)
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
          message: `Cuenta bloqueada. Intenta después de ${lockedUntil.toLocaleString()}`
        });
      } else {
        // Ya pasó el tiempo de bloqueo → desbloquear
        db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
      }
    }

    // 3. Verificar contraseña (bcrypt)
    const passwordOk = bcrypt.compareSync(password, user.password);

    if (!passwordOk) {
      // Aumentar intentos fallidos
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

      // Registrar el intento fallido
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
        message: `Usuario o contraseña incorrectos. Intentos restantes: ${3 - newAttempts}`
      });
    }

    // 4. Contraseña correcta → resetear intentos
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    // Registrar intento exitoso
    db.prepare(`
      INSERT INTO login_attempts (user_id, username, success)
      VALUES (?, ?, 1)
    `).run(user.id, username);

    // 5. Generar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

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

module.exports = {
  loginVulnerable,
  loginSeguro
};