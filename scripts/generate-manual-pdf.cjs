const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'public', 'logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Manual Oficial do Sistema — Moreira Direções</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  :root {
    --gold: #F5A623;
    --gold-light: #FFD60A;
    --gold-dark: #D4891A;
    --blue: #2B7FFF;
    --blue-light: #60A5FA;
    --blue-dark: #1D5FC0;
    --bg-dark: #0A0A0F;
    --bg-card: #12121A;
    --bg-card-hover: #1A1A26;
    --bg-surface: #16161F;
    --bg-input: #1E1E2A;
    --text: #F0F0F5;
    --text-secondary: #A0A0B8;
    --text-muted: #6C6C84;
    --border: #262638;
    --border-light: #36364E;
    --success: #00D68F;
    --success-bg: rgba(0,214,143,0.14);
    --warning: #FFB800;
    --warning-bg: rgba(255,184,0,0.14);
    --danger: #FF3D71;
    --danger-bg: rgba(255,61,113,0.14);
    --info: #00CFFF;
    --info-bg: rgba(0,207,255,0.14);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-dark);
    color: var(--text);
    font-size: 11.5px;
    line-height: 1.48;
  }

  .page {
    width: 210mm;
    height: 297mm;
    padding: 14mm 15mm 12mm 15mm;
    background:
      radial-gradient(circle at 88% 8%, rgba(245, 166, 35, 0.09) 0%, transparent 38%),
      radial-gradient(circle at 10% 92%, rgba(43, 127, 255, 0.08) 0%, transparent 40%),
      var(--bg-dark);
    position: relative;
    page-break-after: always;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .page:last-child {
    page-break-after: auto;
  }

  /* Top Header Bar on Content Pages */
  .page-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 9px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .page-topbar-brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .page-topbar-brand img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    border-radius: 6px;
  }
  .page-topbar-brand span {
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold);
  }
  .page-topbar-section {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 999px;
  }

  /* Page Footer */
  .page-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    margin-top: 10px;
    border-top: 1px solid var(--border);
    font-size: 9.5px;
    color: var(--text-muted);
  }
  .page-footer strong {
    color: var(--gold);
    font-weight: 700;
  }

  /* Section Headings */
  .section-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gold);
    background: rgba(245, 166, 35, 0.12);
    border: 1px solid rgba(245, 166, 35, 0.3);
    padding: 3px 10px;
    border-radius: 999px;
    margin-bottom: 6px;
  }
  .section-title {
    font-size: 20px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .section-subtitle {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  /* Cards & Grids */
  .card-doc {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 12px 14px;
    margin-bottom: 10px;
  }
  .card-doc-gold {
    background: linear-gradient(135deg, rgba(245, 166, 35, 0.12) 0%, rgba(18, 18, 26, 0.96) 100%);
    border: 1px solid rgba(245, 166, 35, 0.38);
  }
  .card-doc-blue {
    background: linear-gradient(135deg, rgba(43, 127, 255, 0.12) 0%, rgba(18, 18, 26, 0.96) 100%);
    border: 1px solid rgba(43, 127, 255, 0.35);
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  /* App Window Mockup Frame (Tutorial Illustration) */
  .mockup-window {
    background: #0D0D14;
    border: 1px solid var(--border-light);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
    margin-bottom: 11px;
  }
  .mockup-titlebar {
    background: #161622;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  .mockup-dots {
    display: flex;
    gap: 5px;
  }
  .mockup-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .mockup-url {
    font-size: 9.5px;
    color: var(--text-secondary);
    background: #0E0E17;
    border: 1px solid var(--border);
    padding: 2px 12px;
    border-radius: 999px;
    font-family: monospace;
  }
  .mockup-body {
    display: flex;
    min-height: 170px;
  }
  .mockup-sidebar {
    width: 132px;
    background: #111119;
    border-right: 1px solid var(--border);
    padding: 10px 8px;
    flex-shrink: 0;
  }
  .mockup-nav-item {
    font-size: 9.5px;
    padding: 5px 8px;
    border-radius: 6px;
    color: var(--text-secondary);
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }
  .mockup-nav-item.active {
    background: rgba(245, 166, 35, 0.16);
    color: var(--gold);
    border-left: 2px solid var(--gold);
    font-weight: 700;
  }
  .mockup-main {
    flex: 1;
    padding: 11px 13px;
    background: #0A0A0F;
  }

  /* Callout Badges (1, 2, 3...) */
  .callout-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--gold);
    color: #0A0A0F;
    font-weight: 900;
    font-size: 10px;
    box-shadow: 0 0 0 2px #0A0A0F, 0 0 10px rgba(245, 166, 35, 0.7);
    flex-shrink: 0;
    vertical-align: middle;
  }
  .callout-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .callout-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 8px 10px;
  }
  .callout-item strong {
    display: block;
    font-size: 11px;
    color: #FFFFFF;
    margin-bottom: 1px;
  }
  .callout-item p {
    font-size: 10.2px;
    color: var(--text-secondary);
    line-height: 1.38;
  }

  /* Mini UI components inside mockups */
  .ui-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ui-btn-gold {
    background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
    color: #0A0A0F;
  }
  .ui-btn-outline {
    background: #171723;
    border: 1px solid var(--border-light);
    color: var(--text);
  }
  .ui-btn-green {
    background: rgba(0, 214, 143, 0.18);
    border: 1px solid var(--success);
    color: var(--success);
  }
  .ui-btn-red {
    background: rgba(255, 61, 113, 0.18);
    border: 1px solid var(--danger);
    color: var(--danger);
  }
  .ui-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 8.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .ui-badge-info { background: var(--info-bg); color: var(--info); }
  .ui-badge-warn { background: var(--warning-bg); color: var(--warning); }
  .ui-badge-ok { background: var(--success-bg); color: var(--success); }
  .ui-badge-danger { background: var(--danger-bg); color: var(--danger); }

  .ui-stat {
    background: #14141F;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 7px 9px;
  }
  .ui-stat .lbl { font-size: 8.5px; color: var(--text-secondary); text-transform: uppercase; }
  .ui-stat .val { font-size: 14px; font-weight: 800; color: #FFF; margin-top: 2px; }

  .ui-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
    margin-top: 6px;
  }
  .ui-table th {
    text-align: left;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
    padding: 4px 6px;
    font-size: 8.5px;
    text-transform: uppercase;
  }
  .ui-table td {
    padding: 5px 6px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    color: var(--text);
  }

  .ui-input {
    background: var(--bg-input);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 9.5px;
    color: var(--text);
  }

  /* Flow Steps */
  .flow-step {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--gold);
    border-radius: 9px;
    padding: 9px 12px;
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 7px;
  }
  .flow-step-num {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(245, 166, 35, 0.16);
    border: 1px solid var(--gold);
    color: var(--gold);
    font-weight: 800;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
</style>
</head>
<body>

<!-- ==================== PÁGINA 1: CAPA EXECUTIVA ==================== -->
<div class="page" style="justify-content: space-between; padding: 18mm 16mm 14mm 16mm;">
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--gold);"></span>
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold);">Documentação Oficial & Manual do Proprietário</span>
      </div>
      <span style="font-size: 10.5px; color: var(--text-secondary); background: var(--bg-card); border: 1px solid var(--border); padding: 4px 12px; border-radius: 999px;">Versão 2.0 • Edição Nuvem + Offline</span>
    </div>

    <div style="text-align: center; margin: 26px 0 22px 0;">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Moreira Direções" style="width: 148px; height: 148px; object-fit: contain; border-radius: 22px; border: 2px solid rgba(245,166,35,0.45); box-shadow: 0 12px 40px rgba(245,166,35,0.22); background: #0E0E15; padding: 8px;" />` : ''}
      <div style="margin-top: 16px;">
        <span class="section-eyebrow">Sistema Exclusivo de Gestão Automotiva</span>
      </div>
      <h1 style="font-size: 32px; font-weight: 900; letter-spacing: -0.03em; color: #FFFFFF; margin-top: 6px; line-height: 1.15;">
        MOREIRA DIREÇÕES
      </h1>
      <p style="font-size: 14.5px; color: var(--gold); font-weight: 600; margin-top: 4px;">
        Manual Completo de Operação, Fluxo de Oficina e Gestão Financeira
      </p>
      <p style="font-size: 11.5px; color: var(--text-secondary); max-width: 520px; margin: 8px auto 0 auto;">
        Plataforma sob medida para oficinas especializadas em <strong>Direção Hidráulica, Elétrica, Eletro-hidráulica, Mecânica e Suspensão Automotiva</strong>.
      </p>
    </div>

    <!-- Destaques Premium na Capa -->
    <div class="grid-2" style="gap: 11px; margin-top: 14px;">
      <div class="card-doc card-doc-gold" style="margin-bottom:0;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--gold); letter-spacing: 0.08em; margin-bottom: 4px;">⚡ Operação 100% Contínua</div>
        <div style="font-size: 13px; font-weight: 700; color: #FFF; margin-bottom: 4px;">Funciona Online e Offline</div>
        <p style="font-size: 10.5px; color: var(--text-secondary);">
          Mesmo se a internet da oficina cair no meio do expediente, você continua criando OS, orçamentos, clientes e fotos. Quando a conexão volta, tudo sincroniza sozinho.
        </p>
      </div>
      <div class="card-doc card-doc-blue" style="margin-bottom:0;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--blue-light); letter-spacing: 0.08em; margin-bottom: 4px;">🔧 Catálogo Especializado</div>
        <div style="font-size: 13px; font-weight: 700; color: #FFF; margin-bottom: 4px;">Direção & Suspensão Integrados</div>
        <p style="font-size: 10.5px; color: var(--text-secondary);">
          Lista pronta com dezenas de serviços e peças de direção e suspensão para preencher orçamentos e ordens de serviço em segundos, sem precisar digitar tudo.
        </p>
      </div>
      <div class="card-doc" style="margin-bottom:0;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--success); letter-spacing: 0.08em; margin-bottom: 4px;">📸 Registro Fotográfico em 3 Etapas</div>
        <div style="font-size: 13px; font-weight: 700; color: #FFF; margin-bottom: 4px;">Entrada • Durante (Progresso) • Saída</div>
        <p style="font-size: 10.5px; color: var(--text-secondary);">
          Tire fotos pela câmera do celular ou PC com compressão inteligente automática — garantindo segurança para a oficina e anos de armazenamento gratuito.
        </p>
      </div>
      <div class="card-doc" style="margin-bottom:0;">
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--info); letter-spacing: 0.08em; margin-bottom: 4px;">🖨️ Impressão Universal & WhatsApp</div>
        <div style="font-size: 13px; font-weight: 700; color: #FFF; margin-bottom: 4px;">Qualquer Impressora, PDF e Avisos</div>
        <p style="font-size: 10.5px; color: var(--text-secondary);">
          Imprima Orçamentos, OS e Relatórios Financeiros em qualquer impressora conectada ao PC ou gere PDFs profissionais, além de avisar o cliente pelo WhatsApp com 1 clique.
        </p>
      </div>
    </div>

    <!-- Sumário Rápido -->
    <div class="card-doc" style="margin-top: 12px; margin-bottom: 0; padding: 11px 14px;">
      <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: var(--gold); letter-spacing: 0.08em; margin-bottom: 7px;">Sumário Rápido do Guia</div>
      <div class="grid-3" style="font-size: 10.2px; color: var(--text-secondary); gap: 6px;">
        <div><strong style="color:#FFF;">Pág. 02</strong> • Fluxo Ponta a Ponta da Oficina</div>
        <div><strong style="color:#FFF;">Pág. 03</strong> • Acesso Rápido & Dashboard</div>
        <div><strong style="color:#FFF;">Pág. 04</strong> • Clientes & Frota de Veículos</div>
        <div><strong style="color:#FFF;">Pág. 05</strong> • Orçamentos & Catálogo Rápido</div>
        <div><strong style="color:#FFF;">Pág. 06</strong> • Ordens de Serviço (OS)</div>
        <div><strong style="color:#FFF;">Pág. 07</strong> • Fotos (Entrada/Durante/Saída) & WhatsApp</div>
        <div><strong style="color:#FFF;">Pág. 08</strong> • Painel Financeiro & Impressão</div>
        <div><strong style="color:#FFF;">Pág. 09</strong> • Modo Offline, Auto-Update e Instalação</div>
        <div><strong style="color:var(--gold);">Acesso Web:</strong> moreira-direcoes.web.app</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Sistema de Gestão Automotiva</div>
    <div>Acesso Oficial: <strong>https://moreira-direcoes.web.app</strong></div>
    <div>Página 1 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 2: VISÃO GERAL & FLUXO DA OFICINA ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">01 • Visão Geral & Fluxo Operacional</div>
    </div>

    <span class="section-eyebrow">Como o Aplicativo Funciona</span>
    <h2 class="section-title">Fluxo de Trabalho de Ponta a Ponta</h2>
    <p class="section-subtitle">
      O sistema foi desenhado para acompanhar exatamente a rotina real da oficina, desde a chegada do veículo até a entrega final e o controle financeiro.
    </p>

    <div class="flow-step">
      <div class="flow-step-num">1</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Cadastro do Cliente e do Veículo</div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">
          Ao receber o cliente, cadastre seus dados (Nome, WhatsApp, CPF/CNPJ) e adicione o veículo informando <strong>Marca, Modelo, Placa, Ano e o Tipo de Direção</strong> (Hidráulica, Elétrica, Eletro-hidráulica ou Mecânica). Tudo fica salvo para futuras visitas.
        </div>
      </div>
    </div>

    <div class="flow-step" style="border-left-color: var(--blue);">
      <div class="flow-step-num" style="color: var(--blue-light); border-color: var(--blue); background: rgba(43,127,255,0.15);">2</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Elaboração do Orçamento com Catálogo de Direção e Suspensão</div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">
          Monte o orçamento selecionando serviços e peças direto da <strong>lista pronta de Direção e Suspensão</strong> (ou digitando itens personalizados). Imprima na hora ou envie o PDF para o cliente aprovar.
        </div>
      </div>
    </div>

    <div class="flow-step" style="border-left-color: var(--warning);">
      <div class="flow-step-num" style="color: var(--warning); border-color: var(--warning); background: rgba(255,184,0,0.15);">3</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Aprovação em 1 Clique → Geração Automática da Ordem de Serviço (OS)</div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">
          Quando o cliente aprovar o orçamento, basta clicar em <strong>"Aprovar e Gerar OS"</strong>. O sistema cria a Ordem de Serviço automaticamente puxando cliente, veículo, serviços, peças e valores sem precisar redigitar nada (ou você pode criar uma OS direto do zero).
        </div>
      </div>
    </div>

    <div class="flow-step" style="border-left-color: var(--info);">
      <div class="flow-step-num" style="color: var(--info); border-color: var(--info); background: rgba(0,207,255,0.15);">4</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Execução na Oficina + Fotos (Entrada, Durante e Saída)</div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">
          Acompanhe o status da OS (<em>Aberta → Em Andamento → Aguardando Peça → Concluída → Entregue</em>). Registre fotos de <strong>Entrada</strong>, fotos <strong>Durante (Progresso)</strong> do reparo e fotos de <strong>Saída</strong>. Adicione observações no histórico a qualquer momento.
        </div>
      </div>
    </div>

    <div class="flow-step" style="border-left-color: var(--success);">
      <div class="flow-step-num" style="color: var(--success); border-color: var(--success); background: rgba(0,214,143,0.15);">5</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Aviso Automático no WhatsApp, Impressão da OS e Painel Financeiro</div>
        <div style="font-size: 10.5px; color: var(--text-secondary);">
          Ao clicar em <strong>Concluir</strong>, o aplicativo monta automaticamente uma mensagem profissional no <strong>WhatsApp</strong> avisando o cliente que o veículo está pronto. Os valores entram automaticamente nos indicadores e gráficos do menu <strong>Financeiro</strong>.
        </div>
      </div>
    </div>

    <!-- Quadro Resumo dos Módulos do Menu Lateral -->
    <div class="card-doc card-doc-gold" style="margin-top: 10px; margin-bottom: 0;">
      <div style="font-size: 11px; font-weight: 800; color: var(--gold); text-transform: uppercase; margin-bottom: 8px;">
        🧭 Mapa dos Menus do Aplicativo (Barra Lateral Esquerda)
      </div>
      <div class="grid-2" style="gap: 8px; font-size: 10.3px;">
        <div>• <strong>Dashboard:</strong> Painel operacional rápido das OS e orçamentos do dia.</div>
        <div>• <strong>Clientes:</strong> Cadastro completo de clientes, WhatsApp e veículos.</div>
        <div>• <strong>Orçamentos:</strong> Criação, impressão, PDF, edição e aprovação de orçamentos.</div>
        <div>• <strong>Ordens de Serviço:</strong> Controle de bancada/oficina, fotos, status e histórico.</div>
        <div>• <strong>Financeiro:</strong> Faturamento, ticket médio, gráficos e impressão financeira.</div>
        <div>• <strong>Configurações:</strong> Dados da oficina para cabeçalho de impressão e operadores.</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Fluxo Operacional Ponta a Ponta</div>
    <div>Página 2 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 3: ACESSO RÁPIDO & DASHBOARD OPERACIONAL ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">02 • Acesso Rápido & Dashboard Operacional</div>
    </div>

    <span class="section-eyebrow">Tutorial Passo a Passo</span>
    <h2 class="section-title">1. Acesso por Nome & Painel Principal (Dashboard)</h2>
    <p class="section-subtitle">
      Entrada rápida para agilizar o atendimento no balcão e visão limpa de tudo o que está acontecendo no pátio da oficina, sem misturar dados financeiros na tela operacional.
    </p>

    <!-- Ilustração Tutorial: Login + Dashboard -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/</div>
        <div style="font-size: 9px; color: var(--success); font-weight: 700;">● Sincronizado</div>
      </div>
      <div class="mockup-body">
        <div class="mockup-sidebar">
          <div style="display:flex; align-items:center; gap:6px; padding-bottom:8px; margin-bottom:8px; border-bottom:1px solid var(--border);">
            <div style="width:18px; height:18px; border-radius:4px; background:var(--gold); color:#000; font-weight:900; font-size:10px; display:flex; align-items:center; justify-content:center;">M</div>
            <div style="font-size:9.5px; font-weight:800; color:#FFF;">MOREIRA <span style="color:var(--gold);">DIREÇÕES</span></div>
          </div>
          <div class="mockup-nav-item active"><span class="callout-num">2</span> Dashboard</div>
          <div class="mockup-nav-item">👥 Clientes</div>
          <div class="mockup-nav-item">📋 Orçamentos</div>
          <div class="mockup-nav-item">🔧 Ordens de Serviço</div>
          <div class="mockup-nav-item">💰 Financeiro</div>
          <div class="mockup-nav-item">⚙️ Configurações</div>
          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 8.5px; color: var(--text-secondary);">
            Operador ativo: <strong style="color:#FFF;">Moreira</strong> <span class="callout-num">1</span>
          </div>
        </div>
        <div class="mockup-main">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:9px;">
            <div style="font-size:13px; font-weight:800; color:#FFF;">Dashboard</div>
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="callout-num">3</span>
              <span class="ui-btn ui-btn-outline">📋 Novo Orçamento</span>
              <span class="ui-btn ui-btn-gold">🔧 Nova OS</span>
            </div>
          </div>

          <!-- KPI Cards Operacionais -->
          <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; margin-bottom:10px;">
            <div class="ui-stat" style="border-left: 3px solid var(--info);">
              <div class="lbl">OS em Aberto <span class="callout-num">4</span></div>
              <div class="val" style="color:var(--info);">4</div>
            </div>
            <div class="ui-stat" style="border-left: 3px solid var(--success);">
              <div class="lbl">OS Concluídas</div>
              <div class="val" style="color:var(--success);">2</div>
            </div>
            <div class="ui-stat" style="border-left: 3px solid var(--gold);">
              <div class="lbl">Entregues (30d)</div>
              <div class="val" style="color:var(--gold);">18</div>
            </div>
            <div class="ui-stat" style="border-left: 3px solid var(--warning);">
              <div class="lbl">Orç. Pendentes</div>
              <div class="val" style="color:var(--warning);">3</div>
            </div>
            <div class="ui-stat">
              <div class="lbl">Clientes</div>
              <div class="val">64</div>
            </div>
          </div>

          <!-- Tabelas Recentes -->
          <div class="grid-2" style="gap:8px;">
            <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:7px;">
              <div style="font-size:9.5px; font-weight:700; color:#FFF; margin-bottom:4px;">Ordens de Serviço Recentes <span class="callout-num">5</span></div>
              <table class="ui-table">
                <thead><tr><th>Código</th><th>Cliente / Veículo</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td style="color:var(--gold); font-weight:700;">OS-2604-012</td><td>Carlos • Hilux (Hidráulica)</td><td><span class="ui-badge ui-badge-warn">Em Andamento</span></td></tr>
                  <tr><td style="color:var(--gold); font-weight:700;">OS-2604-011</td><td>Marcos • Civic (Elétrica)</td><td><span class="ui-badge ui-badge-ok">Concluída</span></td></tr>
                </tbody>
              </table>
            </div>
            <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:7px;">
              <div style="font-size:9.5px; font-weight:700; color:#FFF; margin-bottom:4px;">Orçamentos Recentes</div>
              <table class="ui-table">
                <thead><tr><th>Código</th><th>Cliente</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td style="color:var(--blue-light); font-weight:700;">ORC-2604-008</td><td>Transportadora Silva</td><td><span class="ui-badge ui-badge-warn">Pendente</span></td></tr>
                  <tr><td style="color:var(--blue-light); font-weight:700;">ORC-2604-007</td><td>Carlos Eduardo</td><td><span class="ui-badge ui-badge-ok">Aprovado</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Explicação Numerada -->
    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Identificação Rápida por Nome</strong>
          <p>Ao abrir o app, basta digitar seu nome e clicar em <strong>Entrar</strong>. O nome fica registrado em todas as OS, orçamentos, fotos e observações que você lançar.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>Menu Lateral Inteligente</strong>
          <p>Navegue com 1 clique entre Dashboard, Clientes, Orçamentos, Ordens de Serviço, Financeiro e Configurações (no celular, abre pelo ícone ☰ no topo).</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Atalhos de Ação Imediata</strong>
          <p>Botões <strong>Novo Orçamento</strong> e <strong>Nova OS</strong> no topo direito do Dashboard para abrir um atendimento em segundos assim que o carro chega.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Indicadores 100% Operacionais</strong>
          <p>Mostra quantas OS estão abertas/em andamento, quantas estão prontas aguardando retirada e quantos orçamentos aguardam resposta do cliente (sem expor valores financeiros na tela da oficina).</p>
        </div>
      </div>
      <div class="callout-item" style="grid-column: span 2;">
        <span class="callout-num">5</span>
        <div>
          <strong>Listas de Acesso Rápido (Últimas OS e Últimos Orçamentos)</strong>
          <p>Clique diretamente sobre o código dourado da OS (ex.: <code>OS-2604-012</code>) ou sobre o código do orçamento (ex.: <code>ORC-2604-008</code>) para abrir os detalhes completos imediatamente.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 02 • Acesso & Dashboard</div>
    <div>Página 3 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 4: CLIENTES & VEÍCULOS ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">03 • Gestão de Clientes & Veículos</div>
    </div>

    <span class="section-eyebrow">Cadastro e Histórico por Placa</span>
    <h2 class="section-title">2. Clientes, WhatsApp Direto & Frota de Veículos</h2>
    <p class="section-subtitle">
      Mantenha a ficha completa de cada cliente, seus carros, o tipo de direção de cada veículo e todo o histórico de orçamentos e serviços já feitos na oficina.
    </p>

    <!-- Mockup: Ficha do Cliente e Veículos -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/clientes/cli-01</div>
        <div style="font-size: 9px; color: var(--text-secondary);">Ficha do Cliente</div>
      </div>
      <div class="mockup-main" style="padding: 12px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <div style="font-size:13.5px; font-weight:800; color:#FFF;">Carlos Eduardo Mendes <span class="callout-num">1</span></div>
            <div style="font-size:9.5px; color:var(--text-secondary);">CPF/CNPJ: 342.891.008-12 • Ribeirão Preto / SP</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="callout-num">2</span>
            <span class="ui-btn ui-btn-green">💬 WhatsApp (16) 99234-5678</span>
            <span class="ui-btn ui-btn-outline">📋 Orçamento</span>
            <span class="ui-btn ui-btn-gold">🔧 Nova OS</span>
          </div>
        </div>

        <div class="grid-2" style="gap:10px;">
          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:9px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="font-size:10px; font-weight:800; color:var(--gold); text-transform:uppercase;">🚗 Veículos do Cliente <span class="callout-num">3</span></div>
              <span class="ui-btn ui-btn-outline" style="padding:2px 7px; font-size:8px;">+ Adicionar Veículo</span>
            </div>
            <table class="ui-table">
              <thead><tr><th>Veículo</th><th>Placa</th><th>Tipo de Direção</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Toyota Hilux SRV</strong> (2021)</td>
                  <td><code style="color:var(--gold);">BRA-2E19</code></td>
                  <td><span class="ui-badge ui-badge-info">Hidráulica</span></td>
                </tr>
                <tr>
                  <td><strong>Honda Civic Touring</strong> (2022)</td>
                  <td><code style="color:var(--gold);">FGH-9A88</code></td>
                  <td><span class="ui-badge ui-badge-warn">Elétrica (EPS)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:9px;">
            <div style="font-size:10px; font-weight:800; color:var(--blue-light); text-transform:uppercase; margin-bottom:6px;">📜 Histórico de OS e Orçamentos <span class="callout-num">4</span></div>
            <table class="ui-table">
              <thead><tr><th>Código</th><th>Data</th><th>Serviço Principal</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td style="color:var(--gold); font-weight:700;">OS-2604-012</td>
                  <td>21/10/26</td>
                  <td>Recondicionamento Caixa Hidr.</td>
                  <td><span class="ui-badge ui-badge-ok">Concluída</span></td>
                </tr>
                <tr>
                  <td style="color:var(--blue-light); font-weight:700;">ORC-2604-007</td>
                  <td>20/10/26</td>
                  <td>Kit Reparo + Bieletas + Alinh.</td>
                  <td><span class="ui-badge ui-badge-ok">Aprovado</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Busca Instantânea de Clientes</strong>
          <p>Na tela <strong>Clientes</strong>, pesquise por nome, telefone ou CPF/CNPJ. Clique em <strong>+ Novo Cliente</strong> para cadastrar rapidamente os dados essenciais.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>WhatsApp em 1 Clique & Atalhos</strong>
          <p>Em qualquer lugar do sistema onde aparece o telefone do cliente, basta clicar sobre ele para abrir a conversa diretamente no WhatsApp Web ou celular.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Cadastro de Veículos por Tipo de Direção</strong>
          <p>Cadastre quantos carros o cliente tiver, classificando a direção como <strong>Hidráulica, Elétrica, Eletro-hidráulica ou Mecânica</strong>, além de placa, ano, cor e chassi.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Histórico Completo do Cliente</strong>
          <p>Consulte na mesma tela todas as Ordens de Serviço e Orçamentos anteriores daquele cliente para saber exatamente o que já foi trocado e quando.</p>
        </div>
      </div>
    </div>

    <div class="card-doc card-doc-blue" style="margin-top: 10px; margin-bottom: 0;">
      <div style="font-size: 11px; font-weight: 800; color: var(--blue-light); margin-bottom: 3px;">💡 Dica de Produtividade no Balcão</div>
      <p style="font-size: 10.5px; color: var(--text-secondary);">
        Ao clicar em <strong>"Orçamento"</strong> ou <strong>"Nova OS"</strong> de dentro da ficha do cliente, o sistema já abre o formulário com o cliente e o veículo dele pré-selecionados automaticamente!
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 03 • Clientes & Frota de Veículos</div>
    <div>Página 4 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 5: ORÇAMENTOS & CATÁLOGO DE DIREÇÃO E SUSPENSÃO ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">04 • Orçamentos & Catálogo Especializado</div>
    </div>

    <span class="section-eyebrow">Agilidade no Atendimento</span>
    <h2 class="section-title">3. Orçamentos com Catálogo de Direção e Suspensão</h2>
    <p class="section-subtitle">
      Monte orçamentos detalhados em segundos escolhendo serviços e peças de uma lista técnica completa de direção e suspensão, ou digitando livremente.
    </p>

    <!-- Mockup: Editor de Itens com Catálogo -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/orcamentos/novo</div>
        <div style="font-size: 9px; color: var(--gold); font-weight: 700;">Catálogo Ativo</div>
      </div>
      <div class="mockup-main" style="padding: 11px 13px;">
        <div style="font-size: 11px; font-weight: 800; color: #FFF; margin-bottom: 7px;">Itens do Orçamento (Serviços e Peças)</div>

        <!-- Barra do Catálogo Rápido -->
        <div style="background: #141422; border: 1px solid rgba(245,166,35,0.35); border-radius: 8px; padding: 8px 10px; margin-bottom: 9px;">
          <div style="font-size: 9px; font-weight: 700; color: var(--gold); text-transform: uppercase; margin-bottom: 5px;">
            ⚡ Adicionar Rápido da Lista de Direção e Suspensão
          </div>
          <div class="grid-2" style="gap: 8px;">
            <div class="ui-input" style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔧 + Selecionar Serviço (Caixa Hidráulica, Elétrica, Suspensão...)</span>
              <span class="callout-num">1</span>
            </div>
            <div class="ui-input" style="display:flex; justify-content:space-between; align-items:center;">
              <span>⚙️ + Selecionar Peça (Amortecedor, Pivô, Bieleta, Retentor...)</span>
              <span class="callout-num">2</span>
            </div>
          </div>
        </div>

        <!-- Linhas de Itens -->
        <table class="ui-table" style="margin-bottom: 8px;">
          <thead>
            <tr><th>Descrição do Serviço ou Peça <span class="callout-num">3</span></th><th>Tipo</th><th>Qtd</th><th>Valor Unit.</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Recondicionamento completo de caixa de direção hidráulica</td>
              <td><span class="ui-badge ui-badge-info">Serviço</span></td>
              <td>1</td>
              <td>R$ 850,00</td>
              <td style="font-weight:700;">R$ 850,00</td>
            </tr>
            <tr>
              <td>Jogo de reparo / vedação da caixa de direção hidráulica</td>
              <td><span class="ui-badge ui-badge-warn">Peça</span></td>
              <td>1</td>
              <td>R$ 240,00</td>
              <td style="font-weight:700;">R$ 240,00</td>
            </tr>
            <tr>
              <td>Troca de bieletas da barra estabilizadora + Alinhamento</td>
              <td><span class="ui-badge ui-badge-info">Serviço</span></td>
              <td>2</td>
              <td>R$ 120,00</td>
              <td style="font-weight:700;">R$ 240,00</td>
            </tr>
          </tbody>
        </table>

        <!-- Ações na Tela de Detalhe do Orçamento -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:7px; border-top:1px solid var(--border);">
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="callout-num">4</span>
            <span class="ui-btn ui-btn-outline">🖨️ Imprimir</span>
            <span class="ui-btn ui-btn-outline">📄 PDF</span>
            <span class="ui-btn ui-btn-outline">✏️ Editar</span>
            <span class="ui-btn ui-btn-red">🗑️ Excluir</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:11px; font-weight:800; color:var(--gold);">Total: R$ 1.330,00</span>
            <span class="callout-num">5</span>
            <span class="ui-btn ui-btn-gold">✓ Aprovar e Gerar OS</span>
          </div>
        </div>
      </div>
    </div>

    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Seletor de Serviços por Categoria</strong>
          <p>Inclui <em>Direção Hidráulica, Direção Elétrica/Eletro-hidráulica, Direção Mecânica, Suspensão Dianteira/Traseira e Alinhamento/Diagnóstico</em>. Basta escolher para inserir na tabela.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>Seletor de Peças de Direção e Suspensão</strong>
          <p>Inclui <em>Caixas, Bombas, Reparos/Retentores, Axiais, Terminais, Coifas, Fluido ATF, Amortecedores, Kits Batente, Bandejas, Buchas, Pivôs, Bieletas e Rolamentos</em>.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Autocompletar + Edição Livre</strong>
          <p>Ao digitar qualquer palavra no campo de descrição, o sistema também sugere itens do catálogo ou permite escrever qualquer descrição personalizada.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Imprimir, PDF, Editar e Excluir</strong>
          <p>Gere o documento impresso ou PDF com a logo da Moreira Direções. Você também pode <strong>Editar</strong> ou <strong>Excluir</strong> qualquer orçamento (inclusive de testes) a qualquer momento.</p>
        </div>
      </div>
      <div class="callout-item" style="grid-column: span 2;">
        <span class="callout-num">5</span>
        <div>
          <strong>Conversão Automática em Ordem de Serviço (OS)</strong>
          <p>Ao clicar em <strong>"Aprovar e Gerar OS"</strong>, o orçamento muda para <em>Aprovado</em> e o sistema cria a OS imediatamente com todos os itens e valores já preenchidos.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 04 • Orçamentos & Catálogo</div>
    <div>Página 5 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 6: ORDENS DE SERVIÇO (OS) ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">05 • Ordens de Serviço (OS)</div>
    </div>

    <span class="section-eyebrow">Controle de Bancada e Pátio</span>
    <h2 class="section-title">4. Gestão Completa da Ordem de Serviço (OS)</h2>
    <p class="section-subtitle">
      Controle o status de cada veículo no pátio, registre diagnóstico, serviços realizados, peças aplicadas, linha do tempo e imprima a OS com garantia.
    </p>

    <!-- Mockup: Detalhe da OS -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/ordens/os-2604-012</div>
        <div style="font-size: 9px; color: var(--gold); font-weight: 700;">OS-2604-012</div>
      </div>
      <div class="mockup-main" style="padding: 11px 13px;">
        <!-- Topo da OS -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:13px; font-weight:800; color:#FFF;">OS OS-2604-012</span>
            <span class="ui-badge ui-badge-warn">Em Andamento</span>
            <span class="ui-badge ui-badge-danger">Alta</span>
            <span class="callout-num">1</span>
          </div>
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="callout-num">2</span>
            <span class="ui-btn ui-btn-outline">🖨️ Imprimir OS</span>
            <span class="ui-btn ui-btn-outline">📄 PDF</span>
            <span class="ui-btn ui-btn-gold">✓ Concluir</span>
            <span class="ui-btn ui-btn-outline">✏️ Editar</span>
            <span class="ui-btn ui-btn-red">Excluir OS</span>
            <span class="callout-num">5</span>
          </div>
        </div>

        <div class="grid-2" style="gap:9px;">
          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:8px;">
            <div style="font-size:9.5px; font-weight:800; color:var(--gold); text-transform:uppercase; margin-bottom:5px;">Informações e Diagnóstico <span class="callout-num">3</span></div>
            <div style="font-size:9px; color:var(--text-secondary); line-height:1.5;">
              <div><strong style="color:#FFF;">Cliente:</strong> Carlos Eduardo • 💬 (16) 99234-5678</div>
              <div><strong style="color:#FFF;">Veículo:</strong> Toyota Hilux 2021 • Placa: <code>BRA-2E19</code></div>
              <div><strong style="color:#FFF;">Direção:</strong> Hidráulica • <strong style="color:#FFF;">KM:</strong> 84.300</div>
              <div style="margin-top:4px; padding-top:4px; border-top:1px solid var(--border);">
                <strong style="color:#FFF;">Serviços Realizados:</strong><br/>
                • Recondicionamento completo de caixa de direção hidráulica<br/>
                • Limpeza/flushing e sangria do sistema hidráulico
              </div>
            </div>
          </div>

          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:8px;">
            <div style="font-size:9.5px; font-weight:800; color:var(--blue-light); text-transform:uppercase; margin-bottom:5px;">Observações & Histórico <span class="callout-num">4</span></div>
            <div class="ui-input" style="margin-bottom:5px; color:var(--text-secondary);">Registrar observação ou atualização...</div>
            <div style="font-size:8.8px; color:var(--text-secondary); border-left:2px solid var(--gold); padding-left:7px;">
              <div><strong style="color:#FFF;">Moreira</strong> — Cretinagem da cremalheira concluída, aguardando montagem final. <span style="color:var(--text-muted);">(21/10 14:20)</span></div>
              <div style="margin-top:3px;"><strong style="color:#FFF;">Moreira</strong> — Status alterado para: em_andamento <span style="color:var(--text-muted);">(21/10 09:15)</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Ciclo de Status e Prioridade</strong>
          <p>Avance o status com 1 clique conforme o serviço evolui: <strong>Aberta → Iniciar (Em Andamento) → Aguard. Peça → Concluir → Entregar</strong>. Marque prioridades como Normal, Alta ou Urgente.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>Impressão da OS e Geração de PDF</strong>
          <p>Gera a Ordem de Serviço formatada em página única A4 com dados da oficina, cliente, veículo, diagnóstico, tabela de itens, observações e campos de assinatura.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Editar OS com Catálogo Rápido</strong>
          <p>Ao clicar em <strong>Editar</strong>, você pode inserir <strong>Serviços Realizados</strong> e <strong>Peças Utilizadas</strong> clicando direto no menu suspenso do catálogo de direção e suspensão, além de informar o KM de saída.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Linha do Tempo (Histórico Auditável)</strong>
          <p>Adicione observações durante o serviço. Cada mudança de status e anotação fica gravada com data, hora e o nome do profissional.</p>
        </div>
      </div>
      <div class="callout-item" style="grid-column: span 2;">
        <span class="callout-num">5</span>
        <div>
          <strong>Exclusão Inteligente da OS + Limpeza Automática das Fotos</strong>
          <p>Precisa apagar uma OS de teste ou aberta por engano? Clique em <strong>Excluir OS</strong> (no topo da OS ou dentro de Editar OS). O sistema apaga a OS, seus itens, histórico e <strong>remove todas as fotos vinculadas na nuvem</strong> para manter o armazenamento sempre limpo.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 05 • Ordens de Serviço (OS)</div>
    <div>Página 6 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 7: FOTOS EM 3 ETAPAS & WHATSAPP ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">06 • Fotos (Entrada / Durante / Saída) & WhatsApp</div>
    </div>

    <span class="section-eyebrow">Transparência e Segurança para a Oficina</span>
    <h2 class="section-title">5. Fluxo de Fotos em 3 Etapas & Aviso no WhatsApp</h2>
    <p class="section-subtitle">
      Documente visualmente como o carro chegou, o serviço sendo executado na bancada/elevador e o resultado final na saída — e avise o cliente pelo WhatsApp ao concluir.
    </p>

    <!-- Mockup: Seção de Fotos 3 Fases + Modal WhatsApp -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/ordens/os-2604-012#fotos</div>
        <div style="font-size: 9px; color: var(--info); font-weight: 700;">Compressão Automática Ativa</div>
      </div>
      <div class="mockup-main" style="padding: 11px 13px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:9px;">
          <div style="font-size:11.5px; font-weight:800; color:#FFF;">📷 Fotos do Veículo</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="callout-num">1</span>
            <span class="ui-input" style="font-weight:700; color:var(--gold); border-color:var(--gold);">Etapa: Entrada ▾ | Durante (Progresso) ▾ | Saída ▾</span>
            <span class="callout-num">2</span>
            <span class="ui-btn ui-btn-outline">📤 Arquivo</span>
            <span class="ui-btn ui-btn-gold">📷 Câmera</span>
          </div>
        </div>

        <!-- 3 Colunas das Etapas de Foto -->
        <div class="grid-3" style="gap:8px; margin-bottom:10px;">
          <div style="background:#13131D; border:1px solid rgba(0,207,255,0.35); border-radius:8px; padding:8px;">
            <div style="font-size:9.5px; font-weight:800; color:var(--info); margin-bottom:5px;">🔵 Fotos de Entrada <span class="callout-num">3</span></div>
            <div style="height:54px; background:linear-gradient(135deg,#1A2636,#0F1722); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--info); border:1px dashed rgba(0,207,255,0.4);">
              Vazamento na coifa / Estado inicial
            </div>
            <div style="font-size:8px; color:var(--text-muted); margin-top:4px;">21/10 08:40 • Toque para ampliar</div>
          </div>

          <div style="background:#13131D; border:1px solid rgba(255,184,0,0.4); border-radius:8px; padding:8px;">
            <div style="font-size:9.5px; font-weight:800; color:var(--warning); margin-bottom:5px;">🟡 Durante o Serviço (Progresso)</div>
            <div style="height:54px; background:linear-gradient(135deg,#2E2412,#19140A); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--warning); border:1px dashed rgba(255,184,0,0.4);">
              Caixa desmontada / Peças novas
            </div>
            <div style="font-size:8px; color:var(--text-muted); margin-top:4px;">21/10 11:15 • Progresso na bancada</div>
          </div>

          <div style="background:#13131D; border:1px solid rgba(0,214,143,0.4); border-radius:8px; padding:8px;">
            <div style="font-size:9.5px; font-weight:800; color:var(--success); margin-bottom:5px;">🟢 Fotos de Saída</div>
            <div style="height:54px; background:linear-gradient(135deg,#102B22,#0B1A15); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:9px; color:var(--success); border:1px dashed rgba(0,214,143,0.4);">
              Conjunto montado, limpo e testado
            </div>
            <div style="font-size:8px; color:var(--text-muted); margin-top:4px;">21/10 16:30 • Pronto p/ entrega</div>
          </div>
        </div>

        <!-- Simulação do Modal de Conclusão via WhatsApp -->
        <div style="background: linear-gradient(135deg, rgba(0,214,143,0.12), #141420); border: 1px solid rgba(0,214,143,0.45); border-radius: 8px; padding: 8px 11px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; font-weight:800; color:#FFF;">💬 Finalizar OS — Deseja avisar o cliente pelo WhatsApp? <span class="callout-num">4</span></div>
            <div style="font-size:9px; color:var(--text-secondary);">Gera mensagem pronta com Código da OS, Veículo, Placa, Serviços Realizados e Valor Total.</div>
          </div>
          <span class="ui-btn ui-btn-gold">Sim, avisar pelo WhatsApp</span>
        </div>
      </div>
    </div>

    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Escolha a Etapa da Foto</strong>
          <p>Antes de enviar ou fotografar, selecione no menu se a foto é de <strong>Entrada</strong>, <strong>Durante (Progresso)</strong> ou <strong>Saída</strong>.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>Câmera Ao Vivo ou Upload de Arquivo</strong>
          <p>Clique em <strong>Câmera</strong> para tirar a foto na hora pelo celular/tablet/webcam, ou em <strong>Arquivo</strong> para selecionar uma ou várias fotos da galeria.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Galeria Organizada em 3 Fases + Zoom</strong>
          <p>As fotos ficam separadas por cores (🔵 Entrada, 🟡 Durante o Serviço e 🟢 Saída). Clique em qualquer foto para abrir em tela cheia ou no botão <code>✕</code> para apagar uma foto específica.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Notificação de Conclusão via WhatsApp</strong>
          <p>Ao clicar em <strong>Concluir</strong> na OS, o sistema pergunta se você quer avisar o cliente e já abre o WhatsApp com uma mensagem completa e personalizada pronta para enviar.</p>
        </div>
      </div>
    </div>

    <div class="card-doc card-doc-gold" style="margin-top: 10px; margin-bottom: 0;">
      <div style="font-size: 11px; font-weight: 800; color: var(--gold); margin-bottom: 3px;">📸 Quantas fotos tirar por OS? (Compressão Automática Inteligente)</div>
      <p style="font-size: 10.4px; color: var(--text-secondary);">
        Recomendamos de <strong>4 a 6 fotos por OS</strong> (ex.: 2 na Entrada, 2 Durante o progresso e 2 na Saída). O aplicativo comprime automaticamente cada foto de 5 MB para cerca de <strong>180 KB a 250 KB</strong> sem perder nitidez — permitindo armazenar mais de <strong>100.000 fotos gratuitamente</strong> por muitos anos!
      </p>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 06 • Registro Fotográfico & WhatsApp</div>
    <div>Página 7 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 8: DASHBOARD FINANCEIRO & IMPRESSÃO UNIVERSAL ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">07 • Painel Financeiro & Impressão Universal</div>
    </div>

    <span class="section-eyebrow">Gestão de Faturamento e Documentos</span>
    <h2 class="section-title">6. Dashboard Financeiro & Impressão em Qualquer Impressora</h2>
    <p class="section-subtitle">
      Toda a parte financeira da oficina fica concentrada exclusivamente na aba <strong>Financeiro</strong>, com gráficos interativos, filtros e impressão de relatórios.
    </p>

    <!-- Mockup: Painel Financeiro -->
    <div class="mockup-window">
      <div class="mockup-titlebar">
        <div class="mockup-dots">
          <div class="mockup-dot" style="background:#FF5F56;"></div>
          <div class="mockup-dot" style="background:#FFBD2E;"></div>
          <div class="mockup-dot" style="background:#27C93F;"></div>
        </div>
        <div class="mockup-url">https://moreira-direcoes.web.app/relatorios</div>
        <div style="font-size: 9px; color: var(--gold); font-weight: 700;">Painel Financeiro Exclusivo</div>
      </div>
      <div class="mockup-main" style="padding: 11px 13px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="font-size:12.5px; font-weight:800; color:#FFF;">💰 Financeiro</div>
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="callout-num">1</span>
            <span class="ui-input">Mês: Outubro ▾</span>
            <span class="ui-input">Ano: 2026 ▾</span>
            <span class="callout-num">2</span>
            <span class="ui-btn ui-btn-outline">🖨️ Imprimir Relatório</span>
            <span class="ui-btn ui-btn-gold">📄 Baixar PDF</span>
          </div>
        </div>

        <div class="grid-4" style="gap:6px; margin-bottom:9px;">
          <div class="ui-stat" style="border-left: 3px solid var(--success);">
            <div class="lbl">Faturamento Realizado <span class="callout-num">3</span></div>
            <div class="val" style="color:var(--success); font-size:12.5px;">R$ 28.450,00</div>
          </div>
          <div class="ui-stat" style="border-left: 3px solid var(--gold);">
            <div class="lbl">Ticket Médio por OS</div>
            <div class="val" style="color:var(--gold); font-size:12.5px;">R$ 1.185,40</div>
          </div>
          <div class="ui-stat" style="border-left: 3px solid var(--info);">
            <div class="lbl">Em Aberto (No Pátio)</div>
            <div class="val" style="color:var(--info); font-size:12.5px;">R$ 4.320,00</div>
          </div>
          <div class="ui-stat" style="border-left: 3px solid var(--warning);">
            <div class="lbl">Orçamentos em Negoc.</div>
            <div class="val" style="color:var(--warning); font-size:12.5px;">R$ 3.890,00</div>
          </div>
        </div>

        <div class="grid-2" style="gap:8px;">
          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:8px;">
            <div style="font-size:9px; font-weight:800; color:var(--gold); text-transform:uppercase; margin-bottom:6px;">📊 Evolução Mensal de Faturamento (Clique na barra para filtrar) <span class="callout-num">4</span></div>
            <div style="display:flex; align-items:flex-end; gap:6px; height:48px; padding-top:6px;">
              <div style="flex:1; background:rgba(43,127,255,0.45); height:55%; border-radius:3px 3px 0 0;"></div>
              <div style="flex:1; background:rgba(43,127,255,0.45); height:70%; border-radius:3px 3px 0 0;"></div>
              <div style="flex:1; background:rgba(43,127,255,0.45); height:62%; border-radius:3px 3px 0 0;"></div>
              <div style="flex:1; background:rgba(43,127,255,0.45); height:82%; border-radius:3px 3px 0 0;"></div>
              <div style="flex:1; background:var(--gold); height:100%; border-radius:3px 3px 0 0;"></div>
              <div style="flex:1; background:rgba(43,127,255,0.25); height:30%; border-radius:3px 3px 0 0;"></div>
            </div>
          </div>
          <div style="background:#13131D; border:1px solid var(--border); border-radius:8px; padding:8px;">
            <div style="font-size:9px; font-weight:800; color:var(--blue-light); text-transform:uppercase; margin-bottom:5px;">🔍 Movimentações Financeiras Filtráveis <span class="callout-num">5</span></div>
            <div style="display:flex; gap:4px; margin-bottom:5px;">
              <span class="ui-badge ui-badge-ok">Concluídas / Faturadas</span>
              <span class="ui-badge ui-badge-info">Em Andamento</span>
              <span class="ui-badge ui-badge-warn">Todas</span>
            </div>
            <div style="font-size:8.8px; color:var(--text-secondary);">
              Pesquise por cliente, placa ou código da OS e veja o valor exato de cada serviço.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="callout-list">
      <div class="callout-item">
        <span class="callout-num">1</span>
        <div>
          <strong>Filtro por Mês ou Ano Completo</strong>
          <p>Alterne rapidamente entre qualquer mês específico ou selecione <strong>"Ano inteiro"</strong> para ver o balanço anual consolidado da oficina.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">2</span>
        <div>
          <strong>Impressão Universal (Qualquer Impressora) e PDF</strong>
          <p>Compatível com <strong>qualquer impressora conectada ao PC</strong> (jato de tinta, laser, tanque de tinta, USB ou Wi-Fi). O sistema ajusta automaticamente Orçamentos e OS para caberem em 1 página A4 limpa.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">3</span>
        <div>
          <strong>Indicadores Financeiros Claros</strong>
          <p>Veja na hora o <strong>Faturamento Realizado</strong> (OS concluídas/entregues), o <strong>Ticket Médio</strong>, o valor <strong>Em Aberto</strong> (carros em serviço) e a <strong>Taxa de Conversão</strong> de orçamentos.</p>
        </div>
      </div>
      <div class="callout-item">
        <span class="callout-num">4</span>
        <div>
          <strong>Gráfico Mensal Interativo + Receita por Direção</strong>
          <p>Clique em qualquer barra de mês no gráfico para filtrar aquele mês na hora! Acompanhe também qual tipo de direção (Hidráulica, Elétrica, etc.) gera mais receita.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 07 • Painel Financeiro & Impressão</div>
    <div>Página 8 de 9</div>
  </div>
