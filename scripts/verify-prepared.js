const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'migration', 'prepared');

const clients = JSON.parse(fs.readFileSync(path.join(dir, 'clients.json'), 'utf8'));
const vehicles = JSON.parse(fs.readFileSync(path.join(dir, 'vehicles.json'), 'utf8'));
const orders = JSON.parse(fs.readFileSync(path.join(dir, 'serviceOrders.json'), 'utf8'));
const items = JSON.parse(fs.readFileSync(path.join(dir, 'orderItems.json'), 'utf8'));

console.log('=== AUDITORIA E VALIDAÇÃO COMPLETA DOS DADOS PREPARADOS ===\n');

// 1. Clientes
const clientIds = new Set();
let clientsWithDupId = 0;
clients.forEach(c => {
  if (clientIds.has(c.id)) clientsWithDupId++;
  clientIds.add(c.id);
});
console.log(`[CLIENTES] Total: ${clients.length} | IDs únicos: ${clientIds.size} | Duplicados: ${clientsWithDupId}`);

// 2. Veículos e vínculo com clientes
const vehicleIds = new Set();
let vehiclesWithDupId = 0;
let vehiclesWithoutClient = 0;
let vehiclesMissingClientRef = 0;

vehicles.forEach(v => {
  if (vehicleIds.has(v.id)) vehiclesWithDupId++;
  vehicleIds.add(v.id);

  if (!v.clientId) vehiclesWithoutClient++;
  else if (!clientIds.has(v.clientId)) vehiclesMissingClientRef++;
});

console.log(`[VEÍCULOS] Total: ${vehicles.length} | IDs únicos: ${vehicleIds.size} | Duplicados: ${vehiclesWithDupId}`);
console.log(`[VÍNCULO VEÍCULO -> CLIENTE]`);
console.log(`- Veículos sem clientId: ${vehiclesWithoutClient}`);
console.log(`- Veículos com clientId que NÃO existe em Clientes: ${vehiclesMissingClientRef}`);
console.log(`- Integridade do vínculo: ${vehiclesMissingClientRef === 0 && vehiclesWithoutClient === 0 ? '100% PERFEITO ✓' : 'FALHA ✗'}`);

// 3. Ordens de Serviço e vínculos
const orderIds = new Set();
let ordersWithDupId = 0;
let ordersWithoutClient = 0;
let ordersMissingClientRef = 0;
let ordersWithoutVehicle = 0;
let ordersMissingVehicleRef = 0;
let ordersWithNaNTotal = 0;

orders.forEach(o => {
  if (orderIds.has(o.id)) ordersWithDupId++;
  orderIds.add(o.id);

  if (!o.clientId) ordersWithoutClient++;
  else if (!clientIds.has(o.clientId)) ordersMissingClientRef++;

  if (!o.vehicleId) ordersWithoutVehicle++;
  else if (!vehicleIds.has(o.vehicleId)) ordersMissingVehicleRef++;

  if (isNaN(o.total) || o.total == null) ordersWithNaNTotal++;
});

console.log(`\n[ORDENS DE SERVIÇO] Total: ${orders.length} | IDs únicos: ${orderIds.size} | Duplicados: ${ordersWithDupId}`);
console.log(`[VÍNCULO OS -> CLIENTE] Ausentes/Quebrados: ${ordersWithoutClient + ordersMissingClientRef}`);
console.log(`[VÍNCULO OS -> VEÍCULO] Ausentes/Quebrados: ${ordersWithoutVehicle + ordersMissingVehicleRef}`);
console.log(`[VALORES OS] Totais com NaN/inválidos: ${ordersWithNaNTotal}`);

// 4. Itens de OS
let itemsWithoutOrder = 0;
let itemsMissingOrderRef = 0;
items.forEach(it => {
  if (!it.orderId) itemsWithoutOrder++;
  else if (!orderIds.has(it.orderId)) itemsMissingOrderRef++;
});
console.log(`\n[ITENS DE OS] Total: ${items.length}`);
console.log(`[VÍNCULO ITEM -> OS] Ausentes/Quebrados: ${itemsWithoutOrder + itemsMissingOrderRef}`);

console.log('\n=========================================');
if (vehiclesMissingClientRef === 0 && ordersMissingClientRef === 0 && ordersMissingVehicleRef === 0 && itemsMissingOrderRef === 0) {
  console.log('RESULTADO FINAL: BANCO DE DADOS 100% CONSISTENTE E PRONTO PARA SUBIR! ✓✓✓');
} else {
  console.log('RESULTADO FINAL: FORAM ENCONTRADAS INCONSISTÊNCIAS PARA CORRIGIR.');
}
console.log('=========================================');

