import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { api, dataVersion } = useAuth();
  const [reportType, setReportType] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const d = await api(`/reports/monthly?month=${month}&year=${year}`);
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadServicesReport = async () => {
    setLoading(true);
    try {
      const d = await api(`/reports/services?startDate=${year}-01-01&endDate=${year}-12-31`);
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadClientHistory = async (clientId) => {
    setLoading(true);
    try {
      const d = await api(`/reports/client-history/${clientId}`);
      setData(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (term) => {
    if (term.length < 2) return;
    const d = await api(`/clients?search=${encodeURIComponent(term)}`);
    setClients(d.clients);
  };

  const handleGenerate = () => {
    if (reportType === 'monthly') loadMonthlyReport();
    else if (reportType === 'services') loadServicesReport();
    else if (reportType === 'client' && selectedClient) loadClientHistory(selectedClient.id);
  };

  useEffect(() => {
    if (!data) return;
    if (reportType === 'monthly') loadMonthlyReport();
    else if (reportType === 'services') loadServicesReport();
    else if (reportType === 'client' && selectedClient) loadClientHistory(selectedClient.id);
  }, [dataVersion]);

  const statusLabels = {
    aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
    concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada'
  };

  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const steeringLabels = { hidraulica: 'Hidráulica', eletrica: 'Elétrica', eletrohidraulica: 'Eletro-hidráulica', mecanica: 'Mecânica' };

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="page-header">
        <h2>Relatórios</h2>
        {data && <button className="btn btn-primary" onClick={handlePrint}>🖨️ Imprimir</button>}
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tipo de Relatório</label>
            <select value={reportType} onChange={e => { setReportType(e.target.value); setData(null); }}>
              <option value="monthly">Mensal</option>
              <option value="services">Serviços Mais Realizados</option>
              <option value="client">Histórico do Cliente</option>
            </select>
          </div>

          {reportType === 'monthly' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Mês</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthNames[i + 1]}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Ano</label>
                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
              </div>
            </>
          )}

          {reportType === 'services' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ano</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
            </div>
          )}

          {reportType === 'client' && (
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label>Cliente</label>
              <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); searchClients(e.target.value); }} placeholder="Buscar cliente..." />
              {clients.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  {clients.map(c => (
                    <div key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name); setClients([]); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                      <strong>{c.name}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* Monthly Report */}
      {data && reportType === 'monthly' && (
        <div className="card" id="report-content">
          <h3 style={{ marginBottom: 16 }}>Relatório Mensal - {monthNames[data.month]} {data.year}</h3>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-value">{data.totals?.total_os || 0}</div><div className="stat-label">Total de OS</div></div>
            <div className="stat-card"><div className="stat-value">{data.totals?.entregues || 0}</div><div className="stat-label">Entregues</div></div>
            <div className="stat-card"><div className="stat-value">{data.totals?.canceladas || 0}</div><div className="stat-label">Canceladas</div></div>
            <div className="stat-card"><div className="stat-value">{formatCurrency(data.revenue)}</div><div className="stat-label">Faturamento</div></div>
          </div>

          {data.bySteeringType?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 8 }}>Por Tipo de Direção</h4>
              <div style={{ display: 'flex', gap: 12 }}>
                {data.bySteeringType.map(s => (
                  <div key={s.steering_type} className="stat-card" style={{ flex: 1 }}>
                    <div className="stat-value">{s.count}</div>
                    <div className="stat-label">{steeringLabels[s.steering_type] || s.steering_type || 'N/D'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h4 style={{ marginBottom: 8 }}>Ordens de Serviço</h4>
          <table>
            <thead><tr><th>Código</th><th>Cliente</th><th>Veículo</th><th>Técnico</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>
              {data.orders?.map(o => (
                <tr key={o.id}>
                  <td>{o.code}</td><td>{o.client_name}</td>
                  <td>{o.make} {o.model} {o.plate && `- ${o.plate}`}</td>
                  <td>{o.assigned_name || '-'}</td>
                  <td><span className={`badge badge-${o.status}`}>{statusLabels[o.status]}</span></td>
                  <td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Services Report */}
      {data && reportType === 'services' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Serviços Mais Realizados - {year}</h3>
          {data.topServices?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 8 }}>Top Serviços</h4>
              <table>
                <thead><tr><th>Serviço</th><th>Tipo</th><th>Quantidade</th><th>Receita</th></tr></thead>
                <tbody>
                  {data.topServices.map((s, i) => (
                    <tr key={i}><td>{s.description}</td><td>{s.type === 'peca' ? 'Peça' : 'Serviço'}</td><td>{s.count}</td><td>{formatCurrency(s.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.byTechnician?.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 8 }}>Por Técnico</h4>
              <table>
                <thead><tr><th>Técnico</th><th>Total OS</th><th>Entregues</th></tr></thead>
                <tbody>
                  {data.byTechnician.map((t, i) => (
                    <tr key={i}><td>{t.name}</td><td>{t.total_os}</td><td>{t.entregues}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Client History */}
      {data && reportType === 'client' && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Histórico - {data.client?.name}</h3>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-value">{data.orders?.length || 0}</div><div className="stat-label">Total de OS</div></div>
            <div className="stat-card"><div className="stat-value">{data.vehicles?.length || 0}</div><div className="stat-label">Veículos</div></div>
            <div className="stat-card"><div className="stat-value">{formatCurrency(data.totalSpent)}</div><div className="stat-label">Total Gasto</div></div>
          </div>

          <h4 style={{ marginBottom: 8 }}>Veículos</h4>
          <table>
            <thead><tr><th>Placa</th><th>Veículo</th><th>Ano</th><th>Direção</th></tr></thead>
            <tbody>
              {data.vehicles?.map(v => (
                <tr key={v.id}><td>{v.plate || '-'}</td><td>{v.make} {v.model}</td><td>{v.year || '-'}</td><td>{steeringLabels[v.steering_type] || v.steering_type}</td></tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ margin: '20px 0 8px' }}>Ordens de Serviço</h4>
          {data.orders?.map(o => (
            <div key={o.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{o.code}</strong>
                <span className={`badge badge-${o.status}`}>{statusLabels[o.status]}</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {o.make} {o.model} {o.plate && `- ${o.plate}`} | {steeringLabels[o.steering_type]} | {new Date(o.created_at).toLocaleDateString('pt-BR')}
              </div>
              {o.items?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {o.items.map(item => (
                    <div key={item.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>{item.description}</span><span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div style={{ fontWeight: 600, textAlign: 'right', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                    Total: {formatCurrency(o.items.reduce((s, i) => s + i.total, 0))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
