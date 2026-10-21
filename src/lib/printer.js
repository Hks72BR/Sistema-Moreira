import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LOGO_BASE64 } from '../logoBase64';
import { getWhatsappUrl } from '../components/WhatsappLink';

const steeringLabels = {
  hidraulica: 'Hidráulica',
  eletrica: 'Elétrica',
  eletrohidraulica: 'Eletro-hidráulica',
  mecanica: 'Mecânica',
};

const osStatusLabels = {
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

export const formatBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

const formatDateBR = (dateStr, withTime = false) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return withTime ? d.toLocaleString('pt-BR') : d.toLocaleDateString('pt-BR');
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Abre a caixa de diálogo nativa do sistema operacional para imprimir em
 * qualquer impressora conectada ao PC (USB, Wi-Fi, Rede, Térmica ou A4).
 */
export function printHtmlDocument(title, bodyHtml) {
  const existingFrame = document.getElementById('moreira-print-iframe');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'moreira-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #181c20;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.45;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0d1014;
      color: #ffffff;
      padding: 14px 18px;
      border-bottom: 3px solid #f5a623;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-left img {
      width: 54px;
      height: 54px;
      object-fit: contain;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #f5a623;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #5ca0ff;
      font-weight: 600;
      margin: 1px 0 4px;
    }
    .brand-meta {
      font-size: 10px;
      color: #c5ccd3;
      margin: 0;
    }
    .doc-right {
      text-align: right;
    }
    .doc-type {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ba5b0;
      font-weight: 700;
    }
    .doc-code {
      font-size: 17px;
      font-weight: 800;
      color: #f5a623;
      margin: 2px 0;
    }
    .doc-date {
      font-size: 10px;
      color: #c5ccd3;
    }
    .badge-print {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 4px;
      background: #f5a623;
      color: #111;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-box {
      border: 1px solid #d5dce2;
      border-left: 3px solid #f5a623;
      border-radius: 5px;
      padding: 8px 10px;
      background: #fafbfc;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #5c6670;
      font-weight: 700;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 800;
      color: #111518;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #6c7680;
    }
    .info-box {
      border: 1px solid #d5dce2;
      border-radius: 5px;
      padding: 10px 12px;
      background: #fafbfc;
    }
    .info-box.gold { border-left: 3px solid #f5a623; }
    .info-box.blue { border-left: 3px solid #2b7fff; }
    .box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #5c6670;
      margin: 0 0 6px;
    }
    .info-line {
      margin: 2px 0;
      font-size: 11.5px;
    }
    .info-line strong {
      color: #2c353d;
    }
    .section-block {
      margin-bottom: 12px;
      border: 1px solid #d5dce2;
      border-radius: 5px;
      padding: 9px 12px;
    }
    .section-block h4 {
      margin: 0 0 4px;
      font-size: 11px;
      text-transform: uppercase;
      color: #49545e;
    }
    .section-block p {
      margin: 0;
      white-space: pre-wrap;
      font-size: 11.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11px;
    }
    th {
      background: #14191f;
      color: #f5a623;
      text-align: left;
      padding: 7px 9px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 6px 9px;
      border-bottom: 1px solid #e1e6eb;
      color: #1e2429;
    }
    tr:nth-child(even) td {
      background: #f8f9fb;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 6px;
      margin-bottom: 16px;
    }
    .totals-box {
      width: 250px;
      border: 1px solid #d5dce2;
      border-radius: 5px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 11.5px;
      border-bottom: 1px solid #e5eaef;
    }
    .totals-row.final {
      background: #0d1014;
      color: #f5a623;
      font-weight: 800;
      font-size: 13px;
      border-bottom: none;
      padding: 8px 10px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 34px;
      padding-top: 10px;
    }
    .sig-line {
      border-top: 1px solid #5c6670;
      text-align: center;
      padding-top: 5px;
      font-size: 11px;
      color: #3a434c;
    }
    .doc-footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #d5dce2;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #6c7680;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Erro ao acionar impressora:', err);
    }
  };

  iframe.onload = () => setTimeout(triggerPrint, 180);
  setTimeout(triggerPrint, 500);
}

