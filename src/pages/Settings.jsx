import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWhatsappNumber, getWhatsappUrl } from '../components/WhatsappLink';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LOGO_BASE64 } from '../logoBase64';

export default function Settings() {
  const { api, user } = useAuth();
  const canManageSettings = import.meta.env.MODE !== 'offline' ||
    user?.role === 'admin' || user?.role === 'gerente';
  const [settings, setSettings] = useState({
    name: '', cnpj: '', ie: '', phone: '', email: '',
    address: '', neighborhood: '', city: '', state: 'SP', zip_code: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMessage, setPwMessage] = useState('');

  useEffect(() => {
    api('/settings').then(data => {
      if (data) setSettings({
        name: data.name || '', cnpj: data.cnpj || '', ie: data.ie || '',
        phone: data.phone || '', email: data.email || '',
        address: data.address || '', neighborhood: data.neighborhood || '',
        city: data.city || '', state: data.state || 'SP', zip_code: data.zip_code || ''
      });
    }).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (settings.phone && !getWhatsappNumber(settings.phone)) {
      setMessage('Erro: o WhatsApp da empresa deve conter DDD e um número válido (10 a 15 dígitos).');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(settings) });
      setMessage('Configurações salvas com sucesso!');
    } catch (err) {
      setMessage('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage('As senhas não conferem');
      return;
    }
    try {
      await api('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      setPwMessage('Senha alterada com sucesso!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMessage('Erro: ' + err.message);
    }
  };

  // ═══ Helper: branded header/footer for PDFs ═══
  const pdfHeader = (doc, title) => {
    const pageW = doc.internal.pageSize.getWidth();
    const m = 15;
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 38, pageW, 1, 'F');
    doc.setFillColor(43, 127, 255);
    doc.rect(0, 39, pageW, 0.5, 'F');
    try { doc.addImage(LOGO_BASE64, 'PNG', m, 3, 32, 32); } catch {}
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('MOREIRA', m + 37, 16);
    doc.setFontSize(8);
    doc.setTextColor(43, 127, 255);
    doc.text('Direção & Suspensão', m + 37, 22);
    doc.setTextColor(160, 160, 170);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const addr = [settings.address, settings.city, settings.state].filter(Boolean).join(', ');
    if (addr) doc.text(addr, m + 37, 28);
    if (settings.phone) {
      const companyPhoneText = `WhatsApp: ${settings.phone}`;
      doc.text(companyPhoneText, m + 37, 33);
      const companyPhoneUrl = getWhatsappUrl(settings.phone);
      if (companyPhoneUrl) doc.link(m + 37, 30, doc.getTextWidth(companyPhoneText), 4, { url: companyPhoneUrl });
    }
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, pageW - m, 20, { align: 'right' });
    return 46;
  };

  const pdfFooter = (doc, pageNum) => {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(10, 10, 15);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFillColor(43, 127, 255);
    doc.rect(0, pageH - 14, pageW, 0.4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 130);
    doc.setFont('helvetica', 'normal');
    doc.text('Moreira - Direção & Suspensão | Sistema de Gestão', 15, pageH - 5);
    doc.text(`Página ${pageNum}`, pageW - 15, pageH - 5, { align: 'right' });
  };

  const sectionTitle = (doc, text, y, pageW) => {
    doc.setFillColor(245, 166, 35);
    doc.rect(15, y, 3, 7, 'F');
    doc.setTextColor(30, 30, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(text, 22, y + 5.5);
    return y + 12;
  };

  // ═══ PDF: Plano de Padronização ═══
  const generatePlanPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 15;
    let y = pdfHeader(doc, 'MANUAL');
    let page = 1;

    const checkPage = (needed) => {
      if (y + needed > pageH - 20) {
        pdfFooter(doc, page);
        doc.addPage();
        page++;
        y = 15;
      }
    };

    const addText = (text, size = 9, color = [50, 50, 55], bold = false) => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, pageW - m * 2);
      checkPage(lines.length * (size * 0.45) + 4);
      doc.text(lines, m, y);
      y += lines.length * (size * 0.45) + 3;
    };

    // Cover title
    doc.setTextColor(10, 10, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Plano de Padronização de Uso', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão de Oficina', pageW / 2, y, { align: 'center' });
    y += 14;

    // 1. IDENTIFICAÇÃO E EQUIPE
    y = sectionTitle(doc, '1. Acesso e Identificação da Equipe', y, pageW);
    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Etapa / Função', 'Como Funciona', 'Responsabilidades']],
      body: [
        ['Acesso ao Sistema', 'Entrada por nome', 'Identificar o colaborador na sessão para histórico de orçamentos e OS'],
        ['Sincronização', 'Tempo real', 'Clientes, veículos, orçamentos e OS atualizam automaticamente para a equipe'],
        ['Recepção / Atendimento', 'Abertura e Cadastro', 'Cadastrar clientes/veículos, elaborar orçamentos e abrir OS'],
        ['Execução Técnica', 'Oficina', 'Informar responsável na OS, registrar diagnóstico, logs e fotos de entrada/saída'],
      ],
      styles: { fontSize: 8, cellPadding: 3, textColor: [40, 40, 40] },
      headStyles: { fillColor: [10, 10, 15], textColor: [245, 166, 35], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;

    // 2. FLUXO PADRÃO
    checkPage(20);
    y = sectionTitle(doc, '2. Fluxo Padrão de Atendimento', y, pageW);
    const fluxo = [
      ['2.1 Recepção', 'Verificar cadastro do cliente > Cadastrar cliente/veículo > Registrar queixa'],
      ['2.2 Orçamento', 'Novo Orçamento > Selecionar cliente/veículo > Listar serviços e peças > Definir validade'],
      ['2.3 Aprovação', 'Cliente aprova > Status "Aprovado" > Converter em OS | Recusa > Status "Recusado"'],
      ['2.4 Abertura OS', 'Nova OS > Diagnóstico + KM entrada + Prioridade > Informar responsável > Fotos de entrada (mín. 4)'],
      ['2.5 Execução', 'Status "Em Andamento" > Registrar log > Se peça: "Aguardando Peça" > Detalhar serviços realizados'],
      ['2.6 Conclusão', 'Status "Concluída" > KM saída > Fotos de saída (mín. 4) > Avisar cliente via WhatsApp'],
      ['2.7 Entrega', 'Status "Entregue" > Registrar data/hora > Cliente verifica'],
    ];
    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Etapa', 'Procedimento']],
      body: fluxo,
      styles: { fontSize: 8, cellPadding: 4, textColor: [40, 40, 40] },
      headStyles: { fillColor: [10, 10, 15], textColor: [245, 166, 35], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;

    // 3. CATEGORIAS DE SERVIÇO
    checkPage(20);
    y = sectionTitle(doc, '3. Categorias de Serviço', y, pageW);
    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Código', 'Categoria', 'Descrição']],
      body: [
        ['DH', 'Direção Hidráulica', 'Manutenção/reparo de caixas de direção hidráulica'],
        ['DE', 'Direção Elétrica', 'Manutenção/reparo de caixas de direção elétrica'],
        ['DEH', 'Direção Eletro-hidráulica', 'Manutenção/reparo de sistemas eletro-hidráulicos'],
        ['BX', 'Buchas/Terminais', 'Troca de buchas, terminais e articulações'],
        ['BO', 'Bomba de Direção', 'Reparo/troca de bombas de direção hidráulica'],
        ['MG', 'Mangueiras', 'Troca de mangueiras de pressão e retorno'],
        ['AL', 'Alinhamento', 'Serviço de alinhamento de direção'],
        ['BL', 'Balanceamento', 'Serviço de balanceamento de rodas'],
        ['DG', 'Diagnóstico', 'Serviço de diagnóstico e avaliação'],
      ],
      styles: { fontSize: 8, cellPadding: 3, textColor: [40, 40, 40] },
      headStyles: { fillColor: [10, 10, 15], textColor: [245, 166, 35], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;

    // 4. PRIORIDADES
    checkPage(20);
    y = sectionTitle(doc, '4. Regras de Prioridade', y, pageW);
    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Prioridade', 'Quando Usar', 'Prazo']],
      body: [
        ['Normal', 'Serviços programados, trocas de rotina', 'Até 3 dias úteis'],
        ['Alta', 'Cliente com urgência, problemas de segurança', 'Até 1 dia útil'],
        ['Urgente', 'Direção travada, risco de acidente, guincho', 'Mesmo dia'],
      ],
      styles: { fontSize: 8, cellPadding: 3, textColor: [40, 40, 40] },
      headStyles: { fillColor: [10, 10, 15], textColor: [245, 166, 35], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
    });
    y = doc.lastAutoTable.finalY + 8;

    // 5. FOTOS
    checkPage(20);
    y = sectionTitle(doc, '5. Fotos do Veículo', y, pageW);
    addText('Ângulos obrigatórios (mínimo 4 fotos na entrada e 4 na saída):', 9, [40, 40, 40], true);
    const fotos = ['Frente - capota, para-choque, faróis', 'Traseira - para-choque traseiro, lanternas', 'Lateral Esquerda - porta do motorista, roda', 'Lateral Direita - porta do passageiro, roda', 'Danos pré-existentes - arranhões, amassados (quantas necessárias)', 'Placa do veículo visível em pelo menos 1 foto'];
    fotos.forEach(f => { addText('  -  ' + f); });
    y += 4;

    // 6. BOAS PRÁTICAS
    checkPage(20);
    y = sectionTitle(doc, '6. Boas Práticas', y, pageW);
    const boas = [
      'Sempre preencher todos os campos obrigatórios',
      'Sempre tirar fotos de entrada e saída do veículo',
      'Sempre informar o responsável na OS',
      'Nunca alterar dados de OS já entregues',
      'Sempre registrar observações importantes no log da OS',
      'Usar nomenclatura padronizada de serviços e peças',
      'Manter dados do cliente atualizados (telefone, e-mail)',
      'Verificar orçamentos pendentes diariamente',
      'Conferir relatórios mensais de serviços e faturamento',
      'Registrar KM de entrada e saída em toda OS',
    ];
    boas.forEach((b, i) => { addText(`  ${i + 1}. ${b}`); });

    pdfFooter(doc, page);
    doc.save('Plano_Padronizacao_Moreira.pdf');
  };

  return (
    <div>
      <div className="page-header"><h2>Configurações</h2></div>

      {/* Company Settings */}
      {canManageSettings && (
        <div className="card">
          <div className="card-header"><h3>Dados da Empresa</h3></div>
          {message && <div className={`alert ${message.startsWith('Erro') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group"><label>Nome da Empresa</label><input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} /></div>
              <div className="form-group"><label>CNPJ</label><input value={settings.cnpj} onChange={e => setSettings({...settings, cnpj: e.target.value})} /></div>
              <div className="form-group"><label>Inscrição Estadual</label><input value={settings.ie} onChange={e => setSettings({...settings, ie: e.target.value})} /></div>
              <div className="form-group"><label>WhatsApp da Empresa</label><input type="tel" inputMode="tel" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} placeholder="(00) 00000-0000" /></div>
              <div className="form-group"><label>Email</label><input value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} /></div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Endereço</label><input value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} /></div>
              <div className="form-group"><label>Bairro</label><input value={settings.neighborhood} onChange={e => setSettings({...settings, neighborhood: e.target.value})} /></div>
              <div className="form-group"><label>Cidade</label><input value={settings.city} onChange={e => setSettings({...settings, city: e.target.value})} /></div>
              <div className="form-group"><label>Estado</label><input value={settings.state} onChange={e => setSettings({...settings, state: e.target.value})} /></div>
              <div className="form-group"><label>CEP</label><input value={settings.zip_code} onChange={e => setSettings({...settings, zip_code: e.target.value})} /></div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</button>
            </div>
          </form>
        </div>
      )}

      {import.meta.env.MODE === 'offline' && canManageSettings && (
        <div className="card">
          <div className="card-header"><h3>Alterar Minha Senha</h3></div>
          {pwMessage && <div className={`alert ${pwMessage.startsWith('Erro') ? 'alert-error' : 'alert-success'}`}>{pwMessage}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="form-grid">
              <div className="form-group"><label>Senha Atual</label><input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required /></div>
              <div className="form-group"><label>Nova Senha</label><input type="password" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required minLength={4} /></div>
              <div className="form-group"><label>Confirmar Nova Senha</label><input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({...pwForm, confirmPassword: e.target.value})} required /></div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Alterar Senha</button>
            </div>
          </form>
        </div>
      )}

      {/* Documents */}
      {canManageSettings && (
        <div className="card">
          <div className="card-header"><h3>📄 Documentos</h3></div>
          <div style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <h4 style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 14 }}>Manual de Padronização</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Plano completo de uso do sistema: identificação da equipe, fluxo de atendimento, categorias de serviço, regras de fotos e boas práticas.
            </p>
            <button className="btn btn-primary" onClick={generatePlanPDF}>📥 Baixar PDF do Manual</button>
          </div>
        </div>
      )}

      {/* NF-e Info */}
      <div className="card">
        <div className="card-header"><h3>Nota Fiscal Eletrônica (NF-e)</h3></div>
        <div className="alert alert-warning">
          <strong>Integração com NF-e</strong><br />
          Para emissão de Nota Fiscal Eletrônica (NF-e) de forma legal, é necessário:
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Certificado Digital (e-CNPJ A1 ou A3)</li>
            <li>Credenciamento na SEFAZ do estado</li>
            <li>Integração com um serviço homologado (ex: Tiny ERP, Bling, Nuvem Fiscal, Focus NFe)</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            O sistema gera registros internos de notas fiscais para controle.
            Para emissão oficial, recomendamos integrar com um dos serviços acima.
          </p>
        </div>
      </div>
    </div>
  );
}
