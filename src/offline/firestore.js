import { requestResult, withStore } from './database';

// Only the SDK operations used by the app are implemented in this isolated demo build.
export const getFirestore = () => ({ offline: true });
export const initializeFirestore = getFirestore;
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const enableIndexedDbPersistence = async () => {};
export const enableMultiTabIndexedDbPersistence = enableIndexedDbPersistence;
export const connectFirestoreEmulator = () => {
  throw new Error('A demonstracao offline nao pode conectar a emuladores.');
};
export const serverTimestamp = () => new Date().toISOString();

export function collection(parent, ...segments) {
  return { path: [parent.path, ...segments].filter(Boolean).join('/'), kind: 'collection' };
}

export function doc(parent, ...segments) {
  const path = [parent.path, ...(segments.length ? segments : [crypto.randomUUID().replaceAll('-', '')])]
    .filter(Boolean).join('/');
  return { path, id: path.split('/').at(-1), kind: 'document' };
}

export function onSnapshot() {
  throw new Error('Listeners em tempo real nao estao disponiveis na demonstracao offline.');
}

function snapshot(reference, value) {
  return {
    id: reference.id,
    ref: reference,
    exists: () => value !== undefined,
    data: () => value === undefined ? undefined : structuredClone(value),
  };
}

async function readDocument(store, reference) {
  const record = await requestResult(store.get(reference.path));
  return snapshot(reference, record?.data);
}

export function getDoc(reference) {
  return withStore('readonly', store => readDocument(store, reference));
}

export const where = (field, operator, value) => ({ type: 'where', field, operator, value });
export const orderBy = (field, direction = 'asc') => ({ type: 'order', field, direction });
export const limit = count => ({ type: 'limit', count });
export const query = (reference, ...constraints) => ({ ...reference, constraints });

export async function getDocs(reference) {
  const records = await withStore('readonly', store => requestResult(store.getAll()));
  const prefix = `${reference.path}/`;
  let entries = records.filter(record => record.path.startsWith(prefix) && !record.path.slice(prefix.length).includes('/'));
  const constraints = reference.constraints || [];
  for (const constraint of constraints.filter(item => item.type === 'where')) {
    if (constraint.operator !== '==') {
      throw new Error(`Operador local nao implementado: ${constraint.operator}`);
    }
    entries = entries.filter(record => record.data[constraint.field] === constraint.value);
  }
  const orders = constraints.filter(item => item.type === 'order');
  for (const order of orders) {
    entries = entries.filter(record => record.data[order.field] !== undefined);
  }
  entries.sort((a, b) => {
    for (const order of orders) {
      const left = a.data[order.field];
      const right = b.data[order.field];
      const comparison = left === right ? 0 : left < right ? -1 : 1;
      if (comparison) return order.direction === 'desc' ? -comparison : comparison;
    }
    return a.path.localeCompare(b.path);
  });
  const max = constraints.find(item => item.type === 'limit');
  if (max) entries = entries.slice(0, max.count);
  const docs = entries.map(record => snapshot(doc({}, record.path), record.data));
  return { docs, empty: docs.length === 0, size: docs.length, forEach: callback => docs.forEach(callback) };
}

export async function getCountFromServer(reference) {
  const result = await getDocs(reference);
  return { data: () => ({ count: result.size }) };
}

async function writeOperations(store, operations) {
  for (const operation of operations) {
    const { reference, data, type } = operation;
    if (type === 'delete') {
      await requestResult(store.delete(reference.path));
      continue;
    }
    let previous;
    if (type === 'update' || operation.merge) {
      previous = await requestResult(store.get(reference.path));
    }
    if (type === 'update' && !previous) throw new Error('Registro local nao encontrado.');
    await requestResult(store.put({
      path: reference.path,
      data: operation.merge || type === 'update' ? { ...previous?.data, ...data } : data,
    }));
  }
}

export function setDoc(reference, data, options = {}) {
  return withStore('readwrite', store => writeOperations(store, [{ type: 'set', reference, data, merge: options.merge }]));
}

export function updateDoc(reference, data) {
  return withStore('readwrite', store => writeOperations(store, [{ type: 'update', reference, data }]));
}

export function deleteDoc(reference) {
  return withStore('readwrite', store => writeOperations(store, [{ type: 'delete', reference }]));
}

export async function addDoc(reference, data) {
  const result = doc(reference);
  await setDoc(result, data);
  return result;
}

function writer(operations) {
  return {
    set: (reference, data, options = {}) => operations.push({ type: 'set', reference, data, merge: options.merge }),
    update: (reference, data) => operations.push({ type: 'update', reference, data }),
    delete: reference => operations.push({ type: 'delete', reference }),
  };
}

export function writeBatch() {
  const operations = [];
  return {
    ...writer(operations),
    commit: () => withStore('readwrite', store => writeOperations(store, operations)),
  };
}

export function runTransaction(database, callback) {
  return withStore('readwrite', async store => {
    const operations = [];
    const result = await callback({
      ...writer(operations),
      get: reference => readDocument(store, reference),
    });
    await writeOperations(store, operations);
    return result;
  });
}
