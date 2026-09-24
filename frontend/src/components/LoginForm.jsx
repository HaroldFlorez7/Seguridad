import { useState } from 'react';
import { loginVulnerable, loginSeguro } from '../services/api';

function LoginForm({ mode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let response;

      if (mode === 'vulnerable') {
        response = await loginVulnerable(username, password);
      } else {
        response = await loginSeguro(username, password, totpCode || null);
      }

      const data = response.data;

      if (data.require2FA) {
        setRequire2FA(true);
        setMessage({ type: 'info', text: data.message });
      } else if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message + (data.user ? ` | Rol: ${data.user.role}` : '') 
        });
        setRequire2FA(false);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error de conexión con el servidor';
      setMessage({ type: 'error', text: msg });
      
      if (msg.toLowerCase().includes('bloqueada')) {
        setRequire2FA(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body p-4">
        <h4 className="card-title mb-3">
          {mode === 'vulnerable' ? 'Login Vulnerable' : 'Login Seguro'}
        </h4>

        {mode === 'vulnerable' && (
          <div className="alert alert-warning py-2">
            <small>Modo de demostración: permite SQL Injection</small>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Usuario</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
              required
            />
          </div>

          {require2FA && (
            <div className="mb-3">
              <label className="form-label">Código 2FA</label>
              <input
                type="text"
                className="form-control"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                maxLength="6"
                required
              />
              <div className="form-text">Abre Google Authenticator e ingresa el código</div>
            </div>
          )}

          <button 
            type="submit" 
            className={`btn w-100 ${mode === 'vulnerable' ? 'btn-danger' : 'btn-primary'}`}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {message && (
          <div className={`alert mt-3 mb-0 alert-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'danger'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginForm;