import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api/auth',
});

// Login Vulnerable (Acto I)
export const loginVulnerable = (username, password) => {
  return API.post('/login-vulnerable', { username, password });
};

// Login Seguro (Acto II y III)
export const loginSeguro = (username, password, totpCode = null) => {
  return API.post('/login', { username, password, totpCode });
};

// Configurar 2FA
export const setup2FA = (username) => {
  return API.post('/setup-2fa', { username });
};

// Verificar y activar 2FA
export const verify2FA = (username, totpCode) => {
  return API.post('/verify-2fa', { username, totpCode });
};

// Historial de intentos
export const getAttempts = () => {
  return API.get('/attempts');
};