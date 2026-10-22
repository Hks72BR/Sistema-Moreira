const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'migration', 'legacy-json');
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${file}.json`), 'utf8').replace(/^\uFEFF/, ''));
}

const proprietarios = readJson('Proprietario');
const veiculos = readJson('Veiculo');
const orcamentos = readJson('Orcamento');
const pagamentos = readJson('Pagamentos');

console.log('=== ESTATÍSTICAS GERAIS ===');
console.log(`Proprietários: ${proprietarios.length}`);
console.log(`Veículos: ${veiculos.length}`);
console.log(`Linhas de Orçamento: ${orcamentos.length}`);
console.log(`Pagamentos: ${pagamentos.length}`);

// Map de proprietários por CodProprietario
const propMap = new Map();
proprietarios.forEach(p => {
  if (p.CodProprietario != null) {
    propMap.set(String(p.CodProprietario), p);
  }
});

// Análise de Veículos x Proprietários
let veiculosComDono = 0;
let veiculosSemDono = 0;
const donosAusentes = new Set();
const placaMap = new Map();

veiculos.forEach(v => {
  const donoId = v.CodProprietario != null ? String(v.CodProprietario) : '';
  if (donoId && propMap.has(donoId)) {
    veiculosComDono++;
  } else {
    veiculosSemDono++;
    if (donoId) donosAusentes.add(donoId);
  }
  const placaNorm = (v.Placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (placaNorm) {
    if (!placaMap.has(placaNorm)) placaMap.set(placaNorm, []);
    placaMap.get(placaNorm).push(v);
  }
});

console.log('\n=== VÍNCULO VEÍCULO -> PROPRIETÁRIO ===');
console.log(`Veículos com proprietário encontrado: ${veiculosComDono} (${(veiculosComDono / veiculos.length * 100).toFixed(1)}%)`);
console.log(`Veículos sem proprietário ou com CodProprietario não encontrado: ${veiculosSemDono}`);
console.log(`IDs de proprietários ausentes em Veículo: ${donosAusentes.size}`);

// Análise de Orçamento
const osMap = new Map();
const orcMap = new Map();
const situacoesOrc = {};
let orcComPlacaNoVeiculo = 0;
let orcSemPlacaNoVeiculo = 0;
const placasAusentesNoVeiculo = new Set();

orcamentos.forEach(row => {
  const sit = row.Situacao || '(vazio)';
  situacoesOrc[sit] = (situacoesOrc[sit] || 0) + 1;

  const placaNorm = (row.Placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (placaNorm && placaMap.has(placaNorm)) {
    orcComPlacaNoVeiculo++;
  } else {
    orcSemPlacaNoVeiculo++;
    if (placaNorm) placasAusentesNoVeiculo.add(placaNorm);
  }

  const codOS = (row.OS || '').trim();
  const codOrc = (row.CodOrcamento || '').trim();

  const chaveOS = codOS || codOrc || `INDICE_${row.Indice}`;
  if (!osMap.has(chaveOS)) {
    osMap.set(chaveOS, {
      codOS,
      codOrc,
      placa: row.Placa,
      data: row.Data,
      situacao: row.Situacao,
      items: [],
      totalCalculado: 0
    });
  }
  const group = osMap.get(chaveOS);
  const qtd = Number(row.Qtd) || 1;
  const valor = Number(row.Valor) || 0;
  const total = Number(row.Total) || (qtd * valor);
  group.items.push({
    item: row.Item,
    servico: row.Servico,
    qtd,
    valor,
    total
  });
  group.totalCalculado += total;
});

console.log('\n=== AGRUPAMENTO DE ORÇAMENTOS / ORDENS DE SERVIÇO ===');
console.log(`Total de Ordens/Orçamentos agrupados únicos: ${osMap.size}`);
console.log('Distribuição de Situação nas linhas de Orçamento:', situacoesOrc);
console.log(`Linhas de orçamento com placa encontrada em Veículo: ${orcComPlacaNoVeiculo}`);
console.log(`Linhas de orçamento com placa NÃO encontrada em Veículo: ${orcSemPlacaNoVeiculo} (Placas únicas ausentes: ${placasAusentesNoVeiculo.size})`);

// Análise de Pagamentos
const pagPorOS = new Map();
let pagamentosComOS = 0;
let pagamentosSemOS = 0;

pagamentos.forEach(p => {
  const codOS = (p.CodOS || '').trim();
  if (codOS && osMap.has(codOS)) {
    pagamentosComOS++;
  } else {
    pagamentosSemOS++;
  }
});

console.log('\n=== VÍNCULO PAGAMENTOS -> OS ===');
console.log(`Pagamentos vinculados a uma OS existente: ${pagamentosComOS}`);
console.log(`Pagamentos sem OS correspondente: ${pagamentosSemOS}`);

// Amostra de grupos de OS
console.log('\n=== AMOSTRA DE OS AGRUPADA ===');
const sampleKeys = Array.from(osMap.keys()).slice(0, 3);
sampleKeys.forEach(k => {
  console.log(`Chave: ${k}`, JSON.stringify(osMap.get(k), null, 2));
});