</div>

<!-- ==================== PÁGINA 9: TECNOLOGIAS PREMIUM (OFFLINE, AUTO-UPDATE, PWA) ==================== -->
<div class="page">
  <div>
    <div class="page-topbar">
      <div class="page-topbar-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" />` : ''}
        <span>Moreira Direções • Manual do Sistema</span>
      </div>
      <div class="page-topbar-section">08 • Tecnologias Exclusivas & Instalação</div>
    </div>

    <span class="section-eyebrow">Engenharia de Alta Confiabilidade</span>
    <h2 class="section-title">7. Modo Offline Automático, Auto-Update e Instalação</h2>
    <p class="section-subtitle">
      Seu sistema conta com tecnologias modernas de aplicações corporativas para garantir que a oficina nunca pare de trabalhar.
    </p>

    <div class="grid-3" style="gap: 10px; margin-bottom: 12px;">
      <div class="card-doc card-doc-gold" style="margin-bottom:0;">
        <div style="font-size: 18px; margin-bottom: 4px;">📡</div>
        <div style="font-size: 12px; font-weight: 800; color: #FFF; margin-bottom: 4px;">Modo Offline Resiliente</div>
        <p style="font-size: 10.2px; color: var(--text-secondary);">
          Se o Wi-Fi ou a fibra da oficina cair, uma faixa amarela avisa: <em>"Modo offline ativo"</em>. Você pode continuar cadastrando clientes, orçamentos, OS e fotos normalmente. Assim que a internet voltar, tudo é enviado para a nuvem sozinho!
        </p>
      </div>

      <div class="card-doc card-doc-blue" style="margin-bottom:0;">
        <div style="font-size: 18px; margin-bottom: 4px;">🔄</div>
        <div style="font-size: 12px; font-weight: 800; color: #FFF; margin-bottom: 4px;">Auto-Update Inteligente</div>
        <p style="font-size: 10.2px; color: var(--text-secondary);">
          Esqueça limpar cache do navegador! Sempre que uma nova melhoria é lançada no sistema, o aplicativo detecta a nova versão automaticamente em segundo plano e atualiza sozinho na hora.
        </p>
      </div>

      <div class="card-doc" style="margin-bottom:0; border-color: rgba(0,214,143,0.4);">
        <div style="font-size: 18px; margin-bottom: 4px;">☁️</div>
        <div style="font-size: 12px; font-weight: 800; color: #FFF; margin-bottom: 4px;">Nuvem Google Firebase</div>
        <p style="font-size: 10.2px; color: var(--text-secondary);">
          Seus dados ficam protegidos na infraestrutura do Google (Firebase Firestore) em São Paulo, com sincronização em tempo real entre o computador do escritório e os celulares da oficina.
        </p>
      </div>
    </div>

    <!-- Guia de Instalação como Aplicativo (PC e Celular) -->
    <div class="card-doc" style="margin-bottom: 11px;">
      <div style="font-size: 11.5px; font-weight: 800; color: var(--gold); text-transform: uppercase; margin-bottom: 8px;">
        💻 📱 Como Instalar o Aplicativo no Computador e no Celular (PWA)
      </div>
      <div class="grid-2" style="gap: 10px;">
        <div style="background: #161622; border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px;">
          <div style="font-size: 11px; font-weight: 700; color: #FFF; margin-bottom: 4px;">🖥️ No Computador (Google Chrome ou Microsoft Edge)</div>
          <ol style="padding-left: 16px; font-size: 10.2px; color: var(--text-secondary); line-height: 1.5;">
            <li>Acesse <strong>https://moreira-direcoes.web.app</strong></li>
            <li>Na barra de endereços (canto direito), clique no ícone <strong>"Instalar Moreira Direções"</strong> (computador com uma setinha).</li>
            <li>Confirme em <strong>Instalar</strong>. Um atalho com a logo da Moreira Direções será criado na sua Área de Trabalho!</li>
          </ol>
        </div>
        <div style="background: #161622; border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px;">
          <div style="font-size: 11px; font-weight: 700; color: #FFF; margin-bottom: 4px;">📱 No Celular (Android ou iPhone)</div>
          <ol style="padding-left: 16px; font-size: 10.2px; color: var(--text-secondary); line-height: 1.5;">
            <li>Abra <strong>https://moreira-direcoes.web.app</strong> no navegador do celular.</li>
            <li><strong>No Android (Chrome):</strong> Toque nos 3 pontinhos ⋮ e em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
            <li><strong>No iPhone (Safari):</strong> Toque no botão <strong>Compartilhar</strong> e depois em <strong>"Adicionar à Tela de Início"</strong>.</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Configurações da Oficina -->
    <div class="card-doc" style="margin-bottom: 11px;">
      <div style="font-size: 11.5px; font-weight: 800; color: var(--blue-light); text-transform: uppercase; margin-bottom: 5px;">
        ⚙️ Menu Configurações (Personalização do Cabeçalho de Impressão)
      </div>
      <p style="font-size: 10.3px; color: var(--text-secondary);">
        No menu <strong>Configurações</strong>, você pode atualizar a qualquer momento o <strong>Nome da Empresa, CNPJ, Telefone, E-mail, Endereço, Cidade/Estado e o Prazo Padrão de Garantia (em meses)</strong>. Todas essas informações saem automaticamente no cabeçalho dos Orçamentos e das Ordens de Serviço impressas ou em PDF.
      </p>
    </div>

    <!-- Selo de Entrega Premium -->
    <div style="background: linear-gradient(135deg, rgba(245,166,35,0.16) 0%, rgba(43,127,255,0.12) 100%); border: 1px solid rgba(245,166,35,0.45); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="width: 44px; height: 44px; object-fit: contain; border-radius: 10px; background: #0A0A0F; padding: 4px; border: 1px solid var(--gold);" />` : ''}
        <div>
          <div style="font-size: 12.5px; font-weight: 800; color: #FFF;">Sistema Entregue, Validado e Pronto para Operação</div>
          <div style="font-size: 10px; color: var(--text-secondary);">Desenvolvido exclusivamente para <strong>Moreira Direções</strong> • Link oficial: <strong style="color:var(--gold);">https://moreira-direcoes.web.app</strong></div>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="ui-badge ui-badge-ok" style="font-size: 9.5px; padding: 4px 10px;">✓ 100% VALIDADO</span>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div><strong>MOREIRA DIREÇÕES</strong> — Manual Oficial do Sistema</div>
    <div>Módulo 08 • Modo Offline, Auto-Update & Instalação</div>
    <div>Página 9 de 9</div>
  </div>
</div>

</body>
</html>`;

app.whenReady().then(async () => {
  try {
    const docsDir = path.join(rootDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const htmlPath = path.join(docsDir, 'manual-moreira-direcoes.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    const win = new BrowserWindow({
      width: 1000,
      height: 1400,
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    await win.loadFile(htmlPath);
    // Aguardar fontes carregarem
    await win.webContents.executeJavaScript('document.fonts ? document.fonts.ready : Promise.resolve()');
    await new Promise(r => setTimeout(r, 800));

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const outputRootPdf = path.join(rootDir, 'Manual-Moreira-Direcoes.pdf');
    const outputPublicPdf = path.join(rootDir, 'public', 'Manual-Moreira-Direcoes.pdf');
    fs.writeFileSync(outputRootPdf, pdfBuffer);
    fs.writeFileSync(outputPublicPdf, pdfBuffer);

    console.log('PDF gerado com sucesso:', outputRootPdf, `(${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    app.exit(0);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    app.exit(1);
  }
});

