import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const statusLabels = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado', expirado: 'Expirado' };

export default function Budgets() {
  const { api } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api(`/budgets?${params}`);
      setBudgets(data.budgets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBudgets(); }, [statusFilter]);

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div>
      <div className="page-header">
        <h2>Orçamentos</h2>
        <Link to="/orcamentos/novo" className="btn btn-primary">+ Novo Orçamento</Link>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Buscar por cliente, código ou placa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadBudgets()}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
          <button className="btn btn-primary" onClick={loadBudgets}>Buscar</button>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : budgets.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>Nenhum orçamento encontrado</h3>
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
                  <th>Total</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/orcamentos/${b.id}`} style={{ fontWeight: 500 }}>{b.code}</Link></td>
                    <td>{b.client_name}</td>
                    <td>{b.make} {b.model} {b.plate && `- ${b.plate}`}</td>
                    <td>{b.steering_type || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(b.total)}</td>
                    <td><span className={`badge badge-${b.status}`}>{statusLabels[b.status]}</span></td>
                    <td>{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                    <td><Link to={`/orcamentos/${b.id}`} className="btn btn-outline btn-sm">Ver</Link></td>
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
