const express = require('express');
const cors = require('cors');
const config = require('./config');
require('./database/db'); // Inicializa la BD

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'AuthGuard API funcionando 🚀',
    version: '1.0.0',
    endpoints: {
      loginVulnerable: 'POST /api/auth/login-vulnerable',
      loginSeguro: 'POST /api/auth/login'
    }
  });
});

app.listen(config.port, () => {
  console.log(`Servidor corriendo en http://localhost:${config.port}`);
});