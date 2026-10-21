import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WhatsappLink from '../components/WhatsappLink';

const steeringLabels = { hidraulica: 'Hidráulica', eletrica: 'Elétrica', eletrohidraulica: 'Eletro-hidráulica', mecanica: 'Mecânica' };
const statusLabels = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada',
  pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado'
};

export default function ClientDetail() {
  const { id } = useParams();
  const { api, dataVersion } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    plate: '', make: '', model: '', year: '', color: '', steering_type: 'hidraulica', chassis: '', km: '', notes: ''
  });
  const [error, setError] = useState('');

  const loadClient = () => {
    api(`/clients/${id}`).then(data => { setClient(data); setLoading(false); }).catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadClient(); }, [id, dataVersion]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await api('/vehicles', { method: 'POST', body: JSON.stringify({ ...vehicleForm, client_id: id }) });
      setShowVehicleForm(false);
      setVehicleForm({ plate: '', make: '', model: '', year: '', color: '', steering_type: 'hidraulica', chassis: '', km: '', notes: '' });
      loadClient();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm('Excluir este veículo?')) return;
    try {
      await api(`/vehicles/${vehicleId}`, { method: 'DELETE' });
      loadClient();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (loading) return <div className="loading">Carregando...</div>;
  if (!client) return <div className="loading">Cliente não encontrado</div>;

  return (
    <div>
      <div className="page-header">
        <h2>{client.name}</h2>
        <div className="actions">
          <Link to={`/clientes/${id}/editar`} className="btn btn-outline">Editar</Link>
          <Link to={`/orcamentos/novo?client_id=${id}`} className="btn btn-primary">+ Orçamento</Link>
          <Link to={`/ordens/nova?client_id=${id}`} className="btn btn-success">+ Nova OS</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="detail-grid">
        <div>
          {/* Client Info */}
          <div className="card">
            <div className="card-header"><h3>Dados do Cliente</h3></div>
            <div className="detail-info">
              <div className="info-row"><span className="info-label">Tipo:</span><span className="info-value">{client.type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span></div>
              <div className="info-row"><span className="info-label">{client.type === 'pj' ? 'CNPJ' : 'CPF'}:</span><span className="info-value">{client.cpf_cnpj || '-'}</span></div>
              <div className="info-row"><span className="info-label">WhatsApp:</span><span className="info-value"><WhatsappLink phone={client.phone} /></span></div>
              {client.phone2 && <div className="info-row"><span className="info-label">WhatsApp alternativo:</span><span className="info-value"><WhatsappLink phone={client.phone2} /></span></div>}
              <div className="info-row"><span className="info-label">Email:</span><span className="info-value">{client.email || '-'}</span></div>
              <div className="info-row"><span className="info-label">Endereço:</span><span className="info-value">{[client.address, client.neighborhood, client.city, client.state].filter(Boolean).join(', ') || '-'}</span></div>
              {client.notes && <div className="info-row"><span className="info-label">Observações:</span><span className="info-value">{client.notes}</span></div>}
            </div>
          </div>

          {/* Vehicles */}
          <div className="card">
            <div className="card-header">
              <h3>Veículos ({client.vehicles?.length || 0})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowVehicleForm(!showVehicleForm)}>
                {showVehicleForm ? 'Cancelar' : '+ Adicionar Veículo'}
              </button>
            </div>

            {showVehicleForm && (
              <form onSubmit={handleAddVehicle} style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div className="form-grid">
                  <div className="form-group"><label>Placa</label><input value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} /></div>
                  <div className="form-group"><label>Marca *</label><input value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} required /></div>
                  <div className="form-group"><label>Modelo *</label><input value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} required /></div>
                  <div className="form-group"><label>Ano</label><input value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: e.target.value})} /></div>
                  <div className="form-group"><label>Cor</label><input value={vehicleForm.color} onChange={e => setVehicleForm({...vehicleForm, color: e.target.value})} /></div>
                  <div className="form-group">
                    <label>Tipo de Direção</label>
                    <select value={vehicleForm.steering_type} onChange={e => setVehicleForm({...vehicleForm, steering_type: e.target.value})}>
                      <option value="hidraulica">Hidráulica</option>
                      <option value="eletrica">Elétrica</option>
                      <option value="eletrohidraulica">Eletro-hidráulica</option>
                      <option value="mecanica">Mecânica</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Chassis</label><input value={vehicleForm.chassis} onChange={e => setVehicleForm({...vehicleForm, chassis: e.target.value})} /></div>
                  <div className="form-group"><label>KM</label><input value={vehicleForm.km} onChange={e => setVehicleForm({...vehicleForm, km: e.target.value})} /></div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Salvar Veículo</button>
              </form>
            )}

            {client.vehicles?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum veículo cadastrado</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Placa</th><th>Veículo</th><th>Ano</th><th>Direção</th><th>KM</th><th>Ações</th></tr></thead>
                  <tbody>
                    {client.vehicles?.map(v => (
                      <tr key={v.id}>
                        <td><strong>{v.plate || '-'}</strong></td>
                        <td>{v.make} {v.model} {v.color && `(${v.color})`}</td>
                        <td>{v.year || '-'}</td>
                        <td><span className="badge badge-aberta">{steeringLabels[v.steering_type] || v.steering_type}</span></td>
                        <td>{v.km || '-'}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteVehicle(v.id)}>Excluir</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - History */}
        <div>
          <div className="card">
            <div className="card-header"><h3>Histórico de OS</h3></div>
            {client.serviceOrders?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma OS</p>
            ) : (
              client.serviceOrders?.map(so => (
                <div key={so.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/ordens/${so.id}`} style={{ fontWeight: 500 }}>{so.code}</Link>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {so.make} {so.model} {so.plate && `- ${so.plate}`}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span className={`badge badge-${so.status}`}>{statusLabels[so.status]}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(so.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-header"><h3>Orçamentos</h3></div>
            {client.budgets?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum orçamento</p>
            ) : (
              client.budgets?.map(b => (
                <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/orcamentos/${b.id}`} style={{ fontWeight: 500 }}>{b.code}</Link>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{b.make} {b.model}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span className={`badge badge-${b.status}`}>{statusLabels[b.status]}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(b.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