function renderHeaderHtml(company = {}, docType, code, dateLines = [], badgeText = '') {
  const addr = [company.address, company.neighborhood, company.city, company.state].filter(Boolean).join(', ');
  const contact = [company.phone && `WhatsApp: ${company.phone}`, company.email, company.cnpj && `CNPJ: ${company.cnpj}`]
    .filter(Boolean)
    .join(' | ');

  return `
    <div class="doc-header">
      <div class="brand-left">
        <img src="${LOGO_BASE64}" alt="Moreira Direções" />
        <div>
          <div class="brand-title">${escapeHtml(company.name || 'MOREIRA DIREÇÕES')}</div>
          <div class="brand-sub">Direção Hidráulica, Elétrica &amp; Suspensão</div>
          ${addr ? `<p class="brand-meta">${escapeHtml(addr)}</p>` : ''}
          ${contact ? `<p class="brand-meta">${escapeHtml(contact)}</p>` : ''}
        </div>
      </div>
      <div class="doc-right">
        <div class="doc-type">${escapeHtml(docType)}</div>
        <div class="doc-code">${escapeHtml(code)}</div>
        ${dateLines.map(line => `<div class="doc-date">${escapeHtml(line)}</div>`).join('')}
        ${badgeText ? `<span class="badge-print">${escapeHtml(badgeText)}</span>` : ''}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. IMPRESSÃO E PDF DE ORÇAMENTO
// ═══════════════════════════════════════════════════════════════════════════

export function printBudget(budget, company = {}) {
  const items = budget.items || [];
  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="text-center">${item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
        <td class="text-center">${escapeHtml(item.quantity)}</td>
        <td class="text-right">${formatBRL(item.unit_price)}</td>
        <td class="text-right"><strong>${formatBRL(item.total)}</strong></td>
      </tr>`
    )
    .join('');

  const dateLines = [
    `Emissão: ${formatDateBR(budget.created_at)}`,
    budget.valid_until ? `Validade: ${formatDateBR(budget.valid_until)}` : '',
  ].filter(Boolean);

  const html = `
    ${renderHeaderHtml(company, 'Orçamento', budget.code, dateLines, budgetStatusLabels[budget.status] || budget.status)}
    <div class="grid-2">
      <div class="info-box gold">
        <div class="box-title">Dados do Cliente</div>
        <div class="info-line"><strong>Nome:</strong> ${escapeHtml(budget.client_name || '-')}</div>
        <div class="info-line"><strong>WhatsApp/Tel:</strong> ${escapeHtml(budget.client_phone || '-')}</div>
        ${budget.client_cpf_cnpj ? `<div class="info-line"><strong>CPF/CNPJ:</strong> ${escapeHtml(budget.client_cpf_cnpj)}</div>` : ''}
      </div>
      <div class="info-box blue">
        <div class="box-title">Dados do Veículo</div>
        <div class="info-line"><strong>Veículo:</strong> ${escapeHtml(`${budget.make || ''} ${budget.model || ''} ${budget.year || ''}`.trim() || '-')}</div>
        <div class="info-line"><strong>Placa:</strong> ${escapeHtml(budget.plate || '-')}</div>
        <div class="info-line"><strong>Direção:</strong> ${escapeHtml(steeringLabels[budget.steering_type] || budget.steering_type || '-')}</div>
        ${budget.color ? `<div class="info-line"><strong>Cor:</strong> ${escapeHtml(budget.color)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Descrição do Serviço / Peça</th>
          <th class="text-center" style="width: 80px;">Tipo</th>
          <th class="text-center" style="width: 55px;">Qtd</th>
          <th class="text-right" style="width: 105px;">Vlr. Unit.</th>
          <th class="text-right" style="width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5" class="text-center">Nenhum item registrado</td></tr>'}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal:</span>
          <strong>${formatBRL(budget.subtotal)}</strong>
        </div>
        ${
          budget.discount > 0
            ? `<div class="totals-row" style="color: #c92a2a;">
                <span>Desconto:</span>
                <strong>- ${formatBRL(budget.discount)}</strong>
              </div>`
            : ''
        }
        <div class="totals-row final">
          <span>TOTAL:</span>
          <span>${formatBRL(budget.total)}</span>
        </div>
      </div>
    </div>

    ${
      budget.notes
        ? `<div class="section-block">
            <h4>Observações</h4>
            <p>${escapeHtml(budget.notes)}</p>
          </div>`
        : ''
    }

    <div class="signatures">
      <div class="sig-line">${escapeHtml(company.name || 'Moreira Direções')}</div>
      <div class="sig-line">${escapeHtml(budget.client_name || 'Assinatura do Cliente')}</div>
    </div>

    <div class="doc-footer">
      <span>Orçamento sujeito à validade informada. Impresso em ${new Date().toLocaleString('pt-BR')}</span>
      <span>Moreira Direções — Sistema de Gestão</span>
    </div>
  `;

  printHtmlDocument(`Orcamento_${budget.code}`, html);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. IMPRESSÃO E PDF DE ORDEM DE SERVIÇO (OS / OR)
// ═══════════════════════════════════════════════════════════════════════════

export function printServiceOrder(order, company = {}) {
  const items = order.items || [];
  const itemsTotal = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const serviceTotal = items
    .filter((i) => i.type !== 'peca')
    .reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const partsTotal = items
    .filter((i) => i.type === 'peca')
    .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.description)}</td>
        <td class="text-center">${item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
        <td class="text-center">${escapeHtml(item.quantity)}</td>
        <td class="text-right">${formatBRL(item.unit_price)}</td>
        <td class="text-right"><strong>${formatBRL(item.total)}</strong></td>
      </tr>`
    )
    .join('');

  const dateLines = [
    `Abertura: ${formatDateBR(order.created_at, true)}`,
    order.completed_at ? `Conclusão: ${formatDateBR(order.completed_at, true)}` : '',
    order.delivered_at ? `Entrega: ${formatDateBR(order.delivered_at, true)}` : '',
  ].filter(Boolean);

  const html = `
    ${renderHeaderHtml(company, 'Ordem de Serviço', order.code, dateLines, osStatusLabels[order.status] || order.status)}
    <div class="grid-2">
      <div class="info-box gold">
        <div class="box-title">Cliente &amp; Atendimento</div>
        <div class="info-line"><strong>Cliente:</strong> ${escapeHtml(order.client_name || '-')}</div>
        <div class="info-line"><strong>WhatsApp/Tel:</strong> ${escapeHtml(order.client_phone || '-')}</div>
        <div class="info-line"><strong>Responsável Técnico:</strong> ${escapeHtml(order.assigned_to_name || order.assigned_name || 'Não atribuído')}</div>
        ${order.budget_code ? `<div class="info-line"><strong>Orçamento Origem:</strong> ${escapeHtml(order.budget_code)}</div>` : ''}
      </div>
      <div class="info-box blue">
        <div class="box-title">Veículo &amp; Quilometragem</div>
        <div class="info-line"><strong>Veículo:</strong> ${escapeHtml(`${order.make || ''} ${order.model || ''} ${order.year || ''}`.trim() || '-')}</div>
        <div class="info-line"><strong>Placa:</strong> ${escapeHtml(order.plate || '-')} ${order.color ? `| <strong>Cor:</strong> ${escapeHtml(order.color)}` : ''}</div>
        <div class="info-line"><strong>Direção:</strong> ${escapeHtml(steeringLabels[order.steering_type] || order.steering_type || '-')}</div>
        <div class="info-line"><strong>KM Entrada:</strong> ${escapeHtml(order.km_entry || '-')} | <strong>KM Saída:</strong> ${escapeHtml(order.km_exit || '-')}</div>
      </div>
    </div>

    ${
      order.diagnosis
        ? `<div class="section-block">
            <h4>Diagnóstico / Queixa Relatada</h4>
            <p>${escapeHtml(order.diagnosis)}</p>
          </div>`
        : ''
    }

    ${
      order.services_performed
        ? `<div class="section-block">
            <h4>Serviços Executados</h4>
            <p>${escapeHtml(order.services_performed)}</p>
          </div>`
        : ''
    }

    ${
      order.parts_used
        ? `<div class="section-block">
            <h4>Peças Aplicadas</h4>
            <p>${escapeHtml(order.parts_used)}</p>
          </div>`
        : ''
    }

    <table>
      <thead>
        <tr>
          <th>Descrição do Item (Serviço / Peça)</th>
          <th class="text-center" style="width: 80px;">Tipo</th>
          <th class="text-center" style="width: 55px;">Qtd</th>
          <th class="text-right" style="width: 105px;">Vlr. Unit.</th>
          <th class="text-right" style="width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5" class="text-center">Nenhum item financeiro lançado nesta OS</td></tr>'}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <div class="totals-row">
          <span>Mão de Obra (Serviços):</span>
          <strong>${formatBRL(serviceTotal)}</strong>
        </div>
        <div class="totals-row">
          <span>Peças / Materiais:</span>
          <strong>${formatBRL(partsTotal)}</strong>
        </div>
        <div class="totals-row final">
          <span>TOTAL DA OS:</span>
          <span>${formatBRL(itemsTotal)}</span>
        </div>
      </div>
    </div>

    ${
      order.notes
        ? `<div class="section-block">
            <h4>Observações Gerais</h4>
            <p>${escapeHtml(order.notes)}</p>
          </div>`
        : ''
    }

    <div class="signatures">
      <div class="sig-line">${escapeHtml(company.name || 'Moreira Direções')} — Responsável</div>
      <div class="sig-line">${escapeHtml(order.client_name || 'Cliente')} — Recebi o veículo em perfeitas condições</div>
    </div>

    <div class="doc-footer">
      <span>Documento ${escapeHtml(order.code)} impresso em ${new Date().toLocaleString('pt-BR')}</span>
      <span>Moreira Direções — Sistema de Gestão</span>
    </div>
  `;

  printHtmlDocument(`OS_${order.code}`, html);
}

