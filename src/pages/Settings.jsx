import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LOGO_BASE64 } from '../logoBase64';

export default function Settings() {
  const { api, user } = useAuth();
  const [settings, setSettings] = useState({
    name: '', cnpj: '', ie: '', phone: '', email: '',
    address: '', neighborhood: '', city: '', state: 'SP', zip_code: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Password change
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
      await api('/auth/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
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
    if (settings.phone) doc.text(`Tel: ${settings.phone}`, m + 37, 33);
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

    // 1. PERFIS DE ACESSO
    y = sectionTitle(doc, '1. Perfis de Acesso', y, pageW);
    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Perfil', 'Acesso', 'Responsabilidades']],
      body: [
        ['Admin', 'Total', 'Configurações, usuários, relatórios, todas as operações'],
        ['Gerente', 'Amplo', 'Aprovar orçamentos, supervisionar OS, relatórios'],
        ['Técnico', 'Operacional', 'Criar/editar OS, registrar serviços, adicionar fotos'],
        ['Atendente', 'Recepção', 'Cadastrar clientes, criar orçamentos, abrir OS'],
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
      ['2.4 Abertura OS', 'Nova OS > Diagnóstico + KM entrada + Prioridade > Atribuir técnico > Fotos de entrada (mín. 4)'],
      ['2.5 Execução', 'Status "Em Andamento" > Registrar log > Se peça: "Aguardando Peça" > Detalhar serviços realizados'],
      ['2.6 Conclusão', 'Status "Concluída" > KM saída > Fotos de saída (mín. 4) > Revisão do gerente'],
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
      'Sempre atribuir um técnico responsável à OS',
      'Nunca alterar dados de OS já entregues',
      'Sempre registrar observações importantes no log da OS',
      'Usar nomenclatura padronizada de serviços e peças',
      'Manter dados do cliente atualizados (telefone, e-mail)',
      'Verificar orçamentos pendentes diariamente',
      'Fazer backup do banco de dados semanalmente',
      'Registrar KM de entrada e saída em toda OS',
    ];
    boas.forEach((b, i) => { addText(`  ${i + 1}. ${b}`); });

    pdfFooter(doc, page);
    doc.save('Plano_Padronizacao_Moreira.pdf');
  };

  // ═══ PDF: Proposta Comercial ═══
  const generateProposalPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 15;
    let y = 10;

    // ── Cover page ──
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Logo centered
    try { doc.addImage(LOGO_BASE64, 'PNG', pageW / 2 - 35, 40, 70, 54); } catch {}

    // Title
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('SISTEMA DE GESTÃO', pageW / 2, 115, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(43, 127, 255);
    doc.text('Oficina de Direção & Suspensão', pageW / 2, 125, { align: 'center' });

    // Gold line
    doc.setFillColor(245, 166, 35);
    doc.rect(pageW / 2 - 40, 132, 80, 1, 'F');

    doc.setFontSize(12);
    doc.setTextColor(200, 200, 210);
    doc.setFont('helvetica', 'normal');
    doc.text('PROPOSTA COMERCIAL', pageW / 2, 142, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(140, 140, 150);
    doc.text(`Versão 1.0 - ${new Date().toLocaleDateString('pt-BR')}`, pageW / 2, 155, { align: 'center' });

    // Footer on cover
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.text('Documento confidencial', pageW / 2, pageH - 15, { align: 'center' });

    // ── Page 2: Features ──
    doc.addPage();
    y = pdfHeader(doc, 'PROPOSTA');

    y = sectionTitle(doc, 'Sobre o Sistema', y, pageW);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 55);
    doc.setFont('helvetica', 'normal');
    const about = doc.splitTextToSize('Sistema completo de gestão desenvolvido exclusivamente para oficinas de direção e suspensão automotiva. Controle total de clientes, veículos, orçamentos, ordens de serviço, fotos, relatórios e muito mais - tudo em um único software instalado no seu computador.', pageW - m * 2);
    doc.text(about, m, y);
    y += about.length * 5 + 8;

    y = sectionTitle(doc, 'Funcionalidades Incluídas', y, pageW);

    const features = [
      ['Gestão de Clientes', 'Cadastro completo com histórico de serviços, veículos e contatos'],
      ['Gestão de Veículos', 'Cadastro com marca, modelo, ano, placa, tipo de direção e cor'],
      ['Orçamentos', 'Criação, aprovação, recusa, conversão em OS, PDF para envio ao cliente'],
      ['Ordens de Serviço', 'Fluxo completo: abertura > execução > conclusão > entrega'],
      ['Fotos do Veículo', 'Registro fotográfico de entrada e saída com câmera ou upload'],
      ['Atribuição de Técnicos', 'Cada OS atribuída a um técnico responsável'],
      ['Relatórios', 'Faturamento, produtividade, serviços por tipo de direção'],
      ['Multi-usuários', 'Até 8 usuários com 4 perfis de acesso (Admin, Gerente, Técnico, Atendente)'],
      ['PDF Profissional', 'Orçamentos em PDF com logo da empresa para impressão ou WhatsApp'],
      ['Tema Premium', 'Interface moderna dark com identidade visual da sua oficina'],
      ['100% Local', 'Funciona sem internet, dados no seu computador com total privacidade'],
      ['Manual de Uso', 'Plano de padronização completo incluso (PDF)'],
    ];

    doc.autoTable({
      startY: y, margin: { left: m, right: m },
      head: [['Funcionalidade', 'Descrição']],
      body: features,
      styles: { fontSize: 8, cellPadding: 4, textColor: [40, 40, 40] },
      headStyles: { fillColor: [10, 10, 15], textColor: [245, 166, 35], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 10;

    pdfFooter(doc, 2);

    // ── Page 3: Pricing ──
    doc.addPage();
    y = pdfHeader(doc, 'INVESTIMENTO');

    y = sectionTitle(doc, 'Planos Disponíveis', y, pageW);

    // Plan 1: One-time purchase
    doc.setFillColor(252, 249, 242);
    doc.roundedRect(m, y, pageW - m * 2, 50, 3, 3, 'F');
    doc.setFillColor(245, 166, 35);
    doc.rect(m, y, 3, 50, 'F');

    doc.setTextColor(180, 140, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('LICENÇA VITALÍCIA', m + 10, y + 7);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(22);
    doc.text('R$ 2.500,00', m + 10, y + 18);

    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Pagamento único - use para sempre', m + 10, y + 25);

    const incl1 = ['- Instalação no computador da oficina', '- Configuração inicial com dados da empresa', '- Treinamento da equipe (presencial ou remoto)', '- Manual de padronização completo', '- 30 dias de suporte gratuito pós-instalação'];
    incl1.forEach((t, i) => {
      doc.setTextColor(50, 130, 50);
      doc.setFontSize(8);
      doc.text(t, m + 10, y + 32 + i * 4);
    });

    y += 58;

    // Plan 2: Maintenance
    doc.setFillColor(242, 248, 255);
    doc.roundedRect(m, y, pageW - m * 2, 42, 3, 3, 'F');
    doc.setFillColor(43, 127, 255);
    doc.rect(m, y, 3, 42, 'F');

    doc.setTextColor(43, 100, 200);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MANUTENÇÃO & ATUALIZAÇÃO MENSAL', m + 10, y + 7);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(22);
    doc.text('R$ 150,00', m + 10, y + 18);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 110);
    doc.text('/mês', m + 68, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Opcional - contrate quando precisar', m + 10, y + 25);

    const incl2 = ['- Suporte técnico prioritário', '- Atualizações e melhorias do sistema', '- Backup assistido dos dados', '- Correção de problemas'];
    incl2.forEach((t, i) => {
      doc.setTextColor(30, 80, 180);
      doc.setFontSize(8);
      doc.text(t, m + 10, y + 32 + i * 4);
    });

    y += 52;

    // Summary box
    doc.setFillColor(10, 10, 15);
    doc.roundedRect(m, y, pageW - m * 2, 24, 3, 3, 'F');
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESUMO DO INVESTIMENTO', m + 10, y + 8);
    doc.setTextColor(200, 200, 210);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Licença vitalícia: R$ 2.500,00 (pgto. único)  +  Manutenção: R$ 150,00/mês (opcional)', m + 10, y + 16);

    y += 32;

    // Contact
    y = sectionTitle(doc, 'Contato', y, pageW);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 55);
    doc.setFont('helvetica', 'normal');
    if (settings.phone) doc.text(`Telefone/WhatsApp: ${settings.phone}`, m, y);
    y += settings.phone ? 6 : 0;
    if (settings.email) doc.text(`Email: ${settings.email}`, m, y);
    y += settings.email ? 6 : 0;
    if (settings.city) doc.text(`Localização: ${[settings.city, settings.state].filter(Boolean).join('/')}`, m, y);

    pdfFooter(doc, 3);
    doc.save('Proposta_Comercial_Moreira.pdf');
  };

  return (
    <div>
      <div className="page-header"><h2>Configurações</h2></div>

      {/* Company Settings */}
      {(user?.role === 'admin' || user?.role === 'gerente') && (
        <div className="card">
          <div className="card-header"><h3>Dados da Empresa</h3></div>
          {message && <div className={`alert ${message.startsWith('Erro') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group"><label>Nome da Empresa</label><input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} /></div>
              <div className="form-group"><label>CNPJ</label><input value={settings.cnpj} onChange={e => setSettings({...settings, cnpj: e.target.value})} /></div>
              <div className="form-group"><label>Inscrição Estadual</label><input value={settings.ie} onChange={e => setSettings({...settings, ie: e.target.value})} /></div>
              <div className="form-group"><label>Telefone</label><input value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} /></div>
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

      {/* Change Password */}
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

      {/* Documents */}
      {(user?.role === 'admin' || user?.role === 'gerente') && (
        <div className="card">
          <div className="card-header"><h3>📄 Documentos</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 14 }}>📋 Manual de Padronização</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Plano completo de uso do sistema: perfis de acesso, fluxo de atendimento, categorias de serviço, regras de fotos e boas práticas.
              </p>
              <button className="btn btn-primary" onClick={generatePlanPDF} style={{ width: '100%', justifyContent: 'center' }}>📥 Baixar PDF do Manual</button>
            </div>
            <div style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--gold)', marginBottom: 8, fontSize: 14 }}>💼 Proposta Comercial</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Documento de venda com funcionalidades, planos e preços para apresentar a clientes interessados no sistema.
              </p>
              <button className="btn btn-success" onClick={generateProposalPDF} style={{ width: '100%', justifyContent: 'center' }}>📥 Baixar Proposta Comercial</button>
            </div>
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
