import {
  collection, doc, getDoc, getDocs,
  addDoc as rawAddDoc, setDoc as rawSetDoc, updateDoc as rawUpdateDoc, deleteDoc as rawDeleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  writeBatch as rawWriteBatch, getCountFromServer, runTransaction
} from 'firebase/firestore';
import { db, COMPANY_ID } from './firebase';
import { uploadPhotoFile, uploadPhotoBase64 } from './storage';

// ═══ Offline-Resilient Helpers ═══

async function awaitWrite(promise) {
  if (import.meta.env.MODE === 'offline') {
    return await promise;
  }
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const timeoutMs = isOffline ? 150 : 3500;
  let timer;
  return await Promise.race([
    promise,
    new Promise(resolve => {
      timer = setTimeout(() => resolve({ offlineQueued: true }), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function addDoc(collectionRef, data) {
  if (import.meta.env.MODE === 'offline') {
    return await rawAddDoc(collectionRef, data);
  }
  const ref = doc(collectionRef);
  await awaitWrite(rawSetDoc(ref, data));
  return ref;
}

async function setDoc(reference, data, options) {
  if (import.meta.env.MODE === 'offline') {
    return await rawSetDoc(reference, data, options);
  }
  return await awaitWrite(options ? rawSetDoc(reference, data, options) : rawSetDoc(reference, data));
}

async function updateDoc(reference, data) {
  if (import.meta.env.MODE === 'offline') {
    return await rawUpdateDoc(reference, data);
  }
  return await awaitWrite(rawUpdateDoc(reference, data));
}

async function deleteDoc(reference) {
  if (import.meta.env.MODE === 'offline') {
    return await rawDeleteDoc(reference);
  }
  return await awaitWrite(rawDeleteDoc(reference));
}

function writeBatch(database) {
  const batch = rawWriteBatch(database);
  if (import.meta.env.MODE === 'offline') {
    return batch;
  }
  return {
    set: (...args) => batch.set(...args),
    update: (...args) => batch.update(...args),
    delete: (...args) => batch.delete(...args),
    commit: () => awaitWrite(batch.commit()),
  };
}

async function safeCount(collectionRef) {
  if (typeof navigator !== 'undefined' && !navigator.onLine && import.meta.env.MODE !== 'offline') {
    const snap = await getDocs(collectionRef);
    return snap.size ?? snap.docs.length;
  }
  try {
    const countSnap = await getCountFromServer(collectionRef);
    return countSnap.data().count;
  } catch {
    const snap = await getDocs(collectionRef);
    return snap.size ?? snap.docs.length;
  }
}

function col(path) {
  return collection(db, 'companies', COMPANY_ID, ...path.split('/'));
}

function docRef(path) {
  return doc(db, 'companies', COMPANY_ID, ...path.split('/'));
}

function clean(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result;
}

function toData(snap) {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) };
}

function snapToList(snap) {
  return snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
}

function mergeSnapshots(...snapshots) {
  const documents = new Map();
  snapshots.flatMap(snapToList).forEach(document => documents.set(document.id, document));
  return [...documents.values()];
}

function tsToISO(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  return ts;
}

function formatDoc(d) {
  if (!d) return null;
  const result = { ...d };
  for (const key of Object.keys(result)) {
    if (result[key] && result[key].toDate) {
      result[key] = result[key].toDate().toISOString();
    }
  }
  const aliases = {
    cpf_cnpj: 'cpfCnpj',
    zip_code: 'zipCode',
    client_id: 'clientId',
    vehicle_id: 'vehicleId',
    budget_id: 'budgetId',
    client_name: 'clientName',
    client_phone: 'clientPhone',
    client_cpf_cnpj: 'clientCpfCnpj',
    client_email: 'clientEmail',
    client_address: 'clientAddress',
    client_city: 'clientCity',
    client_state: 'clientState',
    make: 'vehicleMake',
    model: 'vehicleModel',
    plate: 'vehiclePlate',
    year: 'vehicleYear',
    steering_type: 'vehicleSteeringType',
    color: 'vehicleColor',
    chassis: 'vehicleChassis',
    unit_price: 'unitPrice',
    valid_until: 'validUntil',
    assigned_to: 'assignedTo',
    assigned_to_name: 'assignedToName',
    services_performed: 'servicesPerformed',
    parts_used: 'partsUsed',
    km_entry: 'kmEntry',
    km_exit: 'kmExit',
    estimated_completion: 'estimatedCompletion',
    created_by: 'createdBy',
    created_by_name: 'createdByName',
    approved_at: 'approvedAt',
    started_at: 'startedAt',
    completed_at: 'completedAt',
    delivered_at: 'deliveredAt',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  };
  for (const [snakeCase, camelCase] of Object.entries(aliases)) {
    if (result[snakeCase] === undefined && result[camelCase] !== undefined) {
      result[snakeCase] = result[camelCase];
    }
  }
  return result;
}

async function generateCode(prefix) {
  const year = new Date().getFullYear();
  const pref = `${prefix}-${year}-`;
  const q = query(col(prefix === 'ORC' ? 'budgets' : 'serviceOrders'), orderBy('code', 'desc'), limit(1));
  const snap = await getDocs(q);
  let seq = 1;
  if (!snap.empty) {
    const lastCode = snap.docs[0].data().code || '';
    if (lastCode.startsWith(pref)) {
      seq = parseInt(lastCode.replace(pref, ''), 10) + 1;
    }
  }
  return `${pref}${String(seq).padStart(4, '0')}`;
}

// ═══ CLIENTS ═══

export async function getClients({ search = '', page = 1, limitCount = 50 } = {}) {
  let q;
  if (search) {
    // Firestore não tem LIKE — buscar todos e filtrar client-side
    q = query(col('clients'), orderBy('name'));
    const snap = await getDocs(q);
    const all = snapToList(snap).map(formatDoc);
    const s = search.toLowerCase();
    const filtered = all.filter(c =>
      (c.name || '').toLowerCase().includes(s) ||
      (c.cpf_cnpj || c.cpfCnpj || '').includes(s) ||
      (c.phone || '').includes(s) ||
      (c.email || '').toLowerCase().includes(s)
    );
    const start = (page - 1) * limitCount;
    return {
      clients: filtered.slice(start, start + limitCount),
      total: filtered.length,
      page,
      pages: Math.ceil(filtered.length / limitCount)
    };
  }
  q = query(col('clients'), orderBy('name'), limit(limitCount));
  const total = await safeCount(col('clients'));
  const snap = await getDocs(q);
  return {
    clients: snapToList(snap).map(formatDoc),
    total,
    page: 1,
    pages: Math.ceil(total / limitCount)
  };
}

export async function getClientBasic(clientId) {
  const snap = await getDoc(docRef(`clients/${clientId}`));
  if (!snap.exists()) throw new Error('Cliente não encontrado');
  return formatDoc(toData(snap));
}

export async function getClient(clientId) {
  const client = await getClientBasic(clientId);
  client.vehicles = [];
  client.serviceOrders = [];
  client.budgets = [];

  // Carregar dados relacionados sem orderBy (sem exigir índices)
  try {
    const vSnap = await getDocs(query(col('vehicles'), where('clientId', '==', clientId)));
    const vehicles = snapToList(vSnap).map(formatDoc).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    client.vehicles = vehicles;
  } catch (e) { /* ok */ }

  try {
    const [legacySnap, currentSnap] = await Promise.all([
      getDocs(query(col('serviceOrders'), where('clientId', '==', clientId), limit(20))),
      getDocs(query(col('serviceOrders'), where('client_id', '==', clientId), limit(20))),
    ]);
    const serviceOrders = mergeSnapshots(legacySnap, currentSnap)
      .map(formatDoc)
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    client.serviceOrders = serviceOrders;
  } catch (e) { /* ok */ }

  try {
    const [legacySnap, currentSnap] = await Promise.all([
      getDocs(query(col('budgets'), where('clientId', '==', clientId), limit(20))),
      getDocs(query(col('budgets'), where('client_id', '==', clientId), limit(20))),
    ]);
    const budgets = mergeSnapshots(legacySnap, currentSnap)
      .map(formatDoc)
      .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    client.budgets = budgets;
  } catch (e) { /* ok */ }

  return client;
}

export async function createClient(data) {
  const docData = clean({
    name: data.name,
    type: data.type || 'pf',
    cpfCnpj: data.cpf_cnpj || data.cpfCnpj || '',
    phone: data.phone || '',
    phone2: data.phone2 || '',
    email: data.email || '',
    address: data.address || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || 'SP',
    zipCode: data.zip_code || data.zipCode || '',
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (!docData.name) throw new Error('Nome é obrigatório');
  const ref = await addDoc(col('clients'), docData);
  return { id: ref.id, message: 'Cliente criado com sucesso' };
}

export async function updateClient(clientId, data) {
  const ref = docRef(`clients/${clientId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Cliente não encontrado');
  const existing = snap.data();
  await updateDoc(ref, clean({
    name: data.name ?? existing.name,
    type: data.type ?? existing.type,
    cpfCnpj: data.cpf_cnpj ?? data.cpfCnpj ?? existing.cpfCnpj,
    phone: data.phone ?? existing.phone,
    phone2: data.phone2 ?? existing.phone2,
    email: data.email ?? existing.email,
    address: data.address ?? existing.address,
    neighborhood: data.neighborhood ?? existing.neighborhood,
    city: data.city ?? existing.city,
    state: data.state ?? existing.state,
    zipCode: data.zip_code ?? data.zipCode ?? existing.zipCode,
    notes: data.notes ?? existing.notes,
    updatedAt: serverTimestamp(),
  }));
  return { message: 'Cliente atualizado com sucesso' };
}

export async function deleteClient(clientId) {
  // Verificar se tem OS
  const [legacySnap, currentSnap] = await Promise.all([
    getDocs(query(col('serviceOrders'), where('clientId', '==', clientId), limit(1))),
    getDocs(query(col('serviceOrders'), where('client_id', '==', clientId), limit(1))),
  ]);
  if (!legacySnap.empty || !currentSnap.empty) throw new Error('Não é possível excluir: cliente possui ordens de serviço');
  await deleteDoc(docRef(`clients/${clientId}`));
  return { message: 'Cliente excluído com sucesso' };
}

// ═══ VEHICLES ═══

export async function getVehiclesByClient(clientId) {
  const snap = await getDocs(query(col('vehicles'), where('clientId', '==', clientId)));
  const vehicles = snapToList(snap).map(formatDoc);
  return vehicles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getVehicle(vehicleId) {
  const snap = await getDoc(docRef(`vehicles/${vehicleId}`));
  if (!snap.exists()) throw new Error('Veículo não encontrado');
  return formatDoc(toData(snap));
}

export async function createVehicle(data) {
  if (!data.client_id && !data.clientId) throw new Error('Cliente é obrigatório');
  if (!data.make) throw new Error('Marca é obrigatória');
  if (!data.model) throw new Error('Modelo é obrigatório');

  const clientId = data.client_id || data.clientId;
  // Denormalizar nome do cliente
  let clientName = '';
  try {
    const cSnap = await getDoc(docRef(`clients/${clientId}`));
    if (cSnap.exists()) clientName = cSnap.data().name || '';
  } catch (e) { /* ok */ }

  const ref = await addDoc(col('vehicles'), clean({
    clientId,
    clientName,
    plate: data.plate || '',
    make: data.make,
    model: data.model,
    year: data.year || '',
    color: data.color || '',
    steeringType: data.steering_type || data.steeringType || 'hidraulica',
    chassis: data.chassis || '',
    km: data.km || '',
    notes: data.notes || '',
    createdAt: serverTimestamp(),
  }));
  return { id: ref.id, message: 'Veículo cadastrado com sucesso' };
}

export async function updateVehicle(vehicleId, data) {
  const ref = docRef(`vehicles/${vehicleId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Veículo não encontrado');
  const e = snap.data();
  await updateDoc(ref, clean({
    plate: data.plate ?? e.plate,
    make: data.make ?? e.make,
    model: data.model ?? e.model,
    year: data.year ?? e.year,
    color: data.color ?? e.color,
    steeringType: data.steering_type ?? data.steeringType ?? e.steeringType,
    chassis: data.chassis ?? e.chassis,
    km: data.km ?? e.km,
    notes: data.notes ?? e.notes,
  }));
  return { message: 'Veículo atualizado com sucesso' };
}

export async function deleteVehicle(vehicleId) {
  const [legacySnap, currentSnap] = await Promise.all([
    getDocs(query(col('serviceOrders'), where('vehicleId', '==', vehicleId), limit(1))),
    getDocs(query(col('serviceOrders'), where('vehicle_id', '==', vehicleId), limit(1))),
  ]);
  if (!legacySnap.empty || !currentSnap.empty) throw new Error('Não é possível excluir: veículo possui ordens de serviço');
  await deleteDoc(docRef(`vehicles/${vehicleId}`));
  return { message: 'Veículo excluído com sucesso' };
}

// ═══ BUDGETS ═══

export async function getBudgets({ status, search = '', page = 1, limitCount = 50 } = {}) {
  // Sem orderBy quando há where (evita exigir índice)
  let constraints = [];
  if (status) constraints = [where('status', '==', status)];

  const q = query(col('budgets'), ...constraints);
  const snap = await getDocs(q);
  let list = snapToList(snap).map(formatDoc);

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(b =>
      (b.client_name || b.clientName || '').toLowerCase().includes(s) ||
      (b.code || '').toLowerCase().includes(s) ||
      (b.plate || b.vehiclePlate || '').toLowerCase().includes(s)
    );
  }

  // Ordenar em JavaScript
  list.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

  const total = list.length;
  const start = (page - 1) * limitCount;
  return {
    budgets: list.slice(start, start + limitCount),
    total,
    page,
    pages: Math.ceil(total / limitCount)
  };
}

export async function getBudget(budgetId) {
  const snap = await getDoc(docRef(`budgets/${budgetId}`));
  if (!snap.exists()) throw new Error('Orçamento não encontrado');
  const budget = formatDoc(toData(snap));

  budget.client_id = budget.client_id ?? budget.clientId;
  budget.vehicle_id = budget.vehicle_id ?? budget.vehicleId;
  budget.valid_until = budget.valid_until ?? budget.validUntil;
  budget.created_by_name = budget.created_by_name ?? budget.createdByName;
  budget.created_at = budget.created_at ?? budget.createdAt;
  budget.client_name = budget.client_name ?? budget.clientName;
  budget.client_phone = budget.client_phone ?? budget.clientPhone;
  budget.client_cpf_cnpj = budget.client_cpf_cnpj ?? budget.clientCpfCnpj;
  budget.client_address = budget.client_address ?? budget.clientAddress;
  budget.client_city = budget.client_city ?? budget.clientCity;
  budget.client_state = budget.client_state ?? budget.clientState;
  budget.make = budget.make ?? budget.vehicleMake;
  budget.model = budget.model ?? budget.vehicleModel;
  budget.plate = budget.plate ?? budget.vehiclePlate;
  budget.year = budget.year ?? budget.vehicleYear;
  budget.steering_type = budget.steering_type ?? budget.vehicleSteeringType;
  budget.color = budget.color ?? budget.vehicleColor;

  const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
  budget.items = snapToList(itemsSnap).map(item => formatDoc({
    ...item,
    unit_price: item.unit_price ?? item.unitPrice ?? 0,
  }));

  return budget;
}

export async function createBudget(data, userId, userName) {
  if (!data.client_id && !data.clientId) throw new Error('Cliente é obrigatório');
  if (!data.vehicle_id && !data.vehicleId) throw new Error('Veículo é obrigatório');
  if (!data.items || !data.items.length) throw new Error('Adicione pelo menos um item');

  const clientId = data.client_id || data.clientId;
  const vehicleId = data.vehicle_id || data.vehicleId;

  // Buscar dados para denormalizar
  const [cSnap, vSnap] = await Promise.all([
    getDoc(docRef(`clients/${clientId}`)),
    getDoc(docRef(`vehicles/${vehicleId}`))
  ]);
  const client = cSnap.exists() ? cSnap.data() : {};
  const vehicle = vSnap.exists() ? vSnap.data() : {};

  const items = data.items.map(i => ({
    description: i.description,
    type: i.type || 'servico',
    quantity: Number(i.quantity) || 1,
    unit_price: Number(i.unit_price ?? i.unitPrice) || 0,
    total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
  }));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const discount = Number(data.discount) || 0;
  const total = subtotal - discount;

  const code = await generateCode('ORC');

  const budgetData = {
    code,
    client_id: clientId,
    vehicle_id: vehicleId,
    status: 'pendente',
    subtotal,
    discount,
    total,
    notes: data.notes || '',
    valid_until: data.valid_until || data.validUntil || '',
    created_by: userId,
    created_by_name: userName || '',
    approved_at: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    // Denormalizados
    client_name: client.name || '',
    client_phone: client.phone || '',
    client_cpf_cnpj: client.cpfCnpj || '',
    client_address: client.address || '',
    client_city: client.city || '',
    client_state: client.state || '',
    make: vehicle.make || '',
    model: vehicle.model || '',
    plate: vehicle.plate || '',
    year: vehicle.year || '',
    steering_type: vehicle.steeringType || '',
    color: vehicle.color || '',
  };

  const budgetRef = await addDoc(col('budgets'), budgetData);

  // Itens em subcoleção
  const batch = writeBatch(db);
  for (const item of items) {
    const itemRef = doc(collection(db, 'companies', COMPANY_ID, 'budgets', budgetRef.id, 'items'));
    batch.set(itemRef, item);
  }
  await batch.commit();

  return { id: budgetRef.id, code, message: 'Orçamento criado com sucesso' };
}

export async function updateBudgetStatus(budgetId, status) {
  const validStatuses = ['pendente', 'aprovado', 'recusado', 'expirado'];
  if (!validStatuses.includes(status)) throw new Error('Status inválido');
  const ref = docRef(`budgets/${budgetId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Orçamento não encontrado');
  const updates = { status, updated_at: serverTimestamp() };
  if (status === 'aprovado') updates.approved_at = serverTimestamp();
  await updateDoc(ref, updates);
  return { message: 'Status atualizado com sucesso' };
}

export async function updateBudget(budgetId, data) {
  const ref = docRef(`budgets/${budgetId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Orçamento não encontrado');
  if (snap.data().status !== 'pendente') throw new Error('Apenas orçamentos pendentes podem ser editados');

  if (data.items && data.items.length) {
    // Deletar itens antigos
    const oldItems = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
    const batch = writeBatch(db);
    oldItems.docs.forEach(d => batch.delete(d.ref));

    const items = data.items.map(i => ({
      description: i.description,
      type: i.type || 'servico',
      quantity: Number(i.quantity) || 1,
      unit_price: Number(i.unit_price ?? i.unitPrice) || 0,
      total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
    }));
    for (const item of items) {
      const itemRef = doc(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
      batch.set(itemRef, item);
    }
    await batch.commit();

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const discount = Number(data.discount) || snap.data().discount || 0;
    await updateDoc(ref, {
      subtotal,
      discount,
      total: subtotal - discount,
      notes: data.notes ?? snap.data().notes,
      valid_until: data.valid_until ?? data.validUntil ?? snap.data().valid_until,
      updated_at: serverTimestamp(),
    });
  }
  return { message: 'Orçamento atualizado com sucesso' };
}

export async function deleteBudget(budgetId) {
  const [legacySnap, currentSnap] = await Promise.all([
    getDocs(query(col('serviceOrders'), where('budgetId', '==', budgetId), limit(1))),
    getDocs(query(col('serviceOrders'), where('budget_id', '==', budgetId), limit(1))),
  ]);
  if (!legacySnap.empty || !currentSnap.empty) throw new Error('Não é possível excluir: orçamento vinculado a uma OS');
  // Deletar itens + doc
  const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
  const batch = writeBatch(db);
  itemsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(docRef(`budgets/${budgetId}`));
  await batch.commit();
  return { message: 'Orçamento excluído com sucesso' };
}

// ═══ SERVICE ORDERS ═══

export async function getServiceOrders({ status, assignedTo, search = '', page = 1, limitCount = 50 } = {}) {
  // Sem orderBy quando há where (evita exigir índice)
  let constraints = [];
  if (status) constraints.push(where('status', '==', status));

  const q = query(col('serviceOrders'), ...constraints);
  const snap = await getDocs(q);
  let list = snapToList(snap).map(formatDoc);

  if (assignedTo) {
    list = list.filter(order => (order.assigned_to || order.assignedTo) === assignedTo);
  }

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(o =>
      (o.client_name || o.clientName || '').toLowerCase().includes(s) ||
      (o.code || '').toLowerCase().includes(s) ||
      (o.plate || o.vehiclePlate || '').toLowerCase().includes(s)
    );
  }

  // Ordenar em JavaScript por status priority depois data
  const STATUS_ORDER = { aberta: 0, em_andamento: 1, aguardando_peca: 2, concluida: 3, entregue: 4, cancelada: 5 };
  list.sort((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 99;
    const bOrder = STATUS_ORDER[b.status] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
  });

  const total = list.length;
  const start = (page - 1) * limitCount;
  return {
    orders: list.slice(start, start + limitCount),
    total,
    page,
    pages: Math.ceil(total / limitCount)
  };
}

export async function getServiceOrder(orderId) {
  const snap = await getDoc(docRef(`serviceOrders/${orderId}`));
  if (!snap.exists()) throw new Error('Ordem de serviço não encontrada');
  const order = formatDoc(toData(snap));

  const [itemsSnap, logsSnap, photosSnap] = await Promise.all([
    getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'items')),
    getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs')),
    getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos')),
  ]);

  order.items = snapToList(itemsSnap).map(formatDoc);
  const logs = snapToList(logsSnap).map(formatDoc);
  const photos = snapToList(photosSnap).map(formatDoc);

  // Ordenar em JavaScript (sem orderBy exigindo índice)
  order.logs = logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  order.photos = photos.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return order;
}

export function watchServiceOrderChildren(orderId, onChange) {
  if (import.meta.env.MODE === 'offline') return () => {};

  const unsubscribe = ['items', 'logs', 'photos'].map(name => {
    let initialSnapshot = true;
    const path = collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, name);
    return onSnapshot(path, () => {
      if (initialSnapshot) {
        initialSnapshot = false;
        return;
      }
      onChange();
    }, error => {
      console.error(`Falha na sincronizacao em tempo real da OS (${name}):`, error);
    });
  });

  return () => unsubscribe.forEach(stop => stop());
}

export async function createServiceOrder(data, userId, userName) {
  if (!data.client_id && !data.clientId) throw new Error('Cliente é obrigatório');
  if (!data.vehicle_id && !data.vehicleId) throw new Error('Veículo é obrigatório');

  const clientId = data.client_id || data.clientId;
  const vehicleId = data.vehicle_id || data.vehicleId;
  const budgetId = data.budget_id || data.budgetId || null;

  const [cSnap, vSnap] = await Promise.all([
    getDoc(docRef(`clients/${clientId}`)),
    getDoc(docRef(`vehicles/${vehicleId}`))
  ]);
  const client = cSnap.exists() ? cSnap.data() : {};
  const vehicle = vSnap.exists() ? vSnap.data() : {};

  // Itens: do request ou copiar do orçamento
  let items = [];
  let budgetCode = '';
  let budgetTotal = 0;

  if (budgetId) {
    const bSnap = await getDoc(docRef(`budgets/${budgetId}`));
    if (bSnap.exists()) {
      budgetCode = bSnap.data().code || '';
      budgetTotal = bSnap.data().total || 0;
      const bItems = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
      items = snapToList(bItems).map(i => ({
        description: i.description,
        type: i.type || 'servico',
        quantity: i.quantity || 1,
        unit_price: i.unit_price ?? i.unitPrice ?? 0,
        total: i.total || 0,
        status: 'pendente',
      }));
    }
  } else if (data.items && data.items.length) {
    items = data.items.map(i => ({
      description: i.description,
      type: i.type || 'servico',
      quantity: Number(i.quantity) || 1,
      unit_price: Number(i.unit_price ?? i.unitPrice) || 0,
      total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
      status: 'pendente',
    }));
  }

  let assignedToName = data.assigned_to_name || data.assignedToName || '';
  const assignedTo = data.assigned_to || data.assignedTo || assignedToName || null;
  if (assignedTo && import.meta.env.MODE === 'offline') {
    const uSnap = await getDoc(docRef(`users/${assignedTo}`));
    if (uSnap.exists()) assignedToName = uSnap.data().name || '';
  }

  const code = await generateCode('OS');

  const orderData = {
    code,
    budget_id: budgetId,
    client_id: clientId,
    vehicle_id: vehicleId,
    status: 'aberta',
    priority: data.priority || 'normal',
    assigned_to: assignedTo,
    diagnosis: data.diagnosis || '',
    services_performed: '',
    parts_used: '',
    notes: data.notes || '',
    km_entry: data.km_entry || data.kmEntry || '',
    km_exit: '',
    estimated_completion: data.estimated_completion || data.estimatedCompletion || '',
    started_at: null,
    completed_at: null,
    delivered_at: null,
    created_by: userId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    // Denormalizados
    client_name: client.name || '',
    client_phone: client.phone || '',
    client_cpf_cnpj: client.cpfCnpj || '',
    client_email: client.email || '',
    client_address: client.address || '',
    client_city: client.city || '',
    make: vehicle.make || '',
    model: vehicle.model || '',
    plate: vehicle.plate || '',
    year: vehicle.year || '',
    steering_type: vehicle.steeringType || '',
    color: vehicle.color || '',
    chassis: vehicle.chassis || '',
    assigned_to_name: assignedToName,
    created_by_name: userName || '',
    budget_code: budgetCode,
    budget_total: budgetTotal,
  };

  const orderRef = doc(col('serviceOrders'));
  const itemWrites = items.map(item => ({
    ref: doc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderRef.id, 'items')),
    data: item,
  }));
  const logRef = doc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderRef.id, 'logs'));
  const logData = {
    userId,
    userName: userName || '',
    action: 'criacao',
    description: 'Ordem de serviço criada',
    createdAt: serverTimestamp(),
  };

  if (budgetId) {
    const budgetRef = docRef(`budgets/${budgetId}`);
    const [legacyOrderSnap, currentOrderSnap] = await Promise.all([
      getDocs(query(col('serviceOrders'), where('budgetId', '==', budgetId), limit(1))),
      getDocs(query(col('serviceOrders'), where('budget_id', '==', budgetId), limit(1))),
    ]);
    if (!legacyOrderSnap.empty || !currentOrderSnap.empty) {
      throw new Error('Este orçamento já possui uma ordem de serviço');
    }

    const applyBudgetConversionBatch = async () => {
      const budgetSnap = await getDoc(budgetRef);
      if (!budgetSnap.exists()) throw new Error('Orçamento não encontrado');
      if (budgetSnap.data().service_order_id || budgetSnap.data().serviceOrderId) {
        throw new Error('Este orçamento já possui uma ordem de serviço');
      }
      const batch = writeBatch(db);
      batch.set(orderRef, orderData);
      itemWrites.forEach(item => batch.set(item.ref, item.data));
      batch.set(logRef, logData);
      batch.update(budgetRef, {
        status: 'aprovado',
        approved_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        service_order_id: orderRef.id,
      });
      await batch.commit();
    };

    if (import.meta.env.MODE !== 'offline' && typeof navigator !== 'undefined' && !navigator.onLine) {
      await applyBudgetConversionBatch();
    } else {
      try {
        await runTransaction(db, async transaction => {
          const budgetSnap = await transaction.get(budgetRef);
          if (!budgetSnap.exists()) throw new Error('Orçamento não encontrado');
          if (budgetSnap.data().service_order_id || budgetSnap.data().serviceOrderId) {
            throw new Error('Este orçamento já possui uma ordem de serviço');
          }

          transaction.set(orderRef, orderData);
          itemWrites.forEach(item => transaction.set(item.ref, item.data));
          transaction.set(logRef, logData);
          transaction.update(budgetRef, {
            status: 'aprovado',
            approved_at: serverTimestamp(),
            updated_at: serverTimestamp(),
            service_order_id: orderRef.id,
          });
        });
      } catch (err) {
        if (import.meta.env.MODE !== 'offline' && !String(err?.message || '').includes('já possui') && !String(err?.message || '').includes('não encontrado')) {
          await applyBudgetConversionBatch();
        } else {
          throw err;
        }
      }
    }
  } else {
    const batch = writeBatch(db);
    batch.set(orderRef, orderData);
    itemWrites.forEach(item => batch.set(item.ref, item.data));
    batch.set(logRef, logData);
    await batch.commit();
  }

  return { id: orderRef.id, code, message: 'Ordem de serviço criada com sucesso' };
}

export async function updateOrderStatus(orderId, statusData, userId, userName) {
  const { status, notes } = statusData;
  const validStatuses = ['aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'entregue', 'cancelada'];
  if (!validStatuses.includes(status)) throw new Error('Status inválido');

  const ref = docRef(`serviceOrders/${orderId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('OS não encontrada');

  const updates = { status, updated_at: serverTimestamp() };
  const now = serverTimestamp();
  if (status === 'em_andamento' && !(snap.data().started_at || snap.data().startedAt)) updates.started_at = now;
  if (status === 'concluida' && !(snap.data().completed_at || snap.data().completedAt)) updates.completed_at = now;
  if (status === 'entregue' && !(snap.data().delivered_at || snap.data().deliveredAt)) updates.delivered_at = now;

  await updateDoc(ref, updates);

  // Log
  const statusLabels = { aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguardando Peça', concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada' };
  const desc = `Status alterado para: ${statusLabels[status] || status}${notes ? ` - ${notes}` : ''}`;
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId, userName: userName || '', action: 'status', description: desc, createdAt: serverTimestamp(),
  });

  return { message: 'Status atualizado com sucesso' };
}

export async function updateServiceOrder(orderId, data, userId, userName) {
  const ref = docRef(`serviceOrders/${orderId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('OS não encontrada');
  const e = snap.data();

  let assignedToName = import.meta.env.MODE === 'offline'
    ? e.assigned_to_name ?? e.assignedToName ?? ''
    : data.assigned_to_name ?? data.assignedToName ?? e.assigned_to_name ?? e.assignedToName ?? '';
  let assignedTo = data.assigned_to ?? data.assignedTo ?? e.assigned_to ?? e.assignedTo ?? null;
  if (import.meta.env.MODE !== 'offline' && data.assigned_to_name !== undefined) {
    assignedTo = assignedToName || null;
  }
  if (assignedTo && assignedTo !== (e.assigned_to ?? e.assignedTo) && import.meta.env.MODE === 'offline') {
    const uSnap = await getDoc(docRef(`users/${assignedTo}`));
    if (uSnap.exists()) assignedToName = uSnap.data().name || '';
  }

  await updateDoc(ref, clean({
    assigned_to: assignedTo,
    assigned_to_name: assignedToName,
    diagnosis: data.diagnosis ?? e.diagnosis,
    services_performed: data.services_performed ?? data.servicesPerformed ?? e.services_performed ?? e.servicesPerformed,
    parts_used: data.parts_used ?? data.partsUsed ?? e.parts_used ?? e.partsUsed,
    notes: data.notes ?? e.notes,
    km_exit: data.km_exit ?? data.kmExit ?? e.km_exit ?? e.kmExit,
    estimated_completion: data.estimated_completion ?? data.estimatedCompletion ?? e.estimated_completion ?? e.estimatedCompletion,
    priority: data.priority ?? e.priority,
    updated_at: serverTimestamp(),
  }));

  // Substituir itens se fornecidos
  if (data.items && data.items.length) {
    const oldItems = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'items'));
    const batch = writeBatch(db);
    oldItems.docs.forEach(d => batch.delete(d.ref));
    for (const i of data.items) {
      const itemRef = doc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'items'));
      batch.set(itemRef, {
        description: i.description,
        type: i.type || 'servico',
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.unit_price ?? i.unitPrice) || 0,
        total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
        status: i.status || 'pendente',
      });
    }
    await batch.commit();
  }

  // Log
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId, userName: userName || '', action: 'atualizacao', description: 'Ordem de serviço atualizada', createdAt: serverTimestamp(),
  });

  return { message: 'OS atualizada com sucesso' };
}