export function downloadServiceOrderPDF(order, company = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  const headerH = 44;
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(245, 166, 35);
  doc.rect(0, headerH, pageW, 1.2, 'F');

  try {
    doc.addImage(LOGO_BASE64, 'PNG', margin, 4, 34, 34);
  } catch {}

  const textX = margin + 40;
  doc.setTextColor(245, 166, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(company.name || 'MOREIRA DIREÇÕES', textX, 16);

  doc.setFontSize(8.5);
  doc.setTextColor(43, 127, 255);
  doc.setFont('helvetica', 'normal');
  doc.text('Direção & Suspensão Automotiva', textX, 22);

  doc.setFontSize(8);
  doc.setTextColor(175, 180, 188);
  const companyLine1 = [company.address, company.neighborhood, company.city, company.state].filter(Boolean).join(', ');
  const companyLine2 = [company.phone && `WhatsApp: ${company.phone}`, company.cnpj && `CNPJ: ${company.cnpj}`].filter(Boolean).join('  |  ');
  if (companyLine1) doc.text(companyLine1, textX, 28);
  if (companyLine2) {
    doc.text(companyLine2, textX, 34);
    const url = getWhatsappUrl(company.phone);
    if (url) doc.link(textX, 31, 45, 4, { url });
  }

  doc.setTextColor(245, 166, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(order.code || 'OS', pageW - margin, 16, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(175, 180, 188);
  doc.setFont('helvetica', 'normal');
  doc.text(`Abertura: ${formatDateBR(order.created_at)}`, pageW - margin, 23, { align: 'right' });
  doc.text(`Status: ${(osStatusLabels[order.status] || order.status || '').toUpperCase()}`, pageW - margin, 29, { align: 'right' });

  let y = headerH + 9;
  doc.setTextColor(25, 28, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ORDEM DE SERVIÇO', pageW / 2, y, { align: 'center' });

  y += 6;
  const halfW = (pageW - margin * 2 - 6) / 2;
  const boxH = 32;

  doc.setFillColor(252, 249, 242);
  doc.roundedRect(margin, y, halfW, boxH, 2, 2, 'F');
  doc.setFillColor(245, 166, 35);
  doc.rect(margin, y, 2, boxH, 'F');
  doc.setFontSize(7);
  doc.setTextColor(180, 140, 40);
  doc.text('CLIENTE E ATENDIMENTO', margin + 6, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(25, 25, 25);
  doc.text(order.client_name || '-', margin + 6, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 70, 75);
  doc.text(`WhatsApp: ${order.client_phone || '-'}`, margin + 6, y + 17);
  doc.text(`Responsável: ${order.assigned_to_name || order.assigned_name || 'Não atribuído'}`, margin + 6, y + 23);
  if (order.budget_code) doc.text(`Orçamento: ${order.budget_code}`, margin + 6, y + 29);

  const vehX = margin + halfW + 6;
  doc.setFillColor(242, 248, 255);
  doc.roundedRect(vehX, y, halfW, boxH, 2, 2, 'F');
  doc.setFillColor(43, 127, 255);
  doc.rect(vehX, y, 2, boxH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(43, 100, 200);
  doc.text('VEÍCULO', vehX + 6, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(25, 25, 25);
  doc.text(`${order.make || ''} ${order.model || ''} ${order.year || ''}`.trim() || '-', vehX + 6, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 70, 75);
  doc.text(`Placa: ${order.plate || '-'}   |   Direção: ${steeringLabels[order.steering_type] || order.steering_type || '-'}`, vehX + 6, y + 17);
  doc.text(`KM Entrada: ${order.km_entry || '-'}   |   KM Saída: ${order.km_exit || '-'}`, vehX + 6, y + 23);
  if (order.color) doc.text(`Cor: ${order.color}`, vehX + 6, y + 29);

  y += boxH + 6;

  const addSection = (label, content) => {
    if (!content) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 45, 50);
    doc.text(label, margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(65, 70, 75);
    const lines = doc.splitTextToSize(String(content), pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 3;
  };

  addSection('DIAGNÓSTICO:', order.diagnosis);
  addSection('SERVIÇOS REALIZADOS:', order.services_performed);
  addSection('PEÇAS UTILIZADAS:', order.parts_used);

  const items = order.items || [];
  const itemsTotal = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Descrição', 'Tipo', 'Qtd', 'Valor Unit.', 'Total']],
    body: items.map((item) => [
      item.description,
      item.type === 'peca' ? 'Peça' : 'Serviço',
      String(item.quantity),
      formatBRL(item.unit_price),
      formatBRL(item.total),
    ]),
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [35, 35, 35] },
    headStyles: { fillColor: [15, 18, 22], textColor: [245, 166, 35], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: {
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
  });

  y = doc.lastAutoTable.finalY + 6;
  const totalsX = pageW - margin - 72;
  doc.setFillColor(10, 10, 15);
  doc.roundedRect(totalsX - 4, y, 76, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(245, 166, 35);
  doc.text('TOTAL:', totalsX, y + 8);
  doc.text(formatBRL(itemsTotal), pageW - margin, y + 8, { align: 'right' });

  const sigY = pageH - 28;
  doc.setDrawColor(160, 165, 175);
  doc.setLineWidth(0.4);
  doc.line(margin + 8, sigY, margin + 78, sigY);
  doc.line(pageW - margin - 78, sigY, pageW - margin - 8, sigY);
  doc.setFontSize(8);
  doc.setTextColor(95, 100, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name || 'Moreira Direções', margin + 43, sigY + 5, { align: 'center' });
  doc.text(order.client_name || 'Assinatura do Cliente', pageW - margin - 43, sigY + 5, { align: 'center' });

  doc.save(`${order.code || 'OS'}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. IMPRESSÃO E PDF DO RELATÓRIO FINANCEIRO
// ═══════════════════════════════════════════════════════════════════════════

export function printFinancialReport(report, periodLabel, company = {}) {
  const orders = report.orders || [];
  const ordersRows = orders
    .map(
      (o) => `
      <tr>
        <td><strong>${escapeHtml(o.code)}</strong></td>
        <td>${formatDateBR(o.created_at)}</td>
        <td>${escapeHtml(o.client_name || '-')}</td>
        <td>${escapeHtml(`${o.make || ''} ${o.model || ''}`.trim())} ${o.plate ? `(${escapeHtml(o.plate)})` : ''}</td>
        <td>${escapeHtml(o.assigned_name || o.assigned_to_name || '-')}</td>
        <td class="text-center">${escapeHtml(osStatusLabels[o.status] || o.status)}</td>
        <td class="text-right">${formatBRL(o.service_total || 0)}</td>
        <td class="text-right">${formatBRL(o.parts_total || 0)}</td>
        <td class="text-right"><strong>${formatBRL(o.total || 0)}</strong></td>
      </tr>`
    )
    .join('');

  const topServicesRows = (report.topServices || [])
    .slice(0, 10)
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.description)}</td>
        <td class="text-center">${s.type === 'peca' ? 'Peça' : 'Serviço'}</td>
        <td class="text-center">${escapeHtml(s.count)}</td>
        <td class="text-right"><strong>${formatBRL(s.revenue)}</strong></td>
      </tr>`
    )
    .join('');

  const bs = report.budgetsSummary || {};

  const html = `
    ${renderHeaderHtml(
      company,
      'Demonstrativo Financeiro',
      periodLabel,
      [`Emitido em: ${new Date().toLocaleString('pt-BR')}`],
      'Relatório de Caixa'
    )}

    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Faturamento Realizado</div>
        <div class="kpi-value">${formatBRL(report.revenue || 0)}</div>
        <div class="kpi-sub">${(report.totals?.concluidas || 0) + (report.totals?.entregues || 0)} OS finalizadas</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Em Execução (A Receber)</div>
        <div class="kpi-value">${formatBRL(report.inProgressRevenue || 0)}</div>
        <div class="kpi-sub">${report.totals?.em_andamento || 0} OS em andamento</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Mão de Obra vs. Peças</div>
        <div class="kpi-value">${formatBRL(report.servicesRevenue || 0)}</div>
        <div class="kpi-sub">Peças: ${formatBRL(report.partsRevenue || 0)}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Ticket Médio / Orçamentos</div>
        <div class="kpi-value">${formatBRL(report.averageTicket || 0)}</div>
        <div class="kpi-sub">Pendentes: ${formatBRL(bs.pending_total || 0)}</div>
      </div>
    </div>

    <div class="section-block" style="margin-bottom: 14px;">
      <h4>Resumo Comercial de Orçamentos no Período</h4>
      <p>Total de Orçamentos: ${bs.total_count || 0}  |  Aprovados: ${bs.approved_count || 0} (${formatBRL(bs.approved_total || 0)})  |  Pendentes: ${bs.pending_count || 0} (${formatBRL(bs.pending_total || 0)})  |  Recusados: ${bs.rejected_count || 0} (${formatBRL(bs.rejected_total || 0)})  |  Descontos Concedidos: ${formatBRL(bs.discount_total || 0)}  |  Conversão: ${bs.conversion_rate || 0}%</p>
    </div>

    <h4 style="margin: 8px 0 6px; font-size: 12px; text-transform: uppercase;">Detalhamento Financeiro por Ordem de Serviço (${orders.length})</h4>
    <table>
      <thead>
        <tr>
          <th>OS</th>
          <th>Data</th>
          <th>Cliente</th>
          <th>Veículo / Placa</th>
          <th>Responsável</th>
          <th class="text-center">Status</th>
          <th class="text-right">Serviços</th>
          <th class="text-right">Peças</th>
          <th class="text-right">Total OS</th>
        </tr>
      </thead>
      <tbody>
        ${ordersRows || '<tr><td colspan="9" class="text-center">Nenhuma Ordem de Serviço registrada no período</td></tr>'}
      </tbody>
    </table>

    ${
      topServicesRows
        ? `<h4 style="margin: 14px 0 6px; font-size: 12px; text-transform: uppercase;">Principais Fontes de Receita (Serviços e Peças)</h4>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="text-center" style="width: 90px;">Tipo</th>
                <th class="text-center" style="width: 70px;">Qtd</th>
                <th class="text-right" style="width: 120px;">Receita Gerada</th>
              </tr>
            </thead>
            <tbody>${topServicesRows}</tbody>
          </table>`
        : ''
    }

    <div class="doc-footer">
      <span>Relatório Financeiro — ${escapeHtml(periodLabel)}</span>
      <span>Moreira Direções — Impresso em ${new Date().toLocaleString('pt-BR')}</span>
    </div>
  `;

  printHtmlDocument(`Financeiro_${periodLabel.replace(/\s+/g, '_')}`, html);
}

export function downloadFinancialReportPDF(report, periodLabel, company = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  const headerH = 38;
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFillColor(245, 166, 35);
  doc.rect(0, headerH, pageW, 1, 'F');

  try {
    doc.addImage(LOGO_BASE64, 'PNG', margin, 4, 30, 30);
  } catch {}

  doc.setTextColor(245, 166, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name || 'MOREIRA DIREÇÕES', margin + 35, 15);

  doc.setFontSize(8.5);
  doc.setTextColor(175, 180, 188);
  doc.setFont('helvetica', 'normal');
  doc.text('Demonstrativo e Relatório Financeiro', margin + 35, 22);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, margin + 35, 28);

  doc.setTextColor(245, 166, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(periodLabel, pageW - margin, 18, { align: 'right' });

  let y = headerH + 8;

  // Summary Table
  const bs = report.budgetsSummary || {};
  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Indicador Financeiro', 'Valor / Resultado', 'Detalhamento']],
    body: [
      [
        'Faturamento Realizado (Caixa)',
        formatBRL(report.revenue || 0),
        `${(report.totals?.concluidas || 0) + (report.totals?.entregues || 0)} OS Concluídas / Entregues`,
      ],
      [
        'Receita de Mão de Obra vs. Peças',
        `${formatBRL(report.servicesRevenue || 0)} / ${formatBRL(report.partsRevenue || 0)}`,
        'Divisão entre Serviços realizados e Peças aplicadas',
      ],
      [
        'Valor em Aberto / Em Execução',
        formatBRL(report.inProgressRevenue || 0),
        `${report.totals?.em_andamento || 0} OS Abertas ou Em Andamento`,
      ],
      [
        'Ticket Médio por OS',
        formatBRL(report.averageTicket || 0),
        `Total de ${report.totals?.total_os || 0} OS registradas no período`,
      ],
      [
        'Orçamentos Aprovados / Pendentes',
        `${formatBRL(bs.approved_total || 0)} / ${formatBRL(bs.pending_total || 0)}`,
        `Taxa de conversão: ${bs.conversion_rate || 0}% (${bs.approved_count || 0} de ${bs.total_count || 0})`,
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 30, 30] },
    headStyles: { fillColor: [15, 18, 22], textColor: [245, 166, 35], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62 },
      1: { fontStyle: 'bold', cellWidth: 52, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  const orders = report.orders || [];
  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['OS', 'Data', 'Cliente', 'Veículo', 'Status', 'Serviços', 'Peças', 'Total']],
    body: orders.map((o) => [
      o.code || '-',
      formatDateBR(o.created_at),
      o.client_name || '-',
      `${o.make || ''} ${o.model || ''} ${o.plate ? `(${o.plate})` : ''}`.trim(),
      osStatusLabels[o.status] || o.status,
      formatBRL(o.service_total || 0),
      formatBRL(o.parts_total || 0),
      formatBRL(o.total || 0),
    ]),
    styles: { fontSize: 7.5, cellPadding: 3, textColor: [35, 35, 35] },
    headStyles: { fillColor: [15, 18, 22], textColor: [245, 166, 35], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Financeiro_${periodLabel.replace(/\s+/g, '_')}.pdf`);
}

