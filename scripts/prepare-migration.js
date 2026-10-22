const fs = require('fs');
const path = require('path');

const legacyDir = path.resolve(__dirname, '..', 'migration', 'legacy-json');
const outDir = path.resolve(__dirname, '..', 'migration', 'prepared');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(legacyDir, `${name}.json`), 'utf8').replace(/^\uFEFF/, ''));
}

const proprietarios = readJson('Proprietario');
const veiculos = readJson('Veiculo');
const orcamentos = readJson('Orcamento');
const pagamentos = readJson('Pagamentos');

console.log('Lendo dados brutos do MDB...');
console.log(`- Proprietarios: ${proprietarios.length}`);
console.log(`- Veiculos: ${veiculos.length}`);
console.log(`- Linhas de Orcamento: ${orcamentos.length}`);
console.log(`- Pagamentos: ${pagamentos.length}`);

// ── Utilitários de Limpeza ──
function cleanString(val) {
  if (val == null) return '';
  const s = String(val).trim();
  if (s === '-' || s === '--' || s === '---' || s === '----------' || s.toLowerCase() === 'null') return '';
  return s;
}

function formatPhone(phone, cell) {
  const p1 = cleanString(phone).replace(/\D/g, '');
  const p2 = cleanString(cell).replace(/\D/g, '');
  
  const cleanPhone = (num) => {
    if (!num) return '';
    // Se tem 8 ou 9 dígitos sem DDD, assume DDD 16 (Ribeirão Preto / região da Moreira Direções)
    if (num.length === 8 || num.length === 9) return `16${num}`;
    return num;
  };

  const primary = cleanPhone(p2) || cleanPhone(p1);
  const secondary = (primary === cleanPhone(p2)) ? cleanPhone(p1) : '';
  return { phone: primary, phone2: secondary };
}

