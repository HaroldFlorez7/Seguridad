import { useState } from 'react';
import { setup2FA, verify2FA } from '../services/api';

function TwoFactorSetup() {
  const [username, setUsername] = useState('admin');
  const [qrCode, setQrCode] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1); // 1 = pedir QR, 2 = verificar

  const handleSetup = async () => {
    try {
      const response = await setup2FA(username);
      setQrCode(response.data.qrCode);
      setStep(2);
      setMessage({ type: 'info', text: 'Escanea el código QR con Google Authenticator' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error al generar QR' 
      });
    }
  };

  const handleVerify = async () => {
    try {
      const response = await verify2FA(username, totpCode);
      setMessage({ type: 'success', text: response.data.message });
      setStep(3);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Código incorrecto' 
      });
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body p-4">
        <h4 className="card-title mb-3">Configurar 2FA</h4>

        {step === 1 && (
          <>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <button className="btn btn-primary w-100" onClick={handleSetup}>
              Generar Código QR
            </button>
          </>
        )}

        {step === 2 && qrCode && (
          <>
            <div className="text-center mb-3">
              <img src={qrCode} alt="QR Code" style={{ maxWidth: '220px' }} />
            </div>
            <div className="mb-3">
              <label className="form-label">Código de Google Authenticator</label>
              <input
                type="text"
                className="form-control"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                maxLength="6"
              />
            </div>
            <button className="btn btn-success w-100" onClick={handleVerify}>
              Activar 2FA
            </button>
          </>
        )}

        {step === 3 && (
          <div className="alert alert-success mb-0">
            2FA activado correctamente. Ya puedes usarlo en el Login Seguro.
          </div>
        )}

        {message && step !== 3 && (
          <div className={`alert mt-3 mb-0 alert-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'danger'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default TwoFactorSetup;