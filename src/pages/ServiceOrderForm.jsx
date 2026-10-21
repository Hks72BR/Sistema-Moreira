import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WhatsappLink from '../components/WhatsappLink';

export default function ServiceOrderForm() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preClientId = searchParams.get('client_id');

  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState(preClientId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('normal');
  const [kmEntry, setKmEntry] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('');
  const [items, setItems] = useState([{ description: '', type: 'servico', quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === 'offline') {
      api('/users').then(u => setUsers(u.filter(x => x.active))).catch(() => {});
    }
    if (preClientId) {
      loadVehicles(preClientId);
      api(`/clients/${preClientId}`).then(c => setClientSearch(c.name)).catch(() => {});
    }
  }, []);

  const searchClients = async (term) => {
    if (term.length < 2) return;
    const data = await api(`/clients?search=${encodeURIComponent(term)}`);
    setClients(data.clients);
  };

  const loadVehicles = async (cId) => {
    const vehs = await api(`/vehicles/client/${cId}`);
    setVehicles(vehs);
    if (vehs.length === 1) setVehicleId(vehs[0].id);
  };

  const selectClient = (c) => {
    setClientId(c.id);
    setClientSearch(c.name);
    setClients([]);
    loadVehicles(c.id);
  };

  const addItem = () => setItems([...items, { description: '', type: 'servico', quantity: 1, unit_price: 0 }]);
  const updateItem = (index, field, value) => { const n = [...items]; n[index][field] = value; setItems(n); };
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const total = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId || !vehicleId) { setError('Selecione o cliente e o veículo'); return; }
    setSaving(true);
    setError('');
    try {
      const validItems = items.filter(i => i.description && i.unit_price > 0);
      const result = await api('/service-orders', {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          vehicle_id: vehicleId,
          assigned_to: import.meta.env.MODE === 'offline' ? assignedTo || null : assignedToName.trim() || null,
          assigned_to_name: import.meta.env.MODE === 'offline' ? undefined : assignedToName.trim(),
          diagnosis, notes, priority, km_entry: kmEntry, estimated_completion: estimatedCompletion || null,
          items: validItems.length > 0 ? validItems : undefined
        })
      });
      navigate(`/ordens/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h2>Nova Ordem de Serviço</h2></div>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Cliente *</label>
              <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); searchClients(e.target.value); }} placeholder="Digite o nome do cliente..." />
              {clients.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  {clients.map(c => (
                    <div key={c.id} onClick={() => selectClient(c)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <strong>{c.name}</strong>{c.phone && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}><WhatsappLink phone={c.phone} /></span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Veículo *</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                <option value="">Selecione</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year} {v.plate && `- ${v.plate}`} ({v.steering_type})</option>)}
              </select>
            </div>
            {import.meta.env.MODE === 'offline' ? (
              <div className="form-group">
                <label>Técnico Responsável</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">Selecione</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Responsável</label>
                <input value={assignedToName} onChange={e => setAssignedToName(e.target.value)} maxLength={80} />
              </div>
            )}
            <div className="form-group">
              <label>Prioridade</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-group">
              <label>KM de Entrada</label>
              <input value={kmEntry} onChange={e => setKmEntry(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Previsão de Conclusão</label>
              <input type="date" value={estimatedCompletion} onChange={e => setEstimatedCompletion(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Diagnóstico Inicial</label>
            <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Descreva o problema relatado pelo cliente e o diagnóstico inicial..." />
          </div>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16, color: 'var(--text)' }}>Serviços e Peças</h3>
          <div className="items-table">
            <div className="item-row" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>
              <span>Descrição</span><span>Tipo</span><span>Qtd</span><span>Vlr Unit.</span><span>Total</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="item-row">
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Descrição" />
                <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                  <option value="servico">Serviço</option><option value="peca">Peça</option>
                </select>
                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} />
                <span className="item-total">{formatCurrency(item.quantity * item.unit_price)}</span>
                <button type="button" className="btn-remove-item" onClick={() => removeItem(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-add-item" onClick={addItem}>+ Adicionar Item</button>
          </div>
          <div style={{ textAlign: 'right', margin: '12px 0' }}><strong>Total: {formatCurrency(total)}</strong></div>

          <div className="form-group">
            <label>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar OS'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