function parseDateBR(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`;
  }
  const matchISO = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchISO) {
    return `${matchISO[1]}T12:00:00.000Z`;
  }
  return null;
}

function normalizePlate(plate) {
  if (!plate) return '';
  return cleanString(plate).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function displayPlate(normPlate) {
  if (!normPlate) return '';
  // Se for 7 caracteres (ABC1234 ou ABC1D23)
  if (normPlate.length === 7) {
    // Se os últimos 4 forem números (ABC1234), formatar como ABC-1234
    if (/^[A-Z]{3}\d{4}$/.test(normPlate)) {
      return `${normPlate.slice(0, 3)}-${normPlate.slice(3)}`;
    }
  }
  return normPlate;
}

// ── 1. Preparar Clientes ──
const clients = [];
const clientMap = new Map();

// Cliente especial para veículos/OS sem proprietário cadastrado
const clientZero = {
  id: 'cli_legacy_0',
  legacyId: 0,
  name: 'Cliente Balcão / Não Informado',
  type: 'pf',
  cpfCnpj: '',
  phone: '',
  phone2: '',
  email: '',
  address: '',
  neighborhood: '',
  city: 'Ribeirão Preto',
  state: 'SP',
  zipCode: '',
  notes: 'Cadastro criado para vincular veículos e ordens de serviço históricas sem proprietário especificado no sistema anterior.',
  createdAt: '2019-07-23T12:00:00.000Z',
  updatedAt: new Date().toISOString()
};
clients.push(clientZero);
clientMap.set('0', clientZero);

proprietarios.forEach(p => {
  const cod = String(p.CodProprietario);
  const { phone, phone2 } = formatPhone(p.Fixo, p.Celular);
  const cpf = cleanString(p.CPF).replace(/[^\d.-]/g, '');
  const rua = cleanString(p.Rua);
  const num = cleanString(p.Numero);
  const fullAddress = [rua, num].filter(Boolean).join(', ');
  const obs = cleanString(p.Obs);
  const rg = cleanString(p.RG);
  const notes = [obs, rg ? `RG: ${rg}` : ''].filter(Boolean).join(' | ');

  const clientDoc = {
    id: `cli_legacy_${cod}`,
    legacyId: p.CodProprietario,
    name: cleanString(p.Nome) || `Cliente ${cod}`,
    type: (cpf.replace(/\D/g, '').length > 11) ? 'pj' : 'pf',
    cpfCnpj: cpf,
    phone,
    phone2,
    email: '',
    address: fullAddress,
    neighborhood: cleanString(p.Bairro),
    city: 'Ribeirão Preto',
    state: 'SP',
    zipCode: '',
    notes,
    createdAt: '2019-07-23T12:00:00.000Z',
    updatedAt: new Date().toISOString()
  };

  clients.push(clientDoc);
  clientMap.set(cod, clientDoc);
});

console.log(`\n1. Clientes preparados: ${clients.length}`);

// ── 2. Preparar Veículos ──
const vehicles = [];
const vehicleByPlate = new Map();
const vehicleById = new Map();

veiculos.forEach(v => {
  const codVeic = String(v.CodVeiculo);
  const codProp = String(v.CodProprietario != null ? v.CodProprietario : '0');
  const owner = clientMap.get(codProp) || clientZero;
  const pNorm = normalizePlate(v.Placa);

  const vehDoc = {
    id: `veh_legacy_${codVeic}`,
    legacyId: v.CodVeiculo,
    clientId: owner.id,
    clientName: owner.name,
    plate: displayPlate(pNorm),
    plateNormalized: pNorm,
    make: cleanString(v.Marca) || 'NÃO INFORMADA',
    model: cleanString(v.Modelo) || 'NÃO INFORMADO',
    year: cleanString(v.Ano),
    color: cleanString(v.Cor),
    steeringType: 'hidraulica', // Default inicial, ajustaremos abaixo com histórico
    chassis: '',
    km: '',
    notes: '',
    createdAt: '2019-07-23T12:00:00.000Z',
    updatedAt: new Date().toISOString()
  };

  vehicles.push(vehDoc);
  vehicleById.set(vehDoc.id, vehDoc);
  if (pNorm) {
    if (!vehicleByPlate.has(pNorm)) {
      vehicleByPlate.set(pNorm, vehDoc);
    }
  }
});

console.log(`2. Veículos do cadastro preparados: ${vehicles.length}`);

// ── 3. Recuperar Placas de Orçamentos que não estavam em Veículo ──
let recuperadosDeOrcamento = 0;
orcamentos.forEach(o => {
  const pNorm = normalizePlate(o.Placa);
  if (pNorm && !vehicleByPlate.has(pNorm)) {
    recuperadosDeOrcamento++;
    const codVeic = `recup_${pNorm}`;
    const vehDoc = {
      id: `veh_legacy_${codVeic}`,
      legacyId: codVeic,
      clientId: clientZero.id,
      clientName: clientZero.name,
      plate: displayPlate(pNorm),
      plateNormalized: pNorm,
      make: 'OUTROS',
      model: 'VEÍCULO HISTÓRICO',
      year: '',
      color: '',
      steeringType: 'hidraulica',
      chassis: '',
      km: '',
      notes: 'Veículo recuperado automaticamente do histórico de ordens de serviço antigas.',
      createdAt: parseDateBR(o.Data) || '2019-07-23T12:00:00.000Z',
      updatedAt: new Date().toISOString()
    };
    vehicles.push(vehDoc);
    vehicleById.set(vehDoc.id, vehDoc);
    vehicleByPlate.set(pNorm, vehDoc);
  }
});

console.log(`3. Veículos recuperados de orçamentos: ${recuperadosDeOrcamento} (Total veículos agora: ${vehicles.length})`);

// ── 4. Mapear Pagamentos por OS ──
const pagamentosPorOS = new Map();
pagamentos.forEach(p => {
  const codOS = cleanString(p.CodOS);
  if (!codOS) return;
  if (!pagamentosPorOS.has(codOS)) pagamentosPorOS.set(codOS, []);
  pagamentosPorOS.get(codOS).push(p);
});

// ── 5. Agrupar e Preparar Ordens de Serviço (OS) ──
const osGroupMap = new Map();

orcamentos.forEach(r => {
  const codOS = cleanString(r.OS);
  const codOrc = cleanString(r.CodOrcamento);
  const chave = codOS || codOrc || `IND_${r.Indice}`;

  if (!osGroupMap.has(chave)) {
    osGroupMap.set(chave, {
      chave,
      codOS,
      codOrc,
      placa: normalizePlate(r.Placa),
      dataRaw: r.Data,
      situacao: r.Situacao,
      itemsRaw: []
    });
  }
  const g = osGroupMap.get(chave);
  g.itemsRaw.push(r);
});

console.log(`\n4. Ordens de Serviço agrupadas: ${osGroupMap.size}`);

const serviceOrders = [];
const serviceOrderItems = [];

osGroupMap.forEach((g) => {
  const pNorm = g.placa;
  const vehicle = vehicleByPlate.get(pNorm) || null;
  const client = vehicle ? (clientMap.get(String(vehicle.clientId).replace('cli_legacy_', '')) || clientZero) : clientZero;

  const isoDate = parseDateBR(g.dataRaw) || '2019-07-23T12:00:00.000Z';
  const isConcluida = g.situacao === 'F';
  const orderId = `os_legacy_${g.chave}`;
  const orderCode = `OS-${g.codOS || g.codOrc || g.chave}`;

  // Processar itens
  let totalOrder = 0;
  const servicesTextList = [];
  const partsTextList = [];
  let detectedSteering = null;

  g.itemsRaw.forEach((row, itemIdx) => {
    const desc = cleanString(row.Servico) || 'Serviço automotivo';
    const qtd = Number(row.Qtd) || 1;
    const unitPrice = Number(row.Valor) || 0;
    const itemTotal = Number(row.Total) || (qtd * unitPrice);
    totalOrder += itemTotal;

    // Detectar se é peça ou serviço pela descrição
    const descUpper = desc.toUpperCase();
    const isPeca = descUpper.startsWith('1') || descUpper.startsWith('2') || descUpper.startsWith('4') ||
      descUpper.includes('PEÇA') || descUpper.includes('KIT') || descUpper.includes('RETENTOR') ||
      descUpper.includes('COIFA') || descUpper.includes('BOMBA') || descUpper.includes('CAIXA DE DIRE') ||
      descUpper.includes('BARRA') || descUpper.includes('TERMINAL') || descUpper.includes('AXIAL') ||
      descUpper.includes('AMORTECEDOR') || descUpper.includes('PIVÔ') || descUpper.includes('BIELETA');

    const itemType = isPeca ? 'peca' : 'servico';
    if (isPeca) partsTextList.push(`• ${desc}`);
    else servicesTextList.push(`• ${desc}`);

    // Detectar tipo de direção
    if (descUpper.includes('ELÉTRIC') || descUpper.includes('ELETRIC') || descUpper.includes('EPS')) {
      detectedSteering = 'eletrica';
    } else if (descUpper.includes('ELETRO-HIDR') || descUpper.includes('ELETROHIDR')) {
      detectedSteering = 'eletrohidraulica';
    } else if (descUpper.includes('MECÂNIC') || descUpper.includes('MECANIC')) {
      detectedSteering = 'mecanica';
    } else if (descUpper.includes('HIDRÁULIC') || descUpper.includes('HIDRAULIC')) {
      detectedSteering = 'hidraulica';
    }

    serviceOrderItems.push({
      orderId,
      itemId: `item_${g.chave}_${itemIdx + 1}`,
      description: desc,
      type: itemType,
      quantity: qtd,
      unit_price: unitPrice,
      total: itemTotal
    });
  });

  // Atualizar steeringType no veículo se detectado
  if (vehicle && detectedSteering && vehicle.steeringType === 'hidraulica') {
    vehicle.steeringType = detectedSteering;
  }

  // Buscar pagamentos vinculados
  const pagamentos = pagamentosPorOS.get(g.codOS) || [];
  const formasPgto = pagamentos.map(p => cleanString(p.Forma)).filter(Boolean);
  const formaPrincipal = formasPgto[0] || (isConcluida ? 'OUTRO' : '');

  const orderDoc = {
    id: orderId,
    code: orderCode,
    legacyId: g.codOS || g.codOrc || g.chave,
    legacyBudgetCode: g.codOrc ? `ORC-${g.codOrc}` : '',
    clientId: client.id,
    client_id: client.id,
    clientName: client.name,
    client_name: client.name,
    clientPhone: client.phone,
    client_phone: client.phone,
    clientCpfCnpj: client.cpfCnpj,
    client_cpf_cnpj: client.cpfCnpj,
    vehicleId: vehicle ? vehicle.id : '',
    vehicle_id: vehicle ? vehicle.id : '',
    plate: vehicle ? vehicle.plate : displayPlate(g.placa),
    make: vehicle ? vehicle.make : 'NÃO INFORMADA',
    model: vehicle ? vehicle.model : 'NÃO INFORMADO',
    year: vehicle ? vehicle.year : '',
    color: vehicle ? vehicle.color : '',
    steeringType: detectedSteering || (vehicle ? vehicle.steeringType : 'hidraulica'),
    steering_type: detectedSteering || (vehicle ? vehicle.steeringType : 'hidraulica'),
    status: isConcluida ? 'concluida' : 'aberta',
    priority: 'normal',
    diagnosis: servicesTextList[0] ? servicesTextList[0].replace('• ', '') : 'Revisão de direção e suspensão',
    services_performed: servicesTextList.join('\n'),
    parts_used: partsTextList.join('\n'),
    notes: `Importado do banco de dados legado (OS: ${g.codOS || '-'}, Orçamento: ${g.codOrc || '-'}). Situação original: ${g.situacao}.`,
    km_entry: '',
    km_exit: '',
    total: totalOrder,
    budget_total: totalOrder,
    payment_method: formaPrincipal,
    created_at: isoDate,
    started_at: isConcluida ? isoDate : null,
    completed_at: isConcluida ? isoDate : null,
    delivered_at: isConcluida ? isoDate : null,
    created_by: 'sistema_migracao',
    created_by_name: 'Migração Moreira'
  };

  serviceOrders.push(orderDoc);
});

console.log(`5. Itens de OS preparados: ${serviceOrderItems.length}`);

// Salvar arquivos JSON preparados
fs.writeFileSync(path.join(outDir, 'clients.json'), JSON.stringify(clients, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'vehicles.json'), JSON.stringify(vehicles, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'serviceOrders.json'), JSON.stringify(serviceOrders, null, 2), 'utf8');
fs.writeFileSync(path.join(outDir, 'orderItems.json'), JSON.stringify(serviceOrderItems, null, 2), 'utf8');

console.log('\n=== ARQUIVOS PREPARADOS SALVOS COM SUCESSO! ===');
console.log(`- migration/prepared/clients.json       : ${clients.length} clientes`);
console.log(`- migration/prepared/vehicles.json      : ${vehicles.length} veículos`);
console.log(`- migration/prepared/serviceOrders.json : ${serviceOrders.length} ordens de serviço`);
console.log(`- migration/prepared/orderItems.json    : ${serviceOrderItems.length} itens de ordem de serviço`);

