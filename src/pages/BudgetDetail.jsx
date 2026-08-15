import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LOGO_BASE64 } from '../logoBase64';

const statusLabels = { pendente: 'Pendente', aprovado: 'Aprovado', recusado: 'Recusado', expirado: 'Expirado' };
const steeringLabels = { hidraulica: 'Hidráulica', eletrica: 'Elétrica', eletrohidraulica: 'Eletro-hidráulica', mecanica: 'Mecânica' };

export default function BudgetDetail() {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({});

  useEffect(() => {
    api(`/budgets/${id}`).then(data => { setBudget(data); setLoading(false); }).catch(() => setLoading(false));
    api('/settings').then(data => setCompany(data)).catch(() => {});
  }, [id]);

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 0;

    // ═══ HEADER BAR (dark with gold accent) ═══
    const headerH = 48;
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageW, headerH, 'F');

    // Gold accent line at bottom of header
    doc.setFillColor(245, 166, 35);
    doc.rect(0, headerH, pageW, 1.2, 'F');

    // Blue accent line below gold
    doc.setFillColor(43, 127, 255);
    doc.rect(0, headerH + 1.2, pageW, 0.6, 'F');

    // Logo
    try {
      doc.addImage(LOGO_BASE64, 'PNG', margin, 5, 38, 38);
    } catch (e) { /* logo not available */ }

    // Company name and info (next to logo)
    const textX = margin + 44;
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('MOREIRA', textX, 18);

    doc.setFontSize(9);
    doc.setTextColor(43, 127, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Direção & Suspensão', textX, 24);

    doc.setFontSize(8);
    doc.setTextColor(160, 160, 170);
    const companyLine1 = [company.address, company.neighborhood, company.city, company.state].filter(Boolean).join(', ');
    const companyLine2 = [company.phone && `Tel: ${company.phone}`, company.email].filter(Boolean).join('  |  ');
    const companyLine3 = company.cnpj ? `CNPJ: ${company.cnpj}` : '';
    if (companyLine1) doc.text(companyLine1, textX, 30);
    if (companyLine2) doc.text(companyLine2, textX, 35);
    if (companyLine3) doc.text(companyLine3, textX, 40);

    // Budget code on the right side of header
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(budget.code, pageW - margin, 18, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(160, 160, 170);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emissão: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`, pageW - margin, 25, { align: 'right' });
    if (budget.valid_until) {
      doc.text(`Validade: ${new Date(budget.valid_until).toLocaleDateString('pt-BR')}`, pageW - margin, 31, { align: 'right' });
    }

    // Status badge area
    const statusText = (statusLabels[budget.status] || budget.status).toUpperCase();
    const stColors = {
      aprovado: { bg: [0, 180, 120], text: [255, 255, 255] },
      recusado: { bg: [220, 50, 80], text: [255, 255, 255] },
      pendente: { bg: [200, 160, 0], text: [255, 255, 255] },
      expirado: { bg: [120, 120, 130], text: [255, 255, 255] },
    };
    const sc = stColors[budget.status] || stColors.pendente;
    const badgeW = doc.getTextWidth(statusText) + 10;
    doc.setFillColor(...sc.bg);
    doc.roundedRect(pageW - margin - badgeW, 34, badgeW, 7, 2, 2, 'F');
    doc.setTextColor(...sc.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(statusText, pageW - margin - badgeW / 2, 38.5, { align: 'center' });

    // ═══ TITLE ═══
    y = headerH + 8;
    doc.setTextColor(30, 30, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ORÇAMENTO', pageW / 2, y, { align: 'center' });

    // ═══ CLIENT & VEHICLE INFO ═══
    y += 10;

    // Gold left border box for client
    const boxH = 34;
    const halfW = (pageW - margin * 2 - 6) / 2;

    // Client box
    doc.setFillColor(252, 249, 242);
    doc.roundedRect(margin, y, halfW, boxH, 2, 2, 'F');
    doc.setFillColor(245, 166, 35);
    doc.rect(margin, y, 2, boxH, 'F');

    doc.setTextColor(180, 140, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('CLIENTE', margin + 8, y + 5);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(budget.client_name || '-', margin + 8, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 80);
    doc.text(`Tel: ${budget.client_phone || '-'}`, margin + 8, y + 19);
    if (budget.client_cpf_cnpj) {
      doc.text(`CPF/CNPJ: ${budget.client_cpf_cnpj}`, margin + 8, y + 25);
    }

    // Vehicle box (blue accent)
    const vehX = margin + halfW + 6;
    doc.setFillColor(242, 248, 255);
    doc.roundedRect(vehX, y, halfW, boxH, 2, 2, 'F');
    doc.setFillColor(43, 127, 255);
    doc.rect(vehX, y, 2, boxH, 'F');

    doc.setTextColor(43, 100, 200);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('VEÍCULO', vehX + 8, y + 5);

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${budget.make || ''} ${budget.model || ''} ${budget.vehicle_year || ''}`.trim() || '-', vehX + 8, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 80);
    doc.text(`Placa: ${budget.plate || '-'}`, vehX + 8, y + 19);
    doc.text(`Direção: ${steeringLabels[budget.steering_type] || budget.steering_type || '-'}`, vehX + 8, y + 25);
    if (budget.color) {
      doc.text(`Cor: ${budget.color}`, vehX + 8, y + 31);
    }

    // ═══ ITEMS TABLE ═══
    y += boxH + 8;
    const items = budget.items || [];
    const tableBody = items.map(item => [
      item.description,
      item.type === 'peca' ? 'Peça' : 'Serviço',
      String(item.quantity),
      formatCurrency(item.unit_price),
      formatCurrency(item.total)
    ]);

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Descrição', 'Tipo', 'Qtd', 'Valor Unit.', 'Total']],
      body: tableBody,
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [220, 220, 225],
        lineWidth: 0.3,
        textColor: [40, 40, 40],
      },
      headStyles: {
        fillColor: [10, 10, 15],
        textColor: [245, 166, 35],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252],
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
      },
    });

    // ═══ TOTALS ═══
    y = doc.lastAutoTable.finalY + 6;
    const totalsX = pageW - margin - 70;

    // Subtotal
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 110);
    doc.text('Subtotal:', totalsX, y + 6);
    doc.setTextColor(40, 40, 40);
    doc.text(formatCurrency(budget.subtotal), pageW - margin, y + 6, { align: 'right' });

    // Discount
    if (budget.discount > 0) {
      doc.setTextColor(220, 50, 80);
      doc.text('Desconto:', totalsX, y + 13);
      doc.text(`-${formatCurrency(budget.discount)}`, pageW - margin, y + 13, { align: 'right' });
      y += 7;
    }

    // Total box
    y += 12;
    doc.setFillColor(10, 10, 15);
    doc.roundedRect(totalsX - 5, y, 75, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(245, 166, 35);
    doc.text('TOTAL:', totalsX, y + 10);
    doc.text(formatCurrency(budget.total), pageW - margin, y + 10, { align: 'right' });

    // ═══ NOTES ═══
    if (budget.notes) {
      y += 22;
      doc.setFontSize(8);
      doc.setTextColor(180, 140, 40);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 70);
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(budget.notes, pageW - margin * 2);
      doc.text(noteLines, margin, y + 6);
    }

    // ═══ SIGNATURE LINES ═══
    const sigY = pageH - 45;
    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.4);
    doc.line(margin + 10, sigY, margin + 75, sigY);
    doc.line(pageW - margin - 75, sigY, pageW - margin - 10, sigY);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(company.name || 'Moreira', margin + 42, sigY + 5, { align: 'center' });
    doc.text('Cliente', pageW - margin - 42, sigY + 5, { align: 'center' });

    // ═══ FOOTER ═══
    const footerY = pageH - 22;

    // Footer bar
    doc.setFillColor(10, 10, 15);
    doc.rect(0, footerY - 4, pageW, 26, 'F');

    // Blue line on top of footer
    doc.setFillColor(43, 127, 255);
    doc.rect(0, footerY - 4, pageW, 0.6, 'F');
    doc.setFillColor(245, 166, 35);
    doc.rect(0, footerY - 3.4, pageW, 0.4, 'F');

    doc.setFontSize(7);
    doc.setTextColor(140, 140, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Este orçamento tem validade conforme a data indicada acima. Valores sujeitos a alteração sem aviso prévio.', pageW / 2, footerY + 3, { align: 'center' });

    // Small logo in footer
    try {
      doc.addImage(LOGO_BASE64, 'PNG', pageW / 2 - 6, footerY + 6, 12, 12);
    } catch (e) { /* skip */ }

    doc.save(`${budget.code}.pdf`);
  };

  const updateStatus = async (status) => {
    if (!confirm(`Deseja ${status === 'aprovado' ? 'aprovar' : status === 'recusado' ? 'recusar' : 'alterar'} este orçamento?`)) return;
    try {
      await api(`/budgets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setBudget({ ...budget, status });
    } catch (err) {
      alert(err.message);
    }
  };

  const createOS = async () => {
    try {
      const result = await api('/service-orders', {
        method: 'POST',
        body: JSON.stringify({ client_id: budget.client_id, vehicle_id: budget.vehicle_id, budget_id: budget.id })
      });
      navigate(`/ordens/${result.id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este orçamento?')) return;
    try {
      await api(`/budgets/${id}`, { method: 'DELETE' });
      navigate('/orcamentos');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (!budget) return <div className="loading">Orçamento não encontrado</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Orçamento {budget.code}</h2>
        <div className="actions">
          <button className="btn btn-primary" onClick={generatePDF}>📄 Baixar PDF</button>
          {budget.status === 'pendente' && (
            <>
              <button className="btn btn-success" onClick={() => updateStatus('aprovado')}>✅ Aprovar</button>
              <button className="btn btn-danger" onClick={() => updateStatus('recusado')}>❌ Recusar</button>
            </>
          )}
          {budget.status === 'aprovado' && (
            <button className="btn btn-primary" onClick={createOS}>🔧 Gerar OS</button>
          )}
          {budget.status === 'pendente' && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Excluir</button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <h3>Detalhes</h3>
              <span className={`badge badge-${budget.status}`}>{statusLabels[budget.status]}</span>
            </div>
            <div className="detail-info">
              <div className="info-row"><span className="info-label">Cliente:</span><span className="info-value"><Link to={`/clientes/${budget.client_id}`}>{budget.client_name}</Link></span></div>
              <div className="info-row"><span className="info-label">Telefone:</span><span className="info-value">{budget.client_phone || '-'}</span></div>
              <div className="info-row"><span className="info-label">Veículo:</span><span className="info-value">{budget.make} {budget.model} {budget.vehicle_year} {budget.color && `(${budget.color})`}</span></div>
              <div className="info-row"><span className="info-label">Placa:</span><span className="info-value">{budget.plate || '-'}</span></div>
              <div className="info-row"><span className="info-label">Direção:</span><span className="info-value">{steeringLabels[budget.steering_type] || budget.steering_type}</span></div>
              <div className="info-row"><span className="info-label">Criado por:</span><span className="info-value">{budget.created_by_name}</span></div>
              <div className="info-row"><span className="info-label">Data:</span><span className="info-value">{new Date(budget.created_at).toLocaleString('pt-BR')}</span></div>
              {budget.valid_until && <div className="info-row"><span className="info-label">Validade:</span><span className="info-value">{new Date(budget.valid_until).toLocaleDateString('pt-BR')}</span></div>}
              {budget.notes && <div className="info-row"><span className="info-label">Obs:</span><span className="info-value">{budget.notes}</span></div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Itens</h3></div>
            <table>
              <thead>
                <tr><th>Descrição</th><th>Tipo</th><th>Qtd</th><th>Vlr Unit.</th><th>Total</th></tr>
              </thead>
              <tbody>
                {budget.items?.map(item => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan="4" style={{ textAlign: 'right', fontWeight: 500 }}>Subtotal:</td><td style={{ fontWeight: 600 }}>{formatCurrency(budget.subtotal)}</td></tr>
                {budget.discount > 0 && <tr><td colSpan="4" style={{ textAlign: 'right', fontWeight: 500 }}>Desconto:</td><td style={{ color: 'var(--danger)' }}>-{formatCurrency(budget.discount)}</td></tr>}
                <tr><td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>Total:</td><td style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>{formatCurrency(budget.total)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Ações Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" onClick={generatePDF} style={{ justifyContent: 'center' }}>📄 Baixar PDF / Imprimir</button>
              <Link to={`/clientes/${budget.client_id}`} className="btn btn-outline" style={{ justifyContent: 'center' }}>👤 Ver Cliente</Link>
              {budget.status === 'aprovado' && (
                <button className="btn btn-success" onClick={createOS} style={{ justifyContent: 'center' }}>🔧 Gerar Ordem de Serviço</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
