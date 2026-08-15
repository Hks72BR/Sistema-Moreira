import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  writeBatch, getCountFromServer, Timestamp
} from 'firebase/firestore';
import { db, COMPANY_ID } from './firebase';
import { uploadPhotoFile, uploadPhotoBase64, deletePhotoFromStorage } from './storage';

// ═══ Helpers ═══

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
  return { id: snap.id, ...snap.data() };
}

function snapToList(snap) {
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      (c.cpfCnpj || '').includes(s) ||
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
  const countSnap = await getCountFromServer(col('clients'));
  const total = countSnap.data().count;
  const snap = await getDocs(q);
  return {
    clients: snapToList(snap).map(formatDoc),
    total,
    page: 1,
    pages: Math.ceil(total / limitCount)
  };
}

export async function getClient(clientId) {
  const snap = await getDoc(docRef(`clients/${clientId}`));
  if (!snap.exists()) throw new Error('Cliente não encontrado');
  const client = formatDoc(toData(snap));

  // Veículos
  const vSnap = await getDocs(query(col('vehicles'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
  const vehicles = snapToList(vSnap).map(formatDoc);

  // OS recentes
  const osSnap = await getDocs(query(col('serviceOrders'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'), limit(20)));
  const serviceOrders = snapToList(osSnap).map(formatDoc);

  // Orçamentos recentes
  const bSnap = await getDocs(query(col('budgets'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'), limit(20)));
  const budgets = snapToList(bSnap).map(formatDoc);

  return { ...client, vehicles, serviceOrders, budgets };
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
  const osSnap = await getDocs(query(col('serviceOrders'), where('clientId', '==', clientId), limit(1)));
  if (!osSnap.empty) throw new Error('Não é possível excluir: cliente possui ordens de serviço');
  await deleteDoc(docRef(`clients/${clientId}`));
  return { message: 'Cliente excluído com sucesso' };
}

// ═══ VEHICLES ═══

export async function getVehiclesByClient(clientId) {
  const snap = await getDocs(query(col('vehicles'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')));
  return snapToList(snap).map(formatDoc);
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
  const osSnap = await getDocs(query(col('serviceOrders'), where('vehicleId', '==', vehicleId), limit(1)));
  if (!osSnap.empty) throw new Error('Não é possível excluir: veículo possui ordens de serviço');
  await deleteDoc(docRef(`vehicles/${vehicleId}`));
  return { message: 'Veículo excluído com sucesso' };
}

// ═══ BUDGETS ═══

export async function getBudgets({ status, search = '', page = 1, limitCount = 50 } = {}) {
  let constraints = [orderBy('createdAt', 'desc')];
  if (status) constraints = [where('status', '==', status), ...constraints];

  const q = query(col('budgets'), ...constraints);
  const snap = await getDocs(q);
  let list = snapToList(snap).map(formatDoc);

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(b =>
      (b.clientName || '').toLowerCase().includes(s) ||
      (b.code || '').toLowerCase().includes(s) ||
      (b.vehiclePlate || '').toLowerCase().includes(s)
    );
  }

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

  const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
  budget.items = snapToList(itemsSnap).map(formatDoc);

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
    unitPrice: Number(i.unit_price ?? i.unitPrice) || 0,
    total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
  }));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const discount = Number(data.discount) || 0;
  const total = subtotal - discount;

  const code = await generateCode('ORC');

  const budgetData = {
    code,
    clientId,
    vehicleId,
    status: 'pendente',
    subtotal,
    discount,
    total,
    notes: data.notes || '',
    validUntil: data.valid_until || data.validUntil || '',
    createdBy: userId,
    createdByName: userName || '',
    approvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Denormalizados
    clientName: client.name || '',
    clientPhone: client.phone || '',
    clientCpfCnpj: client.cpfCnpj || '',
    clientAddress: client.address || '',
    clientCity: client.city || '',
    clientState: client.state || '',
    vehicleMake: vehicle.make || '',
    vehicleModel: vehicle.model || '',
    vehiclePlate: vehicle.plate || '',
    vehicleYear: vehicle.year || '',
    vehicleSteeringType: vehicle.steeringType || '',
    vehicleColor: vehicle.color || '',
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
  const updates = { status, updatedAt: serverTimestamp() };
  if (status === 'aprovado') updates.approvedAt = serverTimestamp();
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
      unitPrice: Number(i.unit_price ?? i.unitPrice) || 0,
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
      validUntil: data.valid_until ?? data.validUntil ?? snap.data().validUntil,
      updatedAt: serverTimestamp(),
    });
  }
  return { message: 'Orçamento atualizado com sucesso' };
}

export async function deleteBudget(budgetId) {
  const osSnap = await getDocs(query(col('serviceOrders'), where('budgetId', '==', budgetId), limit(1)));
  if (!osSnap.empty) throw new Error('Não é possível excluir: orçamento vinculado a uma OS');
  // Deletar itens + doc
  const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'budgets', budgetId, 'items'));
  const batch = writeBatch(db);
  itemsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(docRef(`budgets/${budgetId}`));
  await batch.commit();
  return { message: 'Orçamento excluído com sucesso' };
}

// ═══ SERVICE ORDERS ═══

const STATUS_ORDER = { em_andamento: 1, aberta: 2, aguardando_peca: 3, concluida: 4, entregue: 5, cancelada: 6 };

export async function getServiceOrders({ status, assignedTo, search = '', page = 1, limitCount = 50 } = {}) {
  let constraints = [orderBy('createdAt', 'desc')];
  if (status) constraints = [where('status', '==', status), ...constraints];
  if (assignedTo) constraints = [where('assignedTo', '==', assignedTo), ...constraints];

  const q = query(col('serviceOrders'), ...constraints);
  const snap = await getDocs(q);
  let list = snapToList(snap).map(formatDoc);

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(o =>
      (o.clientName || '').toLowerCase().includes(s) ||
      (o.code || '').toLowerCase().includes(s) ||
      (o.vehiclePlate || '').toLowerCase().includes(s)
    );
  }

  // Ordenar por prioridade de status
  list.sort((a, b) => (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99));

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
    getDocs(query(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos'), orderBy('createdAt', 'asc'))),
  ]);

  order.items = snapToList(itemsSnap).map(formatDoc);
  order.logs = snapToList(logsSnap).map(formatDoc);
  order.photos = snapToList(photosSnap).map(formatDoc);

  return order;
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
        unitPrice: i.unitPrice || 0,
        total: i.total || 0,
        status: 'pendente',
      }));
      // Marcar orçamento como aprovado
      await updateDoc(docRef(`budgets/${budgetId}`), { status: 'aprovado', approvedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  } else if (data.items && data.items.length) {
    items = data.items.map(i => ({
      description: i.description,
      type: i.type || 'servico',
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unit_price ?? i.unitPrice) || 0,
      total: (Number(i.quantity) || 1) * (Number(i.unit_price ?? i.unitPrice) || 0),
      status: 'pendente',
    }));
  }

  // Buscar nome do técnico se atribuído
  let assignedToName = '';
  const assignedTo = data.assigned_to || data.assignedTo || null;
  if (assignedTo) {
    const uSnap = await getDoc(docRef(`users/${assignedTo}`));
    if (uSnap.exists()) assignedToName = uSnap.data().name || '';
  }

  const code = await generateCode('OS');

  const orderData = {
    code,
    budgetId,
    clientId,
    vehicleId,
    status: 'aberta',
    priority: data.priority || 'normal',
    assignedTo,
    diagnosis: data.diagnosis || '',
    servicesPerformed: '',
    partsUsed: '',
    notes: data.notes || '',
    kmEntry: data.km_entry || data.kmEntry || '',
    kmExit: '',
    estimatedCompletion: data.estimated_completion || data.estimatedCompletion || '',
    startedAt: null,
    completedAt: null,
    deliveredAt: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Denormalizados
    clientName: client.name || '',
    clientPhone: client.phone || '',
    clientCpfCnpj: client.cpfCnpj || '',
    clientEmail: client.email || '',
    clientAddress: client.address || '',
    clientCity: client.city || '',
    vehicleMake: vehicle.make || '',
    vehicleModel: vehicle.model || '',
    vehiclePlate: vehicle.plate || '',
    vehicleYear: vehicle.year || '',
    vehicleSteeringType: vehicle.steeringType || '',
    vehicleColor: vehicle.color || '',
    vehicleChassis: vehicle.chassis || '',
    assignedToName,
    createdByName: userName || '',
    budgetCode,
    budgetTotal,
  };

  const orderRef = await addDoc(col('serviceOrders'), orderData);

  const batch = writeBatch(db);
  // Itens
  for (const item of items) {
    const itemRef = doc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderRef.id, 'items'));
    batch.set(itemRef, item);
  }
  // Log de criação
  const logRef = doc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderRef.id, 'logs'));
  batch.set(logRef, {
    userId,
    userName: userName || '',
    action: 'criacao',
    description: 'Ordem de serviço criada',
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  return { id: orderRef.id, code, message: 'Ordem de serviço criada com sucesso' };
}

export async function updateOrderStatus(orderId, statusData, userId, userName) {
  const { status, notes } = statusData;
  const validStatuses = ['aberta', 'em_andamento', 'aguardando_peca', 'concluida', 'entregue', 'cancelada'];
  if (!validStatuses.includes(status)) throw new Error('Status inválido');

  const ref = docRef(`serviceOrders/${orderId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('OS não encontrada');

  const updates = { status, updatedAt: serverTimestamp() };
  const now = serverTimestamp();
  if (status === 'em_andamento' && !snap.data().startedAt) updates.startedAt = now;
  if (status === 'concluida' && !snap.data().completedAt) updates.completedAt = now;
  if (status === 'entregue' && !snap.data().deliveredAt) updates.deliveredAt = now;

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

  let assignedToName = e.assignedToName;
  const assignedTo = data.assigned_to ?? data.assignedTo ?? e.assignedTo;
  if (assignedTo && assignedTo !== e.assignedTo) {
    const uSnap = await getDoc(docRef(`users/${assignedTo}`));
    if (uSnap.exists()) assignedToName = uSnap.data().name || '';
  }

  await updateDoc(ref, clean({
    assignedTo,
    assignedToName,
    diagnosis: data.diagnosis ?? e.diagnosis,
    servicesPerformed: data.services_performed ?? data.servicesPerformed ?? e.servicesPerformed,
    partsUsed: data.parts_used ?? data.partsUsed ?? e.partsUsed,
    notes: data.notes ?? e.notes,
    kmExit: data.km_exit ?? data.kmExit ?? e.kmExit,
    estimatedCompletion: data.estimated_completion ?? data.estimatedCompletion ?? e.estimatedCompletion,
    priority: data.priority ?? e.priority,
    updatedAt: serverTimestamp(),
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
        unitPrice: Number(i.unit_price ?? i.unitPrice) || 0,
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

export async function deletePhoto(orderId, photoId, userId, userName) {
  const photoRef = doc(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'photos', photoId);
  const snap = await getDoc(photoRef);
  if (!snap.exists()) throw new Error('Foto não encontrada');

  const { storagePath } = snap.data();
  await deletePhotoFromStorage(storagePath);
  await deleteDoc(photoRef);

  // Log
  await addDoc(collection(db, 'companies', COMPANY_ID, 'serviceOrders', orderId, 'logs'), {
    userId, userName: userName || '', action: 'foto',
    description: 'Foto removida',
    createdAt: serverTimestamp(),
  });

  return { message: 'Foto excluída com sucesso' };
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
  const [osSnap, budgetSnap, clientCount] = await Promise.all([
    getDocs(col('serviceOrders')),
    getDocs(col('budgets')),
    getCountFromServer(col('clients')),
  ]);

  const allOS = snapToList(osSnap).map(formatDoc);
  const allBudgets = snapToList(budgetSnap).map(formatDoc);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const osAberta = allOS.filter(o => ['aberta', 'em_andamento', 'aguardando_peca'].includes(o.status)).length;
  const osConcluida = allOS.filter(o => o.status === 'concluida').length;
  const osEntregue = allOS.filter(o => o.status === 'entregue' && o.deliveredAt >= thirtyDaysAgo).length;
  const orcPendente = allBudgets.filter(b => b.status === 'pendente').length;

  // Receita dos últimos 30 dias (somar itens de OS concluídas/entregues)
  const recentCompletedIds = allOS
    .filter(o => ['concluida', 'entregue'].includes(o.status) && o.completedAt >= thirtyDaysAgo)
    .map(o => o.id);

  let revenue = 0;
  for (const osId of recentCompletedIds.slice(0, 20)) {
    const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', osId, 'items'));
    revenue += snapToList(itemsSnap).reduce((sum, i) => sum + (i.total || 0), 0);
  }

  // Recentes
  const recentOrders = allOS.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 10);
  const recentBudgets = allBudgets.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 10);

  return {
    osAberta, osConcluida, osEntregue, orcPendente,
    totalClients: clientCount.data().count,
    revenue,
    recentOrders,
    recentBudgets,
  };
}

export async function getMonthlyReport(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startTs = Timestamp.fromDate(startDate);
  const endTs = Timestamp.fromDate(endDate);

  const osSnap = await getDocs(query(col('serviceOrders'), where('createdAt', '>=', startTs), where('createdAt', '<', endTs), orderBy('createdAt', 'desc')));
  const orders = snapToList(osSnap).map(formatDoc);

  const totalOS = orders.length;
  const entregues = orders.filter(o => o.status === 'entregue').length;
  const canceladas = orders.filter(o => o.status === 'cancelada').length;

  // Receita do mês
  const completedIds = orders.filter(o => ['concluida', 'entregue'].includes(o.status)).map(o => o.id);
  let revenue = 0;
  for (const osId of completedIds) {
    const itemsSnap = await getDocs(collection(db, 'companies', COMPANY_ID, 'serviceOrders', osId, 'items'));
    revenue += snapToList(itemsSnap).reduce((sum, i) => sum + (i.total || 0), 0);
  }

  // Por tipo de direção
  const steeringCounts = {};
  orders.forEach(o => {
    const st = o.vehicleSteeringType || 'outro';
    steeringCounts[st] = (steeringCounts[st] || 0) + 1;
  });
  const bySteeringType = Object.entries(steeringCounts).map(([steering_type, count]) => ({ steering_type, count }));

  return { orders, totals: { total_os: totalOS, entregues, canceladas }, revenue, bySteeringType, month, year };
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
  const startTs = Timestamp.fromDate(new Date(startDate));
  const endTs = Timestamp.fromDate(new Date(endDate));

  const osSnap = await getDocs(query(col('serviceOrders'), where('createdAt', '>=', startTs), where('createdAt', '<=', endTs)));
  const orders = snapToList(osSnap).map(formatDoc);

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
  orders.filter(o => o.assignedTo).forEach(o => {
    const name = o.assignedToName || 'Sem nome';
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
  const { setDoc } = await import('firebase/firestore');
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
  const { setDoc } = await import('firebase/firestore');
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
