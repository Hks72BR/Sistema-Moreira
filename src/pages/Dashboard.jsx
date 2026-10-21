import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';

const statusLabels = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada',
  pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado'
};

export default function Dashboard() {
  const { api, dataVersion } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/reports/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, [dataVersion]);

  if (loading) return <div className="loading">Carregando dashboard...</div>;
  if (!data) return <div className="loading">Erro ao carregar dados</div>;

  const formatVehicle = (item) => {
    const info = item.vehicleInfo || [item.make || item.vehicleMake, item.model || item.vehicleModel].filter(Boolean).join(' ');
    const plate = item.vehiclePlate || item.plate;
    return [info, plate].filter(Boolean).join(' - ') || '-';
  };

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
          <div className="stat-icon stat-icon-blue"><Icon name="wrench" /></div>
          <div className="stat-value">{data.osAberta}</div>
          <div className="stat-label">OS em Aberto</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Icon name="check" /></div>
          <div className="stat-value">{data.osConcluida}</div>
          <div className="stat-label">OS Concluídas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-gold"><Icon name="clipboard" /></div>
          <div className="stat-value">{data.orcPendente}</div>
          <div className="stat-label">Orçamentos Pendentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-gold"><Icon name="clients" /></div>
          <div className="stat-value">{data.totalClients}</div>
          <div className="stat-label">Total de Clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><Icon name="package" /></div>
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
                    <td>{formatVehicle(order)}</td>
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
                  <th>Veículo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBudgets?.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/orcamentos/${b.id}`}>{b.code}</Link></td>
                    <td>{b.clientName || b.client_name}</td>
                    <td>{formatVehicle(b)}</td>
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