export async function addOrderLog(orderId, logData, userId, userName) {
  if (!logData.description) throw new Error('Descrição é obrigatória');
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId,
    userName: userName || '',
    action: logData.action || 'observacao',
    description: logData.description,
    createdAt: serverTimestamp(),
  });
  return { message: 'Observação adicionada' };
}

// ═══ PHOTOS ═══

export async function getPhotos(orderId) {
  const snap = await getDocs(query(
    collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos'),
    orderBy('createdAt', 'asc')
  ));
  return snapToList(snap).map(formatDoc);
}

export async function uploadPhotos(orderId, files, { label, phase }, userId, userName) {
  const orderSnap = await getDoc(docRef(`serviceOrders/${orderId}`));
  if (!orderSnap.exists()) throw new Error('OS não encontrada');

  const results = [];
  for (const file of files) {
    const { storagePath, downloadUrl, filename } = await uploadPhotoFile(COMPANY_ID, orderId, file);
    const photoRef = await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos'), {
      filename,
      originalName: file.name || filename,
      storagePath,
      downloadUrl,
      label: label || 'Foto do veículo',
      phase: phase || 'entrada',
      uploadedBy: userId,
      uploadedByName: userName || '',
      createdAt: serverTimestamp(),
    });
    results.push({ id: photoRef.id, filename });
  }

  // Log
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId, userName: userName || '', action: 'foto',
    description: `${results.length} foto(s) adicionada(s) - ${phase || 'entrada'}`,
    createdAt: serverTimestamp(),
  });

  return { message: `${results.length} foto(s) enviada(s)`, photos: results };
}

