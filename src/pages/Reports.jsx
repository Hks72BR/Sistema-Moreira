import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import {
  formatBRL,
  printFinancialReport,
  downloadFinancialReportPDF,
  printServiceOrder,
  printBudget,
} from '../lib/printer';

const monthNames = [
  'Ano Inteiro',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const shortMonths = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const statusLabels = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
};

const budgetStatusLabels = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

const steeringLabels = {
  hidraulica: 'Hidráulica',
  eletrica: 'Elétrica',
  eletrohidraulica: 'Eletro-hidráulica',
  mecanica: 'Mecânica',
};

export default function Reports() {
  const { api, dataVersion } = useAuth();
  const now = new Date();

  const [activeTab, setActiveTab] = useState('overview'); // overview | entries | services | client
  const [month, setMonth] = useState(now.getMonth() + 1); // 0 = Ano Inteiro, 1..12 = Mês
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);

  // Filtros interativos na aba de Lançamentos
  const [osStatusFilter, setOsStatusFilter] = useState('all'); // all | paid | open | canceled
  const [searchTerm, setSearchTerm] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // all | servico | peca

  // Aba Financeiro por Cliente
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);
  const [loadingClient, setLoadingClient] = useState(false);

  const periodLabel = month === 0 ? `Ano de ${year}` : `${monthNames[month]} de ${year}`;

  const loadFinancialData = async (targetMonth = month, targetYear = year) => {
    setLoading(true);
    try {
      const report = await api(`/reports/monthly?month=${targetMonth}&year=${targetYear}`);
      setData(report);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api('/settings').then(s => { if (s) setCompany(s); }).catch(() => {});
  }, []);

  useEffect(() => {
    loadFinancialData(month, year);
  }, [month, year, dataVersion]);

  const loadClientFinancials = async (clientObj) => {
    if (!clientObj?.id) return;
    setSelectedClient(clientObj);
    setClientSearch(clientObj.name || '');
    setClients([]);
    setLoadingClient(true);
    try {
      const history = await api(`/reports/client-history/${clientObj.id}`);
      setClientHistory(history);
    } catch (err) {
      console.error('Erro ao carregar histórico financeiro do cliente:', err);
    } finally {
      setLoadingClient(false);
    }
  };

  useEffect(() => {
    if (selectedClient?.id && activeTab === 'client') {
      loadClientFinancials(selectedClient);
    }
  }, [dataVersion]);

  const searchClients = async (term) => {
    if (term.length < 2) {
      setClients([]);
      return;
    }
    try {
      const res = await api(`/clients?search=${encodeURIComponent(term)}`);
      setClients(res.clients || []);
    } catch (err) {
      console.error(err);
    }
  };

  const selectThisMonth = () => {
    const current = new Date();
    setMonth(current.getMonth() + 1);
    setYear(current.getFullYear());
  };

  const selectPreviousMonth = () => {
    const current = new Date();
    const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    setMonth(prev.getMonth() + 1);
    setYear(prev.getFullYear());
  };

  const selectFullYear = () => {
    setMonth(0);
  };

  const handlePrintBudgetItem = async (budgetRow) => {
    try {
      const fullBudget = budgetRow.items ? budgetRow : await api(`/budgets/${budgetRow.id}`);
      printBudget(fullBudget, company);
    } catch (err) {
      alert('Erro ao preparar impressão do orçamento: ' + err.message);
    }
  };

  // Filtragem de OS na aba Lançamentos
  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    return data.orders.filter(o => {
      if (osStatusFilter === 'paid' && !['concluida', 'entregue'].includes(o.status)) return false;
      if (osStatusFilter === 'open' && !['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status)) return false;
      if (osStatusFilter === 'canceled' && o.status !== 'cancelada') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          (o.code || '').toLowerCase().includes(q) ||
          (o.client_name || '').toLowerCase().includes(q) ||
          (o.plate || '').toLowerCase().includes(q) ||
          (o.make || '').toLowerCase().includes(q) ||
          (o.model || '').toLowerCase().includes(q) ||
          (o.assigned_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [data?.orders, osStatusFilter, searchTerm]);

  const filteredTopServices = useMemo(() => {
    if (!data?.topServices) return [];
    if (itemTypeFilter === 'all') return data.topServices;
    return data.topServices.filter(s =>
      itemTypeFilter === 'peca' ? s.type === 'peca' : s.type !== 'peca'
    );
  }, [data?.topServices, itemTypeFilter]);

  // Clientes recentes do período para seleção rápida
  const periodClients = useMemo(() => {
    if (!data?.orders) return [];
    const map = new Map();
    for (const o of data.orders) {
      const cid = o.client_id || o.clientId;
      if (!cid) continue;
      if (!map.has(cid)) {
        map.set(cid, { id: cid, name: o.client_name || 'Cliente', total: 0, count: 0 });
      }
      const entry = map.get(cid);
      entry.count += 1;
      if (['concluida', 'entregue'].includes(o.status)) {
        entry.total += o.total || 0;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data?.orders]);

  const revenue = data?.revenue || 0;
  const servicesRev = data?.servicesRevenue || 0;
  const partsRev = data?.partsRevenue || 0;
  const servicesPct = revenue > 0 ? Math.round((servicesRev / revenue) * 100) : 0;
  const partsPct = revenue > 0 ? 100 - servicesPct : 0;
  const maxMonthRevenue = Math.max(
    1,
    ...(data?.yearlyBreakdown || []).map(m => Math.max(m.revenue || 0, m.inProgressRevenue || 0))
  );

  return (
    <div>
      {/* Cabeçalho com Ações de Impressão e PDF */}
      <div className="page-header">
        <div>
          <h2>Financeiro</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
            Controle de faturamento, fluxo de ordens de serviço, orçamentos, peças e mão de obra — <strong>{periodLabel}</strong>
          </p>
        </div>
        {data && (
          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={() => printFinancialReport(data, periodLabel, company)}
            >
              <Icon name="printer" /> Imprimir Financeiro
            </button>
            <button
              className="btn btn-outline"
              onClick={() => downloadFinancialReportPDF(data, periodLabel, company)}
            >
              <Icon name="file" /> Baixar PDF
            </button>
          </div>
        )}
      </div>

      {/* Barra de Período e Atalhos Rápidos */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mês / Período</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                <option value={0}>Ano Inteiro ({year})</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{monthNames[i + 1]}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ano</label>
              <input
                type="number"
                min="2020"
                max="2035"
                value={year}
                onChange={e => setYear(Number(e.target.value) || now.getFullYear())}
                style={{ width: 105 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${month === now.getMonth() + 1 && year === now.getFullYear() ? 'btn-primary' : 'btn-outline'}`}
                onClick={selectThisMonth}
              >
                Este Mês
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={selectPreviousMonth}
              >
                Mês Passado
              </button>
              <button
                type="button"
                className={`btn btn-sm ${month === 0 ? 'btn-primary' : 'btn-outline'}`}
                onClick={selectFullYear}
              >
                Ano {year}
              </button>
            </div>
          </div>

          {/* Abas de Navegação do Financeiro */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Visão Geral & Caixa
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'entries' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('entries')}
            >
              📋 Lançamentos ({data?.orders?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'services' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('services')}
            >
              🔧 Serviços, Peças & Equipe
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'client' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('client')}
            >
              👤 Extrato por Cliente
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="loading">Calculando movimentação financeira...</div>}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ABA 1: VISÃO GERAL & CAIXA
         ═══════════════════════════════════════════════════════════════════════════ */}
      {!loading && data && activeTab === 'overview' && (
        <>
          {/* Cards de Indicadores Financeiros Principais */}
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card" onClick={() => { setOsStatusFilter('paid'); setActiveTab('entries'); }} style={{ cursor: 'pointer' }} title="Clique para ver as OS faturadas">
              <div className="stat-icon stat-icon-green"><Icon name="coins" /></div>
              <div className="stat-label">Faturamento Realizado (Caixa)</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{formatBRL(data.revenue)}</div>
            </div>

            <div className="stat-card" onClick={() => { setOsStatusFilter('open'); setActiveTab('entries'); }} style={{ cursor: 'pointer' }} title="Clique para ver as OS em execução">
              <div className="stat-icon stat-icon-gold"><Icon name="clock" /></div>
              <div className="stat-label">Em Execução / A Receber ({data.totals?.em_andamento || 0} OS)</div>
              <div className="stat-value" style={{ color: 'var(--gold)' }}>{formatBRL(data.inProgressRevenue)}</div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab('entries')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon stat-icon-blue"><Icon name="clipboard" /></div>
              <div className="stat-label">Orçamentos Pendentes ({data.budgetsSummary?.pending_count || 0})</div>
              <div className="stat-value">{formatBRL(data.budgetsSummary?.pending_total || 0)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-gold"><Icon name="reports" /></div>
              <div className="stat-label">Ticket Médio por OS</div>
              <div className="stat-value">{formatBRL(data.averageTicket)}</div>
            </div>

            <div className="stat-card" onClick={() => { setItemTypeFilter('servico'); setActiveTab('services'); }} style={{ cursor: 'pointer' }}>
              <div className="stat-icon stat-icon-blue"><Icon name="wrench" /></div>
              <div className="stat-label">Receita Mão de Obra ({servicesPct}%)</div>
              <div className="stat-value">{formatBRL(data.servicesRevenue)}</div>
            </div>

            <div className="stat-card" onClick={() => { setItemTypeFilter('peca'); setActiveTab('services'); }} style={{ cursor: 'pointer' }}>
              <div className="stat-icon stat-icon-green"><Icon name="package" /></div>
              <div className="stat-label">Receita de Peças ({partsPct}%)</div>
              <div className="stat-value">{formatBRL(data.partsRevenue)}</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            {/* Composição do Caixa */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <h3>Composição do Faturamento e Caixa</h3>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>🔧 Mão de Obra / Serviços: <strong>{formatBRL(servicesRev)}</strong> ({servicesPct}%)</span>
                  <span>⚙️ Peças: <strong>{formatBRL(partsRev)}</strong> ({partsPct}%)</span>
                </div>
                <div style={{ height: 12, background: 'var(--bg-surface)', borderRadius: 6, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                  <div style={{ width: `${servicesPct}%`, background: '#2b7fff', transition: 'width 0.3s' }} />
                  <div style={{ width: `${partsPct}%`, background: 'var(--gold)', transition: 'width 0.3s' }} />
                </div>
              </div>

              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label" style={{ width: 220 }}>Veículos Entregues ({data.totals?.entregues || 0} OS):</span>
                  <span className="info-value" style={{ fontWeight: 700, color: 'var(--success)' }}>{formatBRL(data.deliveredRevenue)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 220 }}>Concluídas / Aguard. Retirada ({data.totals?.concluidas || 0} OS):</span>
                  <span className="info-value" style={{ fontWeight: 700, color: 'var(--info)' }}>{formatBRL(data.awaitingPickupRevenue)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 220 }}>Em Execução na Oficina ({data.totals?.em_andamento || 0} OS):</span>
                  <span className="info-value" style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatBRL(data.inProgressRevenue)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 220 }}>OS Canceladas ({data.totals?.canceladas || 0} OS):</span>
                  <span className="info-value" style={{ color: 'var(--danger)' }}>{formatBRL(data.canceledRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Desempenho Comercial de Orçamentos */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <h3>Funil Financeiro de Orçamentos</h3>
                <span className="badge badge-aprovado">
                  Conversão: {data.budgetsSummary?.conversion_rate || 0}%
                </span>
              </div>
              <div className="detail-info">
                <div className="info-row">
                  <span className="info-label" style={{ width: 210 }}>Aprovados ({data.budgetsSummary?.approved_count || 0}):</span>
                  <span className="info-value" style={{ fontWeight: 700, color: 'var(--success)' }}>
                    {formatBRL(data.budgetsSummary?.approved_total || 0)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 210 }}>Pendentes ({data.budgetsSummary?.pending_count || 0}):</span>
                  <span className="info-value" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    {formatBRL(data.budgetsSummary?.pending_total || 0)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 210 }}>Recusados / Expirados ({data.budgetsSummary?.rejected_count || 0}):</span>
                  <span className="info-value" style={{ color: 'var(--danger)' }}>
                    {formatBRL(data.budgetsSummary?.rejected_total || 0)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label" style={{ width: 210 }}>Total de Descontos Concedidos:</span>
                  <span className="info-value" style={{ color: 'var(--text-secondary)' }}>
                    {formatBRL(data.budgetsSummary?.discount_total || 0)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <Link to="/orcamentos/novo" className="btn btn-outline btn-sm">+ Novo Orçamento</Link>
              </div>
            </div>
          </div>

          {/* Gráfico Anual Mês a Mês (Clicável) */}
          {data.yearlyBreakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Evolução de Faturamento em {year} (Clique em um mês para filtrar)</h3>
                {month !== 0 && (
                  <button className="btn btn-outline btn-sm" onClick={selectFullYear}>
                    Ver Ano Inteiro
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(52px, 1fr))', gap: 8, alignItems: 'end', height: 170, paddingTop: 20, overflowX: 'auto' }}>
                {data.yearlyBreakdown.map(item => {
                  const isSelected = month === item.month;
                  const heightPct = Math.max(6, Math.round((item.revenue / maxMonthRevenue) * 100));
                  return (
                    <div
                      key={item.month}
                      onClick={() => setMonth(item.month)}
                      title={`${monthNames[item.month]}: ${formatBRL(item.revenue)} (${item.completedCount} OS finalizadas)`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '6px 4px',
                        borderRadius: 6,
                        background: isSelected ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                        border: isSelected ? '1px solid var(--gold)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: 10, color: item.revenue > 0 ? 'var(--text)' : 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                        {item.revenue > 0 ? formatBRL(item.revenue).replace(',00', '') : '-'}
                      </span>
                      <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '68%',
                            height: `${heightPct}%`,
                            background: isSelected ? 'var(--gold)' : item.revenue > 0 ? '#376d50' : 'var(--border)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.25s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--gold)' : 'var(--text-secondary)', marginTop: 6 }}>
                        {shortMonths[item.month]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ABA 2: LANÇAMENTOS (OS E ORÇAMENTOS)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {!loading && data && activeTab === 'entries' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <h3>Ordens de Serviço do Período ({filteredOrders.length})</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cliente, placa, OS ou responsável..."
                  style={{ width: 260, padding: '6px 10px', fontSize: 13 }}
                />
                <button
                  type="button"
                  className={`btn btn-sm ${osStatusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setOsStatusFilter('all')}
                >
                  Todas ({data.orders?.length || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${osStatusFilter === 'paid' ? 'btn-success' : 'btn-outline'}`}
                  onClick={() => setOsStatusFilter('paid')}
                >
                  Faturadas ({(data.totals?.concluidas || 0) + (data.totals?.entregues || 0)})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${osStatusFilter === 'open' ? 'btn-warning' : 'btn-outline'}`}
                  onClick={() => setOsStatusFilter('open')}
                >
                  Em Execução ({data.totals?.em_andamento || 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${osStatusFilter === 'canceled' ? 'btn-danger' : 'btn-outline'}`}
                  onClick={() => setOsStatusFilter('canceled')}
                >
                  Canceladas ({data.totals?.canceladas || 0})
                </button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Veículo / Placa</th>
                    <th>Responsável</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Mão de Obra</th>
                    <th style={{ textAlign: 'right' }}>Peças</th>
                    <th style={{ textAlign: 'right' }}>Total OS</th>
                    <th style={{ textAlign: 'center' }}>Imprimir</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        Nenhuma Ordem de Serviço encontrada com este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(o => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/ordens/${o.id}`} style={{ fontWeight: 700, color: 'var(--gold)' }}>
                            {o.code}
                          </Link>
                        </td>
                        <td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>{o.client_name || '-'}</td>
                        <td>{o.make} {o.model} {o.plate && `(${o.plate})`}</td>
                        <td>{o.assigned_name || '-'}</td>
                        <td><span className={`badge badge-${o.status}`}>{statusLabels[o.status] || o.status}</span></td>
                        <td style={{ textAlign: 'right' }}>{formatBRL(o.service_total || 0)}</td>
                        <td style={{ textAlign: 'right' }}>{formatBRL(o.parts_total || 0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                          {formatBRL(o.total || 0)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => printServiceOrder(o, company)}
                            title="Imprimir OS em qualquer impressora"
                          >
                            <Icon name="printer" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredOrders.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'right', fontWeight: 700 }}>Soma das OS listadas:</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatBRL(filteredOrders.reduce((s, o) => s + (o.service_total || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatBRL(filteredOrders.reduce((s, o) => s + (o.parts_total || 0), 0))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>
                        {formatBRL(filteredOrders.reduce((s, o) => s + (o.total || 0), 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Orçamentos do Período */}
          <div className="card">
            <div className="card-header">
              <h3>Orçamentos Emitidos no Período ({data.budgets?.length || 0})</h3>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Orçamento</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Veículo</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                    <th style={{ textAlign: 'right' }}>Desconto</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>Imprimir</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.budgets?.length ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                        Nenhum orçamento emitido neste período.
                      </td>
                    </tr>
                  ) : (
                    data.budgets.map(b => (
                      <tr key={b.id}>
                        <td>
                          <Link to={`/orcamentos/${b.id}`} style={{ fontWeight: 700, color: 'var(--gold)' }}>
                            {b.code}
                          </Link>
                        </td>
                        <td>{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>{b.client_name || '-'}</td>
                        <td>{b.make} {b.model} {b.plate && `(${b.plate})`}</td>
                        <td><span className={`badge badge-${b.status}`}>{budgetStatusLabels[b.status] || b.status}</span></td>
                        <td style={{ textAlign: 'right' }}>{formatBRL(b.subtotal || 0)}</td>
                        <td style={{ textAlign: 'right', color: b.discount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {b.discount > 0 ? `- ${formatBRL(b.discount)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatBRL(b.total || 0)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handlePrintBudgetItem(b)}
                            title="Imprimir Orçamento"
                          >
                            <Icon name="printer" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ABA 3: SERVIÇOS, PEÇAS & EQUIPE
         ═══════════════════════════════════════════════════════════════════════════ */}
      {!loading && data && activeTab === 'services' && (
        <div className="grid-2">
          {/* Ranking de Serviços e Peças */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h3>Itens de Maior Faturamento</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${itemTypeFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setItemTypeFilter('all')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${itemTypeFilter === 'servico' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setItemTypeFilter('servico')}
                >
                  Só Serviços
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${itemTypeFilter === 'peca' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setItemTypeFilter('peca')}
                >
                  Só Peças
                </button>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'center' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopServices.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                        Nenhum item registrado no período.
                      </td>
                    </tr>
                  ) : (
                    filteredTopServices.map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{s.description}</strong></td>
                        <td>{s.type === 'peca' ? 'Peça' : 'Serviço'}</td>
                        <td style={{ textAlign: 'center' }}>{s.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{formatBRL(s.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            {/* Receita por Responsável / Técnico */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3>Produção Financeira por Responsável</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Responsável</th>
                      <th style={{ textAlign: 'center' }}>Total OS</th>
                      <th style={{ textAlign: 'center' }}>Finalizadas</th>
                      <th style={{ textAlign: 'right' }}>Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.byTechnician?.length ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                          Nenhuma OS registrada no período.
                        </td>
                      </tr>
                    ) : (
                      data.byTechnician.map((t, idx) => (
                        <tr key={idx}>
                          <td><strong>{t.name}</strong></td>
                          <td style={{ textAlign: 'center' }}>{t.total_os}</td>
                          <td style={{ textAlign: 'center' }}>{t.concluidas}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{formatBRL(t.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receita por Tipo de Direção */}
            <div className="card">
              <div className="card-header">
                <h3>Faturamento por Sistema de Direção</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo de Direção</th>
                      <th style={{ textAlign: 'center' }}>Qtd. OS</th>
                      <th style={{ textAlign: 'right' }}>Receita Realizada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.bySteeringType?.length ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                          Sem dados no período.
                        </td>
                      </tr>
                    ) : (
                      data.bySteeringType.map(s => (
                        <tr key={s.steering_type}>
                          <td><strong>{steeringLabels[s.steering_type] || s.steering_type || 'Outro'}</strong></td>
                          <td style={{ textAlign: 'center' }}>{s.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatBRL(s.revenue || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ABA 4: EXTRATO FINANCEIRO POR CLIENTE
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'client' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>Consultar Histórico Financeiro de Cliente</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, position: 'relative', flex: '1 1 300px' }}>
                <label>Buscar Cliente pelo Nome, Telefone ou CPF/CNPJ</label>
                <input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    searchClients(e.target.value);
                  }}
                  placeholder="Digite o nome do cliente..."
                />
                {clients.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      zIndex: 20,
                      maxHeight: 220,
                      overflowY: 'auto',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    {clients.map(c => (
                      <div
                        key={c.id}
                        onClick={() => loadClientFinancials(c)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <strong>{c.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.phone || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {periodClients.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Clientes com movimentação no período (clique para ver o extrato completo):
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {periodClients.slice(0, 10).map(pc => (
                    <button
                      key={pc.id}
                      type="button"
                      className={`btn btn-sm ${selectedClient?.id === pc.id ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => loadClientFinancials(pc)}
                    >
                      {pc.name} ({formatBRL(pc.total)})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loadingClient && <div className="loading">Carregando extrato do cliente...</div>}

          {!loadingClient && clientHistory && (
            <div className="card">
              <div className="card-header">
                <h3>Extrato Financeiro — {clientHistory.name}</h3>
                <Link to={`/clientes/${clientHistory.id}`} className="btn btn-outline btn-sm">
                  Abrir Cadastro do Cliente
                </Link>
              </div>

              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-green"><Icon name="coins" /></div>
                  <div className="stat-label">Total Gasto na Oficina</div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>{formatBRL(clientHistory.totalSpent)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-blue"><Icon name="wrench" /></div>
                  <div className="stat-label">Ordens de Serviço</div>
                  <div className="stat-value">{clientHistory.serviceOrders?.length || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon-gold"><Icon name="clipboard" /></div>
                  <div className="stat-label">Veículos Cadastrados</div>
                  <div className="stat-value">{clientHistory.vehicles?.length || 0}</div>
                </div>
              </div>

              <h4 style={{ marginBottom: 10 }}>Histórico de Ordens de Serviço e Valores</h4>
              {(clientHistory.serviceOrders || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma Ordem de Serviço registrada para este cliente.</p>
              ) : (
                (clientHistory.serviceOrders || []).map(o => {
                  const orderTotal = (o.items || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
                  return (
                    <div key={o.id} className="card" style={{ padding: 14, marginBottom: 10, background: 'var(--bg-surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Link to={`/ordens/${o.id}`} style={{ fontWeight: 700, color: 'var(--gold)', marginRight: 10 }}>
                            {o.code}
                          </Link>
                          <span className={`badge badge-${o.status}`}>{statusLabels[o.status] || o.status}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong style={{ fontSize: 15, color: 'var(--text)' }}>{formatBRL(orderTotal)}</strong>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => printServiceOrder({ ...o, client_name: clientHistory.name, client_phone: clientHistory.phone }, company)}
                          >
                            <Icon name="printer" size={14} /> Imprimir OS
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {o.make} {o.model} {o.plate && `- ${o.plate}`} | {new Date(o.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      {o.items?.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                          {o.items.map(item => (
                            <div key={item.id} style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span>{item.description} ({item.type === 'peca' ? 'Peça' : 'Serviço'} x{item.quantity})</span>
                              <span>{formatBRL(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
