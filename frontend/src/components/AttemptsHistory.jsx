import { useState, useEffect } from 'react';
import { getAttempts } from '../services/api';

function AttemptsHistory() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const response = await getAttempts();
      setAttempts(response.data.attempts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  return (
    <div className="card shadow-sm">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="card-title mb-0">Historial de Intentos</h4>
          <button className="btn btn-sm btn-outline-primary" onClick={loadAttempts}>
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-muted">Cargando...</p>
        ) : attempts.length === 0 ? (
          <p className="text-muted">No hay intentos registrados</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt, index) => (
                  <tr key={index}>
                    <td>{attempt.username}</td>
                    <td>
                      <span className={`badge ${attempt.success ? 'bg-success' : 'bg-danger'}`}>
                        {attempt.success ? 'Exitoso' : 'Fallido'}
                      </span>
                    </td>
                    <td>
                      <small>{new Date(attempt.created_at).toLocaleString()}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttemptsHistory;