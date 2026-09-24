require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'clave_secreta_temporal',
  dbPath: './database/authguard.db'
};