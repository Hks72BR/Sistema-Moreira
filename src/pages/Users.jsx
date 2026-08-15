import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const roleLabels = { admin: 'Administrador', gerente: 'Gerente', tecnico: 'Técnico', atendente: 'Atendente' };

export default function Users() {
  const { api, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'tecnico' });
  const [error, setError] = useState('');
  const [resetPwdId, setResetPwdId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const loadUsers = () => api('/users').then(setUsers).catch(console.error);
  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ username: '', password: '', name: '', role: 'tecnico' });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (userId, active) => {
    try {
      await api(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ active: active ? 0 : 1 }) });
      loadUsers();
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    try {
      const result = await api(`/users/${resetPwdId}/reset-password`, { method: 'PUT', body: JSON.stringify({}) });
      setResetPwdId(null);
      alert(result.message || 'Email de redefinição de senha enviado com sucesso');
    } catch (err) {
      alert('Erro ao enviar email de reset: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'gerente') {
    return <div className="card"><p>Acesso restrito a administradores.</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Usuários</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Novo Usuário</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-group">
                <label>Nome *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Usuário (login) *</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Senha *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="tecnico">Técnico</option>
                  <option value="atendente">Atendente</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Criar Usuário</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr><th>Nome</th><th>Usuário</th><th>Cargo</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.name}</td>
                <td>{u.username}</td>
                <td>{roleLabels[u.role]}</td>
                <td>
                  <span className={`badge ${u.active ? 'badge-aprovado' : 'badge-cancelada'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => { setResetPwdId(u.id); setNewPassword(''); }}>Resetar Senha</button>
                    {u.id !== currentUser.id && (
                      <button className={`btn btn-sm ${u.active ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleActive(u.id, u.active)}>
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetPwdId && (
        <div className="modal-overlay" onClick={() => setResetPwdId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Resetar Senha</h3>
            <p style={{ marginBottom: 16 }}>
              Um email de redefinição de senha será enviado para o usuário <strong>{users.find(u => u.id === resetPwdId)?.name}</strong>.
            </p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              O usuário receberá um link por email para criar uma nova senha. Caso o email não seja real (@moreira.app), oriente o usuário a trocar a senha em Configurações.
            </p>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setResetPwdId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={resetLoading}>
                {resetLoading ? 'Enviando...' : 'Enviar Email de Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
