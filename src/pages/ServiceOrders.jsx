import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const statusLabels = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada'
};

export default function ServiceOrders() {
  const { api } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api(`/service-orders?${params}`);
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [statusFilter]);

  return (
    <div>
      <div className="page-header">
        <h2>Ordens de Serviço</h2>
        <Link to="/ordens/nova" className="btn btn-primary">+ Nova OS</Link>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por cliente, código ou placa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadOrders()}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos os status</option>
            <option value="aberta">Aberta</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="aguardando_peca">Aguardando Peça</option>
            <option value="concluida">Concluída</option>
            <option value="entregue">Entregue</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button className="btn btn-primary" onClick={loadOrders}>Buscar</button>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔧</div>
            <h3>Nenhuma OS encontrada</h3>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Direção</th>
                  <th>Técnico</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><Link to={`/ordens/${o.id}`} style={{ fontWeight: 500 }}>{o.code}</Link></td>
                    <td>{o.client_name}</td>
                    <td>{o.make} {o.model} {o.plate && `- ${o.plate}`}</td>
                    <td>{o.steering_type || '-'}</td>
                    <td>{o.assigned_name || '-'}</td>
                    <td><span className={`badge badge-${o.status}`}>{statusLabels[o.status]}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                    <td><Link to={`/ordens/${o.id}`} className="btn btn-outline btn-sm">Ver</Link></td>
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