export async function uploadCapturedPhoto(orderId, base64Image, { label, phase }, userId, userName) {
  const orderSnap = await getDoc(docRef(`serviceOrders/${orderId}`));
  if (!orderSnap.exists()) throw new Error('OS não encontrada');

  const { storagePath, downloadUrl, filename } = await uploadPhotoBase64(COMPANY_ID, orderId, base64Image);
  const photoRef = await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos'), {
    filename,
    originalName: filename,
    storagePath,
    downloadUrl,
    label: label || 'Foto do veículo',
    phase: phase || 'entrada',
    uploadedBy: userId,
    uploadedByName: userName || '',
    createdAt: serverTimestamp(),
  });

  // Log
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId, userName: userName || '', action: 'foto',
    description: `1 foto adicionada - ${phase || 'entrada'}`,
    createdAt: serverTimestamp(),
  });

  return { id: photoRef.id, filename };
}

// ── Funções de foto local (sem Storage) ──
export async function addPhotoDoc(orderId, data) {
  const ref = await addDoc(
    collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos'),
    { ...data, createdAt: serverTimestamp() }
  );
  return { id: ref.id };
}

export async function deletePhotoDoc(orderId, photoId) {
  await deleteDoc(doc(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos', photoId));
  return { message: 'Foto removida' };
}

// ═══ REPORTS ═══

export async function getDashboard() {
  const [osSnap, budgetSnap, totalClients] = await Promise.all([
    getDocs(col('serviceOrders')),
    getDocs(col('budgets')),
    safeCount(col('clients')),
  ]);

  const allOS = snapToList(osSnap).map(formatDoc);
  const allBudgets = snapToList(budgetSnap).map(formatDoc);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const osAberta = allOS.filter(o => ['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status)).length;
  const osConcluida = allOS.filter(o => o.status === 'concluida').length;
  const osEntregue = allOS.filter(o => o.status === 'entregue' && (o.delivered_at || o.deliveredAt) >= thirtyDaysAgo).length;
  const orcPendente = allBudgets.filter(b => b.status === 'pendente').length;

  // Receita dos últimos 30 dias (somar itens de OS concluídas/entregues)
  const recentCompletedIds = allOS
    .filter(o => ['concluida', 'entregue'].includes(o.status) && (o.completed_at || o.completedAt) >= thirtyDaysAgo)
    .map(o => o.id);

  let revenue = 0;
  for (const osId of recentCompletedIds.slice(0, 20)) {
    const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', osId, 'items'));
    revenue += snapToList(itemsSnap).reduce((sum, i) => sum + (i.total || 0), 0);
  }

  // Recentes
  const recentOrders = allOS.sort((a, b) => (b.created_at || b.createdAt || '').localeCompare(a.created_at || a.createdAt || '')).slice(0, 10);
  const recentBudgets = allBudgets.sort((a, b) => (b.created_at || b.createdAt || '').localeCompare(a.created_at || a.createdAt || '')).slice(0, 10);

  return {
    osAberta, osConcluida, osEntregue, orcPendente,
    totalClients,
    revenue,
    recentOrders,
    recentBudgets,
  };
}

export async function getMonthlyReport(month, year) {
  const isFullYear = !month || Number(month) === 0;
  const startDate = isFullYear ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
  const endDate = isFullYear ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [osSnap, budgetsSnap] = await Promise.all([
    getDocs(col('serviceOrders')),
    getDocs(col('budgets')),
  ]);

  const allYearOrders = snapToList(osSnap)
    .map(formatDoc)
    .filter(order => {
      const createdAt = new Date(order.created_at || order.createdAt);
      return createdAt >= yearStart && createdAt < yearEnd;
    });

  // Carregar itens de todas as OS do ano em paralelo para montar evolução anual e totais por OS
  await Promise.all(
    allYearOrders.map(async (order) => {
      const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', order.id, 'items'));
      const items = snapToList(itemsSnap).map(formatDoc);
      const serviceTotal = items
        .filter(i => i.type !== 'peca')
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      const partsTotal = items
        .filter(i => i.type === 'peca')
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);
      order.items = items;
      order.service_total = serviceTotal;
      order.parts_total = partsTotal;
      order.total = serviceTotal + partsTotal;
      order.assigned_name = order.assigned_to_name || order.assignedToName || order.assigned_name || '';
    })
  );

  // Evolução mês a mês do ano selecionado (1 a 12)
  const yearlyBreakdown = Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1;
    const mStart = new Date(year, idx, 1);
    const mEnd = new Date(year, idx + 1, 1);
    const mOrders = allYearOrders.filter(o => {
      const d = new Date(o.created_at || o.createdAt);
      return d >= mStart && d < mEnd;
    });
    const mCompleted = mOrders.filter(o => ['concluida', 'entregue'].includes(o.status));
    const mInProgress = mOrders.filter(o => ['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status));
    return {
      month: m,
      osCount: mOrders.length,
      completedCount: mCompleted.length,
      revenue: mCompleted.reduce((sum, o) => sum + (o.total || 0), 0),
      inProgressRevenue: mInProgress.reduce((sum, o) => sum + (o.total || 0), 0),
    };
  });

  const orders = allYearOrders
    .filter(order => {
      const createdAt = new Date(order.created_at || order.createdAt);
      return createdAt >= startDate && createdAt < endDate;
    })
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

  const totalOS = orders.length;
  const entregues = orders.filter(o => o.status === 'entregue').length;
  const concluidas = orders.filter(o => o.status === 'concluida').length;
  const emAndamento = orders.filter(o => ['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status)).length;
  const canceladas = orders.filter(o => o.status === 'cancelada').length;

  const completedOrders = orders.filter(o => ['concluida', 'entregue'].includes(o.status));
  const inProgressOrders = orders.filter(o => ['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status));
  const canceledOrders = orders.filter(o => o.status === 'cancelada');

  const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const deliveredRevenue = orders
    .filter(o => o.status === 'entregue')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const awaitingPickupRevenue = orders
    .filter(o => o.status === 'concluida')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const inProgressRevenue = inProgressOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const canceledRevenue = canceledOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const servicesRevenue = completedOrders.reduce((sum, o) => sum + (o.service_total || 0), 0);
  const partsRevenue = completedOrders.reduce((sum, o) => sum + (o.parts_total || 0), 0);
  const averageTicket = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

  // Orçamentos do período
  const budgets = snapToList(budgetsSnap)
    .map(formatDoc)
    .filter(b => {
      const createdAt = new Date(b.created_at || b.createdAt);
      return createdAt >= startDate && createdAt < endDate;
    })
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

  const approvedBudgets = budgets.filter(b => b.status === 'aprovado');
  const pendingBudgets = budgets.filter(b => b.status === 'pendente');
  const rejectedBudgets = budgets.filter(b => ['recusado', 'expirado'].includes(b.status));

  const budgetsSummary = {
    total_count: budgets.length,
    approved_count: approvedBudgets.length,
    pending_count: pendingBudgets.length,
    rejected_count: rejectedBudgets.length,
    approved_total: approvedBudgets.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    pending_total: pendingBudgets.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    rejected_total: rejectedBudgets.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    discount_total: budgets.reduce((sum, b) => sum + (Number(b.discount) || 0), 0),
    conversion_rate: budgets.length > 0 ? Math.round((approvedBudgets.length / budgets.length) * 100) : 0,
  };

  // Top serviços e peças do período
  const serviceCounts = {};
  for (const order of orders.filter(o => o.status !== 'cancelada')) {
    for (const item of order.items || []) {
      const key = item.description || 'Item sem descrição';
      if (!serviceCounts[key]) {
        serviceCounts[key] = { description: key, type: item.type || 'servico', count: 0, revenue: 0 };
      }
      serviceCounts[key].count += Number(item.quantity) || 1;
      serviceCounts[key].revenue += Number(item.total) || 0;
    }
  }
  const topServices = Object.values(serviceCounts).sort((a, b) => b.revenue - a.revenue).slice(0, 25);

  // Produtividade e receita por responsável/técnico no período
  const techCounts = {};
  for (const o of orders.filter(ord => ord.status !== 'cancelada')) {
    const name = (o.assigned_to_name || o.assignedToName || o.assigned_name || '').trim() || 'Não atribuído';
    if (!techCounts[name]) {
      techCounts[name] = { name, total_os: 0, concluidas: 0, entregues: 0, revenue: 0 };
    }
    techCounts[name].total_os++;
    if (['concluida', 'entregue'].includes(o.status)) {
      techCounts[name].concluidas++;
      techCounts[name].revenue += o.total || 0;
    }
    if (o.status === 'entregue') {
      techCounts[name].entregues++;
    }
  }
  const byTechnician = Object.values(techCounts).sort((a, b) => b.revenue - a.revenue);

  // Por tipo de direção (com receita)
  const steeringCounts = {};
  orders.forEach(o => {
    const st = o.steering_type || o.vehicleSteeringType || 'outro';
    if (!steeringCounts[st]) steeringCounts[st] = { steering_type: st, count: 0, revenue: 0 };
    steeringCounts[st].count += 1;
    if (['concluida', 'entregue'].includes(o.status)) {
      steeringCounts[st].revenue += o.total || 0;
    }
  });
  const bySteeringType = Object.values(steeringCounts).sort((a, b) => b.revenue - a.revenue);

  return {
    orders,
    budgets,
    totals: {
      total_os: totalOS,
      entregues,
      concluidas,
      em_andamento: emAndamento,
      canceladas,
    },
    revenue,
    deliveredRevenue,
    awaitingPickupRevenue,
    inProgressRevenue,
    canceledRevenue,
    servicesRevenue,
    partsRevenue,
    averageTicket,
    budgetsSummary,
    yearlyBreakdown,
    topServices,
    byTechnician,
    bySteeringType,
    month,
    year,
  };
}

export async function getClientHistory(clientId) {
  const client = await getClient(clientId);

  // Itens de cada OS
  for (const order of client.serviceOrders) {
    const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', order.id, 'items'));
    order.items = snapToList(itemsSnap).map(formatDoc);
  }

  // Valor total gasto
  let totalSpent = 0;
  for (const order of client.serviceOrders.filter(o => ['concluida', 'entregue'].includes(o.status))) {
    totalSpent += (order.items || []).reduce((sum, i) => sum + (i.total || 0), 0);
  }

  return { ...client, totalSpent };
}

export async function getServicesReport(startDate, endDate) {
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  const osSnap = await getDocs(col('serviceOrders'));
  const orders = snapToList(osSnap).map(formatDoc).filter(order => {
    const createdAt = new Date(order.created_at || order.createdAt);
    return createdAt >= rangeStart && createdAt <= rangeEnd;
  });

  // Top serviços
  const serviceCounts = {};
  for (const order of orders) {
    const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', order.id, 'items'));
    for (const item of snapToList(itemsSnap)) {
      const key = item.description;
      if (!serviceCounts[key]) serviceCounts[key] = { description: key, type: item.type, count: 0, revenue: 0 };
      serviceCounts[key].count++;
      serviceCounts[key].revenue += item.total || 0;
    }
  }
  const topServices = Object.values(serviceCounts).sort((a, b) => b.count - a.count).slice(0, 20);

  // Por técnico
  const techCounts = {};
  orders.filter(o => o.assigned_to || o.assignedTo).forEach(o => {
    const name = o.assigned_to_name || o.assignedToName || 'Sem nome';
    if (!techCounts[name]) techCounts[name] = { name, total_os: 0, entregues: 0 };
    techCounts[name].total_os++;
    if (o.status === 'entregue') techCounts[name].entregues++;
  });
  const byTechnician = Object.values(techCounts).sort((a, b) => b.total_os - a.total_os);

  return { topServices, byTechnician };
}

// ═══ SETTINGS ═══

export async function getSettings() {
  const snap = await getDoc(doc(db, 'companies', COMPANY_ID));
  if (!snap.exists()) return { name: 'Moreira Direções', cnpj: '', ie: '', phone: '', email: '', address: '', neighborhood: '', city: '', state: 'SP', zip_code: '' };
  const data = snap.data();
  // Retornar no formato compatível com o frontend existente
  return {
    name: data.name || 'Moreira Direções',
    cnpj: data.cnpj || '',
    ie: data.ie || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || 'SP',
    zip_code: data.zipCode || data.zip_code || '',
  };
}

export async function updateSettings(data) {
  const ref = doc(db, 'companies', COMPANY_ID);
  await setDoc(ref, {
    name: data.name || 'Moreira Direções',
    cnpj: data.cnpj || '',
    ie: data.ie || '',
    phone: data.phone || '',
    email: data.email || '',
    address: data.address || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || 'SP',
    zipCode: data.zip_code || data.zipCode || '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { message: 'Configurações salvas com sucesso' };
}

// ═══ USERS ═══

export async function getUsers() {
  const snap = await getDocs(query(col('users'), orderBy('name')));
  return snapToList(snap).map(formatDoc);
}

export async function getUser(userId) {
  const snap = await getDoc(docRef(`users/${userId}`));
  if (!snap.exists()) throw new Error('Usuário não encontrado');
  return formatDoc(toData(snap));
}

export async function createUserDoc(userId, data) {
  const ref = doc(db, 'companies', COMPANY_ID, 'users', userId);
  await setDoc(ref, {
    username: data.username || data.email || '',
    name: data.name || '',
    role: ['admin', 'gerente', 'tecnico', 'atendente'].includes(data.role) ? data.role : 'tecnico',
    active: data.active !== undefined ? data.active : 1,
    createdAt: serverTimestamp(),
  });
  return { id: userId, username: data.username || data.email, name: data.name, role: data.role || 'tecnico' };
}

export async function updateUser(userId, data) {
  const ref = docRef(`users/${userId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Usuário não encontrado');
  const e = snap.data();
  await updateDoc(ref, clean({
    name: data.name ?? e.name,
    role: data.role ?? e.role,
    active: data.active !== undefined ? data.active : e.active,
  }));
  return { message: 'Usuário atualizado com sucesso' };
}

// ═══ INVOICES ═══

export async function getInvoices() {
  const snap = await getDocs(query(col('invoices'), orderBy('createdAt', 'desc')));
  return snapToList(snap).map(formatDoc);
}

export async function getInvoice(invoiceId) {
  const snap = await getDoc(docRef(`invoices/${invoiceId}`));
  if (!snap.exists()) throw new Error('Nota fiscal não encontrada');
  return formatDoc(toData(snap));
}

export async function createInvoice(data) {
  if (!data.service_order_id && !data.serviceOrderId) throw new Error('OS é obrigatória');
  const osId = data.service_order_id || data.serviceOrderId;

  const osSnap = await getDoc(docRef(`serviceOrders/${osId}`));
  if (!osSnap.exists()) throw new Error('OS não encontrada');
  const os = osSnap.data();

  // Somar itens
  const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', osId, 'items'));
  const total = snapToList(itemsSnap).reduce((sum, i) => sum + (i.total || 0), 0);

  // Próximo número
  const lastInv = await getDocs(query(col('invoices'), orderBy('invoiceNumber', 'desc'), limit(1)));
  let nextNum = '000001';
  if (!lastInv.empty) {
    const last = lastInv.docs[0].data().invoiceNumber || '000000';
    nextNum = String(parseInt(last, 10) + 1).padStart(6, '0');
  }

  const ref = await addDoc(col('invoices'), {
    serviceOrderId: osId,
    invoiceNumber: nextNum,
    series: '1',
    status: 'pendente',
    total,
    clientName: os.clientName || '',
    clientCpfCnpj: os.clientCpfCnpj || '',
    description: data.description || 'Serviços de manutenção de direção veicular',
    issuedAt: null,
    cancelledAt: null,
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    osCode: os.code || '',
  });

  return { id: ref.id, invoice_number: nextNum, message: 'Nota fiscal criada. Para emissão oficial (NF-e), integre com um serviço homologado pela SEFAZ.' };
}

export async function updateInvoiceStatus(invoiceId, status) {
  const validStatuses = ['pendente', 'emitida', 'cancelada'];
  if (!validStatuses.includes(status)) throw new Error('Status inválido');
  const ref = docRef(`invoices/${invoiceId}`);
  const updates = { status };
  if (status === 'emitida') updates.issuedAt = serverTimestamp();
  if (status === 'cancelada') updates.cancelledAt = serverTimestamp();
  await updateDoc(ref, updates);
  return { message: 'Status atualizado com sucesso' };
}
