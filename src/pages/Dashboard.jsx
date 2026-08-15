import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const statusLabels = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada',
  pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado'
};

export default function Dashboard() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/reports/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Carregando dashboard...</div>;
  if (!data) return <div className="loading">Erro ao carregar dados</div>;

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="actions">
          <Link to="/orcamentos/novo" className="btn btn-primary"><span className="btn-icon">+</span> Novo Orçamento</Link>
          <Link to="/ordens/nova" className="btn btn-success"><span className="btn-icon">+</span> Nova OS</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(43,127,255,0.12)', color: '#60A5FA' }}>🔧</div>
          <div className="stat-value">{data.osAberta}</div>
          <div className="stat-label">OS em Aberto</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,214,143,0.12)', color: '#00D68F' }}>✅</div>
          <div className="stat-value">{data.osConcluida}</div>
          <div className="stat-label">OS Concluídas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}>📋</div>
          <div className="stat-value">{data.orcPendente}</div>
          <div className="stat-label">Orçamentos Pendentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,214,143,0.12)', color: '#00D68F' }}>💰</div>
          <div className="stat-value">{formatCurrency(data.revenue)}</div>
          <div className="stat-label">Faturamento (30 dias)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}>👥</div>
          <div className="stat-value">{data.totalClients}</div>
          <div className="stat-label">Total de Clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(43,127,255,0.12)', color: '#60A5FA' }}>📦</div>
          <div className="stat-value">{data.osEntregue}</div>
          <div className="stat-label">Entregas (30 dias)</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Últimas Ordens de Serviço</h3>
            <Link to="/ordens" className="btn btn-outline btn-sm">Ver todas</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders?.map(order => (
                  <tr key={order.id}>
                    <td><Link to={`/ordens/${order.id}`}>{order.code}</Link></td>
                    <td>{order.clientName || order.client_name}</td>
                    <td>{order.vehicleInfo} {order.vehiclePlate && `- ${order.vehiclePlate}`}</td>
                    <td><span className={`badge badge-${order.status}`}>{statusLabels[order.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Últimos Orçamentos</h3>
            <Link to="/orcamentos" className="btn btn-outline btn-sm">Ver todos</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBudgets?.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/orcamentos/${b.id}`}>{b.code}</Link></td>
                    <td>{b.clientName || b.client_name}</td>
                    <td>{formatCurrency(b.total)}</td>
                    <td><span className={`badge badge-${b.status}`}>{statusLabels[b.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
