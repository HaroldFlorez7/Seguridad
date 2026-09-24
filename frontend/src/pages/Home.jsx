import { useState } from 'react';
import LoginForm from '../components/LoginForm';
import TwoFactorSetup from '../components/TwoFactorSetup';
import AttemptsHistory from '../components/AttemptsHistory';

function Home() {
  const [mode, setMode] = useState('secure'); // 'secure' | 'vulnerable'

  return (
    <div className="container py-5">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="fw-bold">AuthGuard</h1>
        <p className="text-muted">
          Sistema de Autenticación Segura — Demostración de Seguridad Web
        </p>
      </div>

      {/* Selector de modo */}
      <div className="d-flex justify-content-center mb-4">
        <div className="btn-group" role="group">
          <button
            type="button"
            className={`btn ${mode === 'secure' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setMode('secure')}
          >
            Modo Seguro
          </button>
          <button
            type="button"
            className={`btn ${mode === 'vulnerable' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setMode('vulnerable')}
          >
            Modo Vulnerable
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Login */}
        <div className="col-lg-5">
          <LoginForm mode={mode} />
        </div>

        {/* 2FA + Historial */}
        <div className="col-lg-7">
          <div className="mb-4">
            <TwoFactorSetup />
          </div>
          <AttemptsHistory />
        </div>
      </div>
    </div>
  );
}

export default Home;