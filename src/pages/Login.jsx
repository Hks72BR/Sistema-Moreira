import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <video
        className="login-video-bg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/mechanic-bg.mp4" type="video/mp4" />
      </video>
      <div className="login-video-overlay" />

      <div className="login-card">
        <img src="/logo.png" alt="Moreira Direções" className="login-logo" />
        <p className="subtitle">Sistema de Gestão</p>
        {import.meta.env.MODE !== 'offline' && (
          <p className="subtitle">
            Informe seu nome para identificar seus atendimentos e registros no sistema.
          </p>
        )}
        {import.meta.env.MODE === 'offline' && (
          <p role="status">Demonstracao offline — dados somente neste computador, sem sincronizacao.</p>
        )}
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{import.meta.env.MODE === 'offline' ? 'Usuário' : 'Seu nome'}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={import.meta.env.MODE === 'offline' ? 'Digite seu usuário' : 'Digite seu nome'}
              required
              autoFocus
              maxLength={80}
            />
          </div>
          {import.meta.env.MODE === 'offline' && (
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
