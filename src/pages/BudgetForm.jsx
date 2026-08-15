import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function BudgetForm() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preClientId = searchParams.get('client_id');

  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [clientId, setClientId] = useState(preClientId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState([{ description: '', type: 'servico', quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = subtotal - discount;

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId || !vehicleId) {
      setError('Selecione o cliente e o veículo');
      return;
    }
    if (items.some(i => !i.description || !i.unit_price)) {
      setError('Preencha todos os itens (descrição e valor)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await api('/budgets', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, vehicle_id: vehicleId, items, discount, notes, valid_until: validUntil || null })
      });
      navigate(`/orcamentos/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h2>Novo Orçamento</h2></div>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Cliente *</label>
              <input
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); searchClients(e.target.value); }}
                placeholder="Digite o nome do cliente..."
              />
              {clients.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)'
                }}>
                  {clients.map(c => (
                    <div key={c.id} onClick={() => selectClient(c)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <strong>{c.name}</strong>
                      {c.phone && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{c.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Veículo *</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                <option value="">Selecione o veículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} {v.year} {v.plate && `- ${v.plate}`} ({v.steering_type})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Validade</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Itens do Orçamento</h3>
          <div className="items-table">
            <div className="item-row" style={{ fontWeight: 600, fontSize: 13, color: '#64748b' }}>
              <span>Descrição</span><span>Tipo</span><span>Qtd</span><span>Vlr Unit.</span><span>Total</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="item-row">
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Descrição do serviço/peça" />
                <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}>
                  <option value="servico">Serviço</option>
                  <option value="peca">Peça</option>
                </select>
                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))} />
                <span className="item-total">{formatCurrency(item.quantity * item.unit_price)}</span>
                <button type="button" className="btn-remove-item" onClick={() => removeItem(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-add-item" onClick={addItem}>+ Adicionar Item</button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginTop: 16 }}>
            <div><span style={{ color: '#64748b' }}>Subtotal: </span><strong>{formatCurrency(subtotal)}</strong></div>
            <div>
              <span style={{ color: '#64748b' }}>Desconto: R$ </span>
              <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))} style={{ width: 100 }} />
            </div>
            <div><span style={{ color: '#64748b' }}>Total: </span><strong style={{ fontSize: 18, color: 'var(--primary)' }}>{formatCurrency(total)}</strong></div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre o orçamento..." />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar Orçamento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
