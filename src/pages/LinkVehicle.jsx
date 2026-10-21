import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LinkVehicle() {
  const { clientId } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  
  const [client, setClient] = useState(null);
  const [form, setForm] = useState({
    plate: '', make: '', model: '', year: '', color: '', steering_type: 'hidraulica', chassis: '', km: '', notes: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/clients/${clientId}?basic=true`)
      .then(data => setClient(data))
      .catch(err => setError(err.message));
  }, [clientId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api('/vehicles', { method: 'POST', body: JSON.stringify({ ...form, client_id: clientId }) });
      navigate(`/clientes/${clientId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate(`/clientes/${clientId}`);
  };

  if (!client) return <div className="loading">Carregando cliente...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Vincular Veículo</h2>
        <p style={{ color: '#64748b', marginTop: 4 }}>Cliente: <strong>{client.name}</strong></p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        
        <p style={{ marginBottom: 24, color: '#475569' }}>
          Adicione um veículo para este cliente. Você pode adicionar mais veículos depois na página de detalhes.
        </p>

        <form onSubmit={handleAddVehicle}>
          <div className="form-grid">
            <div className="form-group">
              <label>Placa</label>
              <input name="plate" value={form.plate} onChange={handleChange} placeholder="ABC-1234" />
            </div>
            <div className="form-group">
              <label>Marca *</label>
              <input name="make" value={form.make} onChange={handleChange} required placeholder="ex: Ford" />
            </div>
            <div className="form-group">
              <label>Modelo *</label>
              <input name="model" value={form.model} onChange={handleChange} required placeholder="ex: Fiesta" />
            </div>
            <div className="form-group">
              <label>Ano</label>
              <input name="year" value={form.year} onChange={handleChange} placeholder="2023" />
            </div>
            <div className="form-group">
              <label>Cor</label>
              <input name="color" value={form.color} onChange={handleChange} placeholder="ex: Branco" />
            </div>
            <div className="form-group">
              <label>Tipo de Direção</label>
              <select name="steering_type" value={form.steering_type} onChange={handleChange}>
                <option value="hidraulica">Hidráulica</option>
                <option value="eletrica">Elétrica</option>
                <option value="eletrohidraulica">Eletro-hidráulica</option>
                <option value="mecanica">Mecânica</option>
              </select>
            </div>
            <div className="form-group">
              <label>Chassis</label>
              <input name="chassis" value={form.chassis} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>KM</label>
              <input name="km" value={form.km} onChange={handleChange} type="number" />
            </div>
          </div>
          
          <div className="form-group">
            <label>Observações</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Veículo'}
            </button>
            <button type="button" className="btn btn-outline" onClick={handleSkip} disabled={saving}>
              Pular por enquanto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
